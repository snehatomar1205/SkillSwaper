
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { authenticatedFetch } from "../services/api";
import { io } from "socket.io-client";
import DarkModeToggle from "./DarkModeToggle";

const API_URL = "http://localhost:5000";
const NOTIFICATION_URL = `${API_URL}/api/notifications`;

const Navbar = () => {
  const navigate = useNavigate();
  const { setToken } = useContext(AuthContext);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationPage, setNotificationPage] = useState(1);
  const [notificationPagination, setNotificationPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const dropdownRef = useRef(null);
  const socketRef = useRef(null);
  const notificationIdsRef = useRef(new Set());
  const socketNotificationVersionRef = useRef(0);
  const markingReadIdsRef = useRef(new Set());
  const markingAllReadRef = useRef(false);

  const linkClass = ({ isActive }) =>
    `transition ${
      isActive
        ? "text-indigo-600 dark:text-indigo-400"
        : "text-gray-700 hover:text-indigo-500 dark:text-gray-300 dark:hover:text-indigo-400"
    }`;

  const loadNotifications = async (page = 1) => {
    setLoadingNotifications(true);
    const socketVersionAtStart = socketNotificationVersionRef.current;

    try {
      const response = await authenticatedFetch(
        `${NOTIFICATION_URL}?page=${page}&limit=20`,
      );

      if (!response.ok) {
        throw new Error("Could not load notifications");
      }

      const result = await response.json();
      const items = result.data || [];

      notificationIdsRef.current = new Set([
        ...notificationIdsRef.current,
        ...items.map((item) => item._id),
      ]);

      setNotifications((previous) => {
        if (page === 1) {
          const fetchedIds = new Set(items.map((item) => item._id));
          const newerSocketItems = previous.filter(
            (item) => !fetchedIds.has(item._id),
          );

          return [...newerSocketItems, ...items];
        }

        const existingIds = new Set(previous.map((item) => item._id));

        return [
          ...previous,
          ...items.filter((item) => !existingIds.has(item._id)),
        ];
      });

      setNotificationPage(result.pagination?.page ?? page);

      setNotificationPagination(
        result.pagination ?? {
          page,
          totalPages: 1,
          total: items.length,
        },
      );

      if (socketNotificationVersionRef.current === socketVersionAtStart) {
        setUnreadCount(result.unreadCount ?? 0);
      }

      setNotificationError("");
    } catch (error) {
      console.error("Notification loading failed:", error);
      setNotificationError("Unable to load notifications.");
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Load notifications and connect the authenticated socket.
  useEffect(() => {
    let active = true;
    let socket;

    const connectSocket = async () => {
      try {
        // This request refreshes the access token if necessary.
        const response = await authenticatedFetch(`${API_URL}/api/auth/me`);

        if (!response.ok || !active) return;

        const token = localStorage.getItem("token");
        if (!token || !active) return;

        socket = io(API_URL, {
          withCredentials: true,
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on("notification", (notification) => {
          if (!notification?._id) return;

          if (notificationIdsRef.current.has(notification._id)) {
            return;
          }

          notificationIdsRef.current.add(notification._id);
          socketNotificationVersionRef.current += 1;

          setNotifications((previous) => [notification, ...previous]);

          if (!notification.readAt) {
            setUnreadCount((count) => count + 1);
          }
        });

        socket.on("connect_error", async (error) => {
          console.error(
            "Notification socket connection failed:",
            error.message,
          );

          if (!active || !error.message?.toLowerCase().includes("auth")) {
            return;
          }

          try {
            // authenticatedFetch refreshes the token after a 401.
            const refreshResponse = await authenticatedFetch(
              `${API_URL}/api/auth/me`,
            );

            if (!refreshResponse.ok || !active || !socket) return;

            const refreshedToken = localStorage.getItem("token");
            if (!refreshedToken) return;

            socket.auth = { token: refreshedToken };
            socket.connect();
          } catch (refreshError) {
            console.error(
              "Could not reconnect notification socket:",
              refreshError,
            );
          }
        });
      } catch (error) {
        console.error("Could not initialize notification socket:", error);
      }
    };

    loadNotifications();
    connectSocket();

    const handleSessionExpired = () => {
      socket?.disconnect();
      socketRef.current = null;
    };

    window.addEventListener("auth:session-expired", handleSessionExpired);

    return () => {
      active = false;
      socket?.disconnect();
      socketRef.current = null;

      window.removeEventListener(
        "auth:session-expired",
        handleSessionExpired,
      );
    };
  }, []);

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleMarkRead = async (notification) => {
    if (
      notification.readAt ||
      markingReadIdsRef.current.has(notification._id)
    ) {
      return;
    }

    markingReadIdsRef.current.add(notification._id);

    try {
      const response = await authenticatedFetch(
        `${NOTIFICATION_URL}/${notification._id}/read`,
        { method: "PATCH" },
      );

      if (!response.ok) {
        throw new Error("Could not mark notification as read");
      }

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === notification._id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );

      setUnreadCount((count) => Math.max(0, count - 1));
      setNotificationError("");
    } catch (error) {
      console.error("Mark-as-read failed:", error);
      setNotificationError("Unable to mark notification as read.");
    } finally {
      markingReadIdsRef.current.delete(notification._id);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAllReadRef.current) return;

    markingAllReadRef.current = true;

    try {
      const response = await authenticatedFetch(
        `${NOTIFICATION_URL}/read-all`,
        { method: "PATCH" },
      );

      if (!response.ok) {
        throw new Error("Could not mark all notifications as read");
      }

      const readAt = new Date().toISOString();

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, readAt })),
      );

      setUnreadCount(0);
      setNotificationError("");
    } catch (error) {
      console.error("Mark-all-read failed:", error);
      setNotificationError("Unable to mark notifications as read.");
    } finally {
      markingAllReadRef.current = false;
    }
  };

  const handleLogout = async () => {
    try {
      await authenticatedFetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setToken(null);
      navigate("/login", { replace: true });
    }
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-4 left-1/2 z-50 flex w-[92%] max-w-5xl -translate-x-1/2 items-center justify-between rounded-full border border-gray-200 bg-white/80 px-6 py-3 shadow-xl backdrop-blur-xl dark:border-gray-700 dark:bg-[#0f172a]/80"
    >
      <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
        SkillSwap
      </h2>

      <div className="flex items-center gap-5 text-sm font-medium">
        <NavLink to="/explore" className={linkClass}>
          Explore
        </NavLink>

        <NavLink to="/my-skills" className={linkClass}>
          My Skills
        </NavLink>

        <NavLink to="/requests" className={linkClass}>
          Requests
        </NavLink>

        <NavLink to="/leaderboard" className={linkClass}>
          Leaderboard
        </NavLink>

        <NavLink to="/events" className={linkClass}>
          Seasonal Events
        </NavLink>

        <NavLink to="/profile" className={linkClass}>
          Profile
        </NavLink>

        <NavLink to="/create-skill" className={linkClass}>
          Create
        </NavLink>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              const next = !showNotifications;
              setShowNotifications(next);

              if (next) loadNotifications();
            }}
            aria-label={`Notifications, ${unreadCount} unread`}
            aria-expanded={showNotifications}
            className="relative rounded-full p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
              />
            </svg>

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 z-[60] max-h-96 w-80 overflow-y-auto rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100 [scrollbar-width:thin] [scrollbar-color:#475569_#0f172a]">
              <div className="flex items-center justify-between border-b border-gray-200 p-3 dark:border-gray-700">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Notifications
                </span>

                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:cursor-not-allowed disabled:text-gray-500 dark:text-indigo-300 dark:hover:text-indigo-200 dark:disabled:text-slate-400"
                >
                  Mark all read
                </button>
              </div>

              {notificationError && (
                <p className="p-3 text-sm text-red-600 dark:text-red-400">
                  {notificationError}
                </p>
              )}

              {notifications.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification._id}
                    onClick={() => handleMarkRead(notification)}
                    className={`block w-full border-b border-gray-100 p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-slate-800 ${
                      !notification.readAt
                        ? "bg-indigo-50/70 dark:bg-indigo-950/30"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.readAt && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                      )}

                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {notification.title}
                        </p>

                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                          {notification.message}
                        </p>

                        {notification.createdAt && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}

              {notificationPage < notificationPagination.totalPages && (
                <div className="border-t border-gray-200 p-3 text-center dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => loadNotifications(notificationPage + 1)}
                    disabled={loadingNotifications}
                    className="text-sm text-indigo-600 disabled:opacity-50 dark:text-indigo-400"
                  >
                    {loadingNotifications ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <DarkModeToggle />

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm text-white transition hover:bg-indigo-700"
        >
          Logout
        </button>
      </div>
    </motion.nav>
  );
};

export default Navbar;

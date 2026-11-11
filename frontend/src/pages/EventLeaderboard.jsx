
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchEventLeaderboard } from "../services/api";

const EventLeaderboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [role, setRole] = useState("teacher");
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await fetchEventLeaderboard(id, role);

      setLeaderboard(data.leaderboard || []);
      setCurrentUser(data.currentUser || null);
    } catch (err) {
      setError(err.message || "Unable to load event leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [id, role]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button
        onClick={() => navigate("/events")}
        className="mb-6 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
      >
        ← Back to Seasonal Events
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Event Leaderboard
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          See how participants rank based on seasonal event XP.
        </p>
      </div>

      <div className="mb-6 flex gap-3">
        {["teacher", "student"].map((item) => (
          <button
            key={item}
            onClick={() => setRole(item)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold capitalize transition ${
              role === item
                ? "bg-indigo-600 text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-slate-800"
            }`}
          >
            {item} Rankings
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {currentUser && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            Your {role} ranking
          </p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
              #{currentUser.rank}
            </span>
            <span className="font-semibold text-indigo-700 dark:text-indigo-300">
              {currentUser.xp || 0} XP
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-gray-500">
          Loading leaderboard...
        </p>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-slate-900">
          <p className="font-semibold text-gray-700 dark:text-white">
            No participants yet
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Join this event to appear on the leaderboard.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-900">
          <div className="grid grid-cols-12 gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-400">
            <span className="col-span-2">Rank</span>
            <span className="col-span-5">Participant</span>
            <span className="col-span-3 text-right">XP</span>
            <span className="col-span-2 text-right">Challenges</span>
          </div>

          {leaderboard.map((user, index) => (
            <div
              key={user.userId}
              className={`grid grid-cols-12 items-center gap-2 border-b border-gray-100 px-4 py-4 last:border-0 dark:border-gray-800 ${
                String(user.userId) === String(currentUser?.userId)
                  ? "bg-indigo-50 dark:bg-indigo-950/40"
                  : ""
              }`}
            >
              <span className="col-span-2 font-bold text-gray-700 dark:text-gray-200">
                #{user.rank || index + 1}
              </span>

              <div className="col-span-5 flex min-w-0 items-center gap-3">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                    {(user.username || "U").charAt(0).toUpperCase()}
                  </div>
                )}

                <span className="truncate font-medium text-gray-800 dark:text-white">
                  {user.username || "Participant"}
                  {String(user.userId) === String(currentUser?.userId) && (
                    <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">
                      You
                    </span>
                  )}
                </span>
              </div>

              <span className="col-span-3 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                {user.xp || 0}
              </span>

              <span className="col-span-2 text-right text-sm text-gray-600 dark:text-gray-300">
                {user.completedChallenges || 0}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventLeaderboard;

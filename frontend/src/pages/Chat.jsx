import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { fetchChatMessages, sendChatMessage } from "../services/api";

const socket = io("http://localhost:5000", {
  autoConnect: false,
});

export default function Chat() {
  const currentUserId = JSON.parse(
    localStorage.getItem("user") || "null"
  )?.id;
  const { roomId } = useParams();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  const messagesEndRef = useRef(null);
  const activeRef = useRef(true);
  const sendingRef = useRef(false);
  const messagesRef = useRef([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    activeRef.current = true;
    let active = true;

    const loadMessages = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchChatMessages(roomId);

        if (active) {
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load messages");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    if (!roomId) {
      setError("Chat room ID is missing");
      setLoading(false);
      return () => {
        active = false;
        activeRef.current = false;
      };
    }

    loadMessages();

    socket.auth = {
      token: localStorage.getItem("token"),
    };

    const handleConnect = () => {
      if (active) setConnected(true);
      socket.emit("join_room", roomId);
    };

    const handleDisconnect = () => {
      if (active) setConnected(false);
    };

    const handleReceiveMessage = (message) => {
      if (!active) return;

      setMessages((previous) => {
        // Avoid duplicate messages if the same message arrives twice.
        if (message._id && previous.some((item) => item._id === message._id)) {
          return previous;
        }

        return [...previous, message];
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("receive_message", handleReceiveMessage);

    socket.connect();

    return () => {
      active = false;
      activeRef.current = false;

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("receive_message", handleReceiveMessage);

      socket.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const trimmedText = text.trim();

    if (!trimmedText || sendingRef.current) return;

    if (trimmedText.length > 2000) {
      setError("Message cannot exceed 2000 characters");
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setError("");

    try {
      // Save the message through the authenticated REST API.
      const savedMessage = await sendChatMessage(roomId, trimmedText);

      if (!activeRef.current) return;

      setMessages((previous) => {
        if (
          savedMessage._id &&
          previous.some((item) => item._id === savedMessage._id)
        ) {
          return previous;
        }

        return [...previous, savedMessage];
      });

      setText("");
    } catch (err) {
      if (activeRef.current) {
        setError(err.message || "Failed to send message");
      }
    } finally {
      sendingRef.current = false;

      if (activeRef.current) {
        setSending(false);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-900 flex justify-center px-4 py-6">
      <div className="w-full max-w-4xl flex flex-col min-h-[70vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-200">Chat</h2>

          <span
            className={`text-sm ${
              connected ? "text-green-400" : "text-yellow-400"
            }`}
          >
            {connected ? "Live" : "Connecting..."}
          </span>
        </div>

        <div
          className="flex-1 min-h-[300px] max-h-[65vh] bg-gray-800 rounded-xl p-4 overflow-y-auto space-y-3"
          aria-live="polite"
        >
          {loading && <p className="text-gray-400">Loading messages...</p>}

          {!loading && messages.length === 0 && !error && (
            <p className="text-gray-400 text-center py-8">
              No messages yet. Start the conversation.
            </p>
          )}

          {messages.map((message, index) => {
            const senderId =
              typeof message.sender === "object"
                ? message.sender?._id
                : message.sender;

            const isOwnMessage =
              currentUserId && String(senderId) === String(currentUserId);

            return (
              <div
                key={message._id || `message-${index}`}
                className={`flex ${
                  isOwnMessage ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2 ${
                    isOwnMessage
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-700 text-gray-200"
                  }`}
                >
                  <p className="text-xs font-semibold mb-1">
                    {isOwnMessage
                      ? "You"
                      : `@${message.sender?.username || "User"}`}
                  </p>

                  <p className="text-sm break-words">{message.text}</p>

                  {message.createdAt && (
                    <p className="text-xs opacity-70 text-right mt-1">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {error && (
          <p role="alert" className="text-red-400 text-sm mt-3">
            {error}
          </p>
        )}

        <div className="flex gap-2 mt-4">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            maxLength={2000}
            disabled={sending}
            className="flex-1 min-w-0 px-4 py-2 rounded-lg bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
          />

          <button
            onClick={sendMessage}
            disabled={sending || !text.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

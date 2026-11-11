
import React, { useEffect, useState } from "react";
import {
  getComments,
  postComment,
  authenticatedFetch,
} from "../services/api";

const API_URL = "http://localhost:5000/api/comments";

const CommentSection = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await getComments(postId);
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.comments)
        ? res.data.comments
        : Array.isArray(res?.comments)
        ? res.comments
        : [];

      setComments(list);
    } catch (err) {
      console.error("Failed to load comments:", err);
      setError("Unable to load comments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [postId]);

  // Get the logged-in user's ID to display controls for their comments.
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await authenticatedFetch(
          "http://localhost:5000/api/auth/me"
        );
        if (!response.ok) return;

        const result = await response.json();
        const user = result?.user || result?.data?.user || result?.data || result;
        setCurrentUserId(
          String(user?._id || user?.id || user?.userId || "")
        );
      } catch (err) {
        console.error("Unable to identify current user:", err);
      }
    };

    loadCurrentUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      await postComment(postId, text.trim());
      setText("");
      await loadComments();
    } catch (err) {
      console.error("Failed to post comment:", err);
      alert(err.message || "Unable to post comment.");
    }
  };

  const handleEdit = async (commentId) => {
    if (!editText.trim()) return;

    try {
      setBusyId(commentId);

      const response = await authenticatedFetch(
        `${API_URL}/edit/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: editText.trim() }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.msg || result?.message || "Unable to edit comment.");
      }

      setEditingId(null);
      setEditText("");
      await loadComments();
    } catch (err) {
      console.error("Failed to edit comment:", err);
      alert(err.message || "Unable to edit comment.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;

    try {
      setBusyId(commentId);

      const response = await authenticatedFetch(
        `${API_URL}/delete/${commentId}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.msg || result?.message || "Unable to delete comment.");
      }

      setComments((previous) =>
        previous.filter((comment) => comment._id !== commentId)
      );
    } catch (err) {
      console.error("Failed to delete comment:", err);
      alert(err.message || "Unable to delete comment.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-8 bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
        Comments
      </h3>

      <form onSubmit={handleSubmit} className="flex items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Write a comment..."
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          className="flex-grow px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-white"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
        >
          Post
        </button>
      </form>

      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading comments...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : comments.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No comments yet.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => {
            const authorId = String(
              comment.userId?._id || comment.userId?.id || comment.userId || ""
            );
            const isOwner =
              currentUserId !== "" && authorId === currentUserId;

            return (
              <li key={comment._id} className="flex items-start gap-4">
                <img
                  src={comment.userId?.avatarUrl || "/default-avatar.png"}
                  alt="User avatar"
                  className="w-10 h-10 rounded-full border border-gray-400 object-cover"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">
                    @{comment.userId?.username || "User"}
                  </p>

                  {editingId === comment._id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editText}
                        maxLength={2000}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!editText.trim() || busyId === comment._id}
                          onClick={() => handleEdit(comment._id)}
                          className="px-3 py-1 rounded bg-indigo-600 text-white disabled:opacity-50"
                        >
                          {busyId === comment._id ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === comment._id}
                          onClick={() => {
                            setEditingId(null);
                            setEditText("");
                          }}
                          className="px-3 py-1 rounded border dark:border-gray-600 dark:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                      {comment.text}
                    </p>
                  )}

                  {isOwner && editingId !== comment._id && (
                    <div className="flex gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(comment._id);
                          setEditText(comment.text || "");
                        }}
                        className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busyId === comment._id}
                        onClick={() => handleDelete(comment._id)}
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                      >
                        {busyId === comment._id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CommentSection;

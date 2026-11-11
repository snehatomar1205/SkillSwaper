import React, { useEffect, useState } from "react";
import {
  fetchMyRequests,
  updateRequestStatus,
  confirmRequestCompletion,
  cancelRequest,
} from "../services/api";
import RequestCard from "../components/RequestCard";
import Tabs from "../components/Tabs";
import { motion } from "framer-motion";

const getCurrentUserId = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;

    return JSON.parse(atob(token.split(".")[1])).sub;
  } catch {
    return null;
  }
};

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [view, setView] = useState("Received");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentUserId = getCurrentUserId();
  const handleCancel = async (id) => {
    setError("");

    try {
      await cancelRequest(id);
      await fetchData();
    } catch (err) {
      setError(err.message || "Failed to cancel request.");
    }
  };
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchMyRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to fetch requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdate = async (id, status) => {
    setError("");

    try {
      await updateRequestStatus(id, status);
      await fetchData();
    } catch (err) {
      setError(err.message || "Failed to update request.");
    }
  };
  const handleRefresh = async () => {
    await fetchData();
  };
  const filtered = requests.filter((r) => {
    if (!r.fromUser || !r.toUser || !currentUserId) return false;
    return view === "Received"
      ? r.toUser._id === currentUserId
      : r.fromUser._id === currentUserId;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen px-6 py-10 bg-gray-50 dark:bg-gray-900"
    >
      <h2 className="text-3xl font-bold mb-6 text-center text-indigo-600 dark:text-indigo-300">
        My Requests
      </h2>

      <div className="mb-8">
        <Tabs activeTab={view} onChange={setView} tabs={["Received", "Sent"]} />
      </div>

      {error && (
        <p className="mb-4 text-center text-red-500 font-medium">{error}</p>
      )}

      {loading ? (
        <p className="text-center text-gray-500">Loading requests...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-600">
          No {view.toLowerCase()} requests.
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <RequestCard
              key={req._id}
              request={req}
              isReceiver={view === "Received"}
              onUpdate={handleUpdate}
              onRefresh={handleRefresh}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Requests;

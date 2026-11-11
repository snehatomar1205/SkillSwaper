import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchSingleSkill,
  requestSkillSwap,
  fetchMyProfile,
} from "../services/api";
import CommentSection from "../components/CommentSection";
import { motion } from "framer-motion";

const extractMinHours = (description = "") => {
  const match = description.match(/min\s*(\d+)/i);
  return match ? Number(match[1]) : null;
};

const SkillDetails = () => {
  const { id } = useParams();

  const [skill, setSkill] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [skillData, meData] = await Promise.all([
          fetchSingleSkill(id),
          fetchMyProfile(),
        ]);
        console.log("Profile response:", meData);
        setSkill(skillData);
        setMe(meData.user || meData);
      } catch {
        setError("Failed to load skill.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleRequest = async () => {
    setError("");
    setSuccess("");

    if (!me) {
      setError("Please login to request a skill.");
      return;
    }

    if (skill?.userId?._id === me._id) {
      setError("You cannot request your own skill.");
      return;
    }

    if (skill?.hasRequested) {
      setError("You have already requested this skill.");
      return;
    }

    const minHours = extractMinHours(skill?.description);
    if (minHours && hours < minHours) {
      setError(`Minimum ${minHours} hours required.`);
      return;
    }

    if ((me.timeCredits || 0) < hours) {
      setError("Not enough time credits.");
      return;
    }

    try {
      setSending(true);
      await requestSkillSwap(id, hours);

      setSuccess("Request sent successfully!");
      setSkill((prev) => ({ ...prev, hasRequested: true }));
      setMe((prev) => ({
        ...prev,
        timeCredits: prev.timeCredits - hours,
      }));
    } catch (err) {
      setError(err.message || "Failed to send request.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading skill...</p>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Skill not found</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen px-4 py-10 bg-gray-50 dark:bg-gray-900 flex justify-center"
    >
      <div className="w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-indigo-600 dark:text-indigo-300 mb-4">
          {skill.skillName}
        </h2>

        {skill.imageUrl && (
          <img
            src={
              skill.imageUrl.startsWith("http")
                ? skill.imageUrl
                : `http://localhost:5000/${skill.imageUrl}`
            }
            alt={skill.skillName}
            className="w-full h-64 object-cover rounded-xl mb-4"
          />
        )}

        <p className="mb-2 dark:text-indigo-100">
          <strong>Description:</strong>{" "}
          {skill.description || "No description"}
        </p>

        {extractMinHours(skill.description) && (
          <p className="mb-2 text-sm text-indigo-500">
            Minimum time: {extractMinHours(skill.description)} hours
          </p>
        )}

        <p className="mb-6 dark:text-indigo-100">
          <strong>Posted by:</strong>{" "}
          @{skill.userId?.username || "Unknown"}
        </p>

        {/* Request Box */}
        <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 shadow">
          <h4 className="text-lg font-semibold mb-2 text-indigo-600">
            Request this skill
          </h4>

          {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
          {success && <p className="text-sm text-green-500 mb-2">{success}</p>}

          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              disabled={sending || skill.hasRequested}
              className="w-24 px-3 py-2 border rounded-lg dark:text-indigo-100"
            />
            <button
              onClick={handleRequest}
              disabled={sending || skill.hasRequested}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              {skill.hasRequested ? "Already Requested" : "Send Request"}
            </button>
          </div>

          {me && (
            <p className="text-xs mt-2 text-gray-500">
              Available credits: {me.timeCredits}
            </p>
          )}
        </div>

        <hr className="my-6" />

        <CommentSection postId={skill._id} />
      </div>
    </motion.div>
  );
};

export default SkillDetails;

import React, { useState } from "react";
import { createSkillPost } from "../services/api";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const CreateSkill = () => {
  const [skillName, setSkillName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!image) {
      setError("Please upload an image.");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("skillName", skillName);
    formData.append("description", description);
    formData.append("tags", tags);
    formData.append("image", image);

    try {
      await createSkillPost(formData);
      navigate("/my-skills");
    } catch (err) {
      setError(err?.message || "Failed to create skill. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen px-4 py-10 flex justify-center items-start bg-gray-50 dark:bg-gray-900"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl space-y-4 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-2xl font-bold text-center text-indigo-600 dark:text-indigo-300">
          Post a New Skill
        </h2>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Skill name"
          value={skillName}
          onChange={(e) => setSkillName(e.target.value)}
          required
          disabled={loading}
          className="input-style"
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
          disabled={loading}
          className="input-style resize-none"
        />

        <input
          type="text"
          placeholder="Tags (comma separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          disabled={loading}
          className="input-style"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
          required
          disabled={loading}
          className="block w-full text-sm text-gray-700 dark:text-gray-300
            file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
            file:text-sm file:font-semibold file:bg-indigo-100
            file:text-indigo-700 hover:file:bg-indigo-200"
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200
            ${
              loading
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Posting...
            </span>
          ) : (
            "Submit Skill"
          )}
        </button>
      </form>
    </motion.div>
  );
};

export default CreateSkill;

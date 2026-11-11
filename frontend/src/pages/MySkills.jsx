import React, { useCallback, useEffect, useState } from "react";
import {
  fetchMySkills,
  updateSkill,
  deleteSkill,
} from "../services/api";
import MySkillCard from "../components/MySkillCard";
import { motion, AnimatePresence } from "framer-motion";

const MySkills = () => {
  const [skills, setSkills] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const [editingSkill, setEditingSkill] = useState(null);
  const [editForm, setEditForm] = useState({
    skillName: "",
    description: "",
    tags: "",
  });
  const [editImage, setEditImage] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const handleEditClick = (skill) => {
    setEditingSkill(skill);
    setEditForm({
      skillName: skill.skillName || "",
      description: skill.description || "",
      tags: (skill.tags || []).join(", "),
    });
    setEditImage(null);
    setError("");
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editingSkill) return;

    setSavingEdit(true);
    setError("");

    const formData = new FormData();
    formData.append("skillName", editForm.skillName);
    formData.append("description", editForm.description);
    formData.append("tags", editForm.tags);

    if (editImage) {
      formData.append("image", editImage);
    }

    try {
      await updateSkill(editingSkill._id, formData);
      setEditingSkill(null);
      setEditImage(null);
      await loadSkills();
    } catch (err) {
      setError(err.message || "Failed to update skill.");
    } finally {
      setSavingEdit(false);
    }
  };
  const loadSkills = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await fetchMySkills({ page, limit: 12 });

      setSkills(Array.isArray(result.data) ? result.data : []);
      setPagination(
        result.pagination || {
          page: 1,
          limit: 12,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (err) {
      setError(err.message || "Failed to load skills.");
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setError("");
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    setError("");

    try {
      await deleteSkill(deleteId);
      setDeleteId(null);

      // If the last item on a page was deleted, move back one page.
      if (skills.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadSkills();
      }
    } catch (err) {
      setError(err.message || "Failed to delete skill.");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = pagination.totalPages || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen px-6 py-10 bg-gray-50 dark:bg-gray-900"
    >
      <h2 className="text-3xl font-bold mb-6 text-indigo-600 dark:text-indigo-300 text-center">
        My Skills
      </h2>

      {error && (
        <p className="text-center mb-4 text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-center text-gray-600 dark:text-gray-300">
          Loading your skills...
        </p>
      ) : skills.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-300">
          You haven’t posted any skills yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {skills.map((skill) => (
              <MySkillCard
                key={skill._id}
                skill={skill}
                onDelete={() => handleDeleteClick(skill._id)}
                onEdit={handleEditClick}
              />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-gray-700 dark:text-gray-300">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border disabled:opacity-40 dark:border-gray-700"
            >
              Previous
            </button>

            <span>
              Page {page} of {totalPages} · {pagination.total} skills
            </span>

            <button
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg border disabled:opacity-40 dark:border-gray-700"
            >
              Next
            </button>
          </div>
        </>
      )}

      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-sm space-y-4 shadow-xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Delete Skill?
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-300">
                This action cannot be undone. Are you sure you want to delete
                this skill?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm rounded-lg border dark:border-gray-600"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className={`px-4 py-2 text-sm rounded-lg text-white ${
                    deleting
                      ? "bg-red-400 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.form
              onSubmit={handleEditSubmit}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl space-y-4"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Edit Skill
              </h3>

              <input
                type="text"
                required
                maxLength={100}
                value={editForm.skillName}
                onChange={(e) =>
                  setEditForm({ ...editForm, skillName: e.target.value })
                }
                placeholder="Skill name"
                className="w-full p-3 rounded-lg border dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />

              <textarea
                required
                maxLength={5000}
                rows={4}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="Description"
                className="w-full p-3 rounded-lg border dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />

              <input
                type="text"
                value={editForm.tags}
                onChange={(e) =>
                  setEditForm({ ...editForm, tags: e.target.value })
                }
                placeholder="Tags (comma separated)"
                className="w-full p-3 rounded-lg border dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />

              <div>
                <label className="block mb-2 text-sm text-gray-700 dark:text-gray-300">
                  Replace image (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditImage(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 dark:text-gray-300"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditingSkill(null)}
                  className="px-4 py-2 rounded-lg border dark:border-gray-600 dark:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
      
    </motion.div>
  );
};

export default MySkills;

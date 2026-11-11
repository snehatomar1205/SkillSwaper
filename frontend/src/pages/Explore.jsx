
import React, { useEffect, useState } from "react";
import { fetchSkills } from "../services/api";
import SkillCard from "../components/SkillCard";
import { motion } from "framer-motion";

const Explore = () => {
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadSkills = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await fetchSkills({
          search,
          tag,
          sort,
          page,
          limit: 12,
        });

        if (cancelled) return;

        setSkills(Array.isArray(result.data) ? result.data : []);
        setPagination(
          result.pagination || {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
          }
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load skills.");
          setSkills([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSkills();

    return () => {
      cancelled = true;
    };
  }, [search, tag, sort, page]);

  const totalPages = pagination.totalPages || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen px-6 py-10 bg-gray-50 dark:bg-gray-900"
    >
      <h2 className="text-3xl font-bold mb-6 text-center text-indigo-600 dark:text-indigo-300">
        Explore Skills
      </h2>

      <div className="max-w-5xl mx-auto mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search skills..."
          aria-label="Search skills"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3"
        />

        <input
          type="text"
          value={tag}
          onChange={(e) => {
            setTag(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by tag..."
          aria-label="Filter by tag"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3"
        />

        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          aria-label="Sort skills"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-3"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Skill name (A–Z)</option>
        </select>
      </div>

      {loading ? (
        <p className="text-center text-gray-600 dark:text-gray-300">
          Loading skills...
        </p>
      ) : error ? (
        <p className="text-center text-red-600 dark:text-red-400">{error}</p>
      ) : skills.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-300">
          No skills found. Try changing your search or tag.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {skills.map((skill) => (
              <SkillCard key={skill._id} skill={skill} />
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
                setPage((current) =>
                  Math.min(totalPages, current + 1)
                )
              }
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg border disabled:opacity-40 dark:border-gray-700"
            >
              Next
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default Explore;

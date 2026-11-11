
import React from "react";
import { motion } from "framer-motion";

const MySkillCard = ({ skill, onDelete, onEdit }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 180 }}
      className="bg-white dark:bg-gray-900 border border-gray-200 shadow-lg rounded-2xl overflow-hidden p-4 flex flex-col gap-3 transition-all"
    >
      {skill.imageUrl && (
        <img
          src={skill.imageUrl}
          alt={skill.skillName}
          className="w-full h-40 object-cover rounded-xl hover:scale-105 transition-transform duration-300"
        />
      )}

      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
        {skill.skillName}
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        {skill.description}
      </p>

      {skill.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skill.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex gap-3">
        <button
          onClick={() => onEdit(skill)}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 transition-colors"
        >
          Edit
        </button>

        <button
          onClick={() => onDelete(skill._id)}
          className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </motion.div>
  );
};

export default MySkillCard;

import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const SkillCard = ({ skill }) => {
  return (
    <Link to={`/skill/${skill._id}`}>
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden p-4 border border-gray-200 hover:shadow-2xl transition-all duration-300"
      >
        <div className="w-full h-48 overflow-hidden rounded-xl mb-4">
          <img
            src={
              skill.imageUrl.startsWith("http")
                ? skill.imageUrl
                : `http://localhost:5000/${skill.imageUrl}`
            }
            alt={skill.skillName}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>

        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
          {skill.skillName}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-3">
          {skill.description.substring(0, 100)}...
        </p>

        <div className="flex items-center gap-2 mt-auto">
          <img
            src={
              skill.userId.avatarUrl.startsWith("http")
                ? skill.userId.avatarUrl
                : `http://localhost:5000/${skill.userId.avatarUrl}`
            }
            alt="user"
            className="w-8 h-8 rounded-full border border-gray-300 object-cover"
          />
          <span className="text-sm text-gray-700 dark:text-gray-200">
            @{skill.userId.username}
          </span>
        </div>
      </motion.div>
    </Link>
  );
};

export default SkillCard;

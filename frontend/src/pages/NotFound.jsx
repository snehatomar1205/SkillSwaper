import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

const NotFound = () => {
  return (
    <motion.div
      className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900 text-center px-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <AlertTriangle className="w-16 h-16 text-red-500 dark:text-red-400 mb-4 animate-pulse" />

      <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
        404 - Page Not Found
      </h1>

      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Oops! The page you're looking for doesn't exist.
      </p>

      <Link
        to="/explore"
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
      >
        Go Back to Explore
      </Link>
    </motion.div>
  );
};

export default NotFound;

import React from "react";
import { motion } from "framer-motion";

const Tabs = ({ activeTab, onChange, tabs }) => {
  return (
    <div className="flex space-x-2 p-2 bg-white dark:bg-gray-900 rounded-xl shadow-md">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className="relative px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-0 bg-indigo-100 dark:bg-indigo-800 rounded-md -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
              />
            )}
            <span className={isActive ? "text-indigo-600 dark:text-indigo-200 font-semibold" : ""}>
              {tab}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;

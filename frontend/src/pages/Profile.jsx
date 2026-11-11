import React, { useEffect, useState, useContext } from "react";
import { fetchMyProfile } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { motion } from "framer-motion";

const Profile = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchMyProfile();
        setProfile(data.user);
      } catch (err) {
        console.error("Profile fetch error", err);
      }
    };
    loadProfile();
  }, []);

  if (!profile) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-10"
    >
      <h2 className="text-3xl font-bold mb-6 text-indigo-600 dark:text-indigo-300">
        My Profile
      </h2>

      <div className="w-full max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl p-6 text-center space-y-4">
        <img
          src={profile.avatarUrl}
          alt="avatar"
          className="w-28 h-28 rounded-full object-cover mx-auto border-4 border-indigo-200 dark:border-indigo-700"
        />
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">@{profile.username}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>Email:</strong> {profile.email}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>Bio:</strong> {profile.bio}
        </p>
        <p className="text-sm text-indigo-600 dark:text-indigo-300 font-semibold">
          ⏱ Time Credits: {profile.timeCredits}
        </p>
      </div>
    </motion.div>
  );
};

export default Profile;

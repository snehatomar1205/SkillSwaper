import React, { useContext, useState } from "react";
import { registerUser } from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AuthContext } from "../context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { setToken } = useContext(AuthContext);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    bio: "",
    avatar: null,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, files, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "file" ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("username", form.username);
    formData.append("email", form.email);
    formData.append("password", form.password);
    formData.append("bio", form.bio);
    formData.append("avatar", form.avatar);

    try {
      const res = await registerUser(formData);

      if (!res.accessToken) {
        throw new Error(
          "Registration succeeded but no access token was returned.",
        );
      }

      setToken(res.accessToken);
      localStorage.setItem("user", JSON.stringify(res.user));

      navigate("/explore");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl space-y-4 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-2xl font-bold text-center text-indigo-600 dark:text-indigo-300">
          Register on SkillSwap
        </h2>
        {error && (
          <div className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <input
          type="text"
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          required
          disabled={loading}
          className="input-style"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          disabled={loading}
          className="input-style"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
          disabled={loading}
          className="input-style"
        />
        <textarea
          name="bio"
          placeholder="Your bio"
          value={form.bio}
          onChange={handleChange}
          required
          rows={3}
          disabled={loading}
          className="input-style resize-none"
        />
        <input
          type="file"
          name="avatar"
          accept="image/*"
          onChange={handleChange}
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
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="text-center text-sm text-gray-600 dark:text-gray-300">
          Already have an account?{" "}
          <Link
            to="/"
            className="text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Login
          </Link>
        </p>
      </form>
    </motion.div>
  );
};

export default Register;

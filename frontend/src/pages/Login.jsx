import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AuthContext } from "../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { setToken } = useContext(AuthContext);

  const handleLogin = async (e) => {
  e.preventDefault();

  setLoading(true);
  setError("");

  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.msg || "Login failed");
    }

    setToken(data.accessToken);
    localStorage.setItem("user", JSON.stringify(data.user));

    navigate("/explore");
  } catch (err) {
    setError(err.message || "Invalid email or password");
  } finally {
    setLoading(false);
  }
};

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4"
    >
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl space-y-4 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-2xl font-bold text-center text-indigo-600 dark:text-indigo-300">
          Login to SkillSwap
        </h2>
        {error && (
          <div className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="input-style"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          className="input-style"
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
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-center text-sm text-gray-600 dark:text-gray-300">
          Don’t have an account?{" "}
          <Link
            to="/register"
            className="text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Register
          </Link>
        </p>
      </form>
    </motion.div>
  );
};

export default Login;

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminLogin } from "../services/adminApi";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await adminLogin(email.trim(), password);
      sessionStorage.setItem("adminToken", data.accessToken);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow-lg"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            SkillSwap Admin
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage exchange disputes.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="admin-email" className="mb-1 block text-sm font-medium">
            Admin email
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Admin Sign In"}
        </button>

        <p className="text-center text-sm text-gray-600">
          <Link to="/login" className="text-indigo-600 hover:underline">
            Return to user login
          </Link>
        </p>
      </form>
    </div>
  );
}

export default AdminLogin;

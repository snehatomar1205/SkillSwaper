import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

const API_BASE = "http://localhost:5000/api";

function AdminRoute({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const token = sessionStorage.getItem("adminToken");
    const controller = new AbortController();

    if (!token) {
      setStatus("unauthorized");
      return () => controller.abort();
    }

    const verifyAdmin = async () => {
      try {
        const response = await fetch(`${API_BASE}/admin/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          sessionStorage.removeItem("adminToken");
          setStatus("unauthorized");
          return;
        }

        setStatus("authorized");
      } catch (error) {
        if (error.name !== "AbortError") {
          setStatus("error");
        }
      }
    };

    verifyAdmin();

    return () => controller.abort();
  }, []);

  if (status === "checking") {
    return <p className="p-8 text-center">Verifying admin access...</p>;
  }

  if (status === "unauthorized") {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (status === "error") {
    return (
      <div className="p-8 text-center">
        <p>Unable to verify admin access. Check that the backend is running.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return children;
}

export default AdminRoute;


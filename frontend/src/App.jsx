
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useContext } from "react";

import { AuthContext } from "./context/AuthContext";

import Landing from "./pages/Landing";
import Explore from "./pages/Explore";
import Requests from "./pages/Requests";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MySkills from "./pages/MySkills";
import Profile from "./pages/Profile";
import CreateSkill from "./pages/CreateSkill";
import SkillDetails from "./pages/SkillDetails";
import Chat from "./pages/Chat";
import Leaderboard from "./pages/Leaderboard";
import SeasonalEvents from "./pages/SeasonalEvents";
import EventLeaderboard from "./pages/EventLeaderboard";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminEvents from "./pages/AdminEvents";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Navbar from "./components/Navbar";
import NotFound from "./pages/NotFound";

function AppContent() {
  const { token } = useContext(AuthContext);
  const location = useLocation();

  const isLandingPage = location.pathname === "/";
  const isAdminPage = location.pathname.startsWith("/admin");

  const showNavbar = token && !isAdminPage && !isLandingPage;
  const addTopPadding = token && !isAdminPage && !isLandingPage;

  return (
    <>
      {showNavbar && <Navbar />}

      <div className={addTopPadding ? "pt-20" : ""}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          <Route
            path="/admin/events"
            element={
              <AdminRoute>
                <AdminEvents />
              </AdminRoute>
            }
          />

          {/* Protected User Routes */}
          <Route
            path="/explore"
            element={
              <ProtectedRoute>
                <Explore />
              </ProtectedRoute>
            }
          />

          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <Requests />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-skills"
            element={
              <ProtectedRoute>
                <MySkills />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/create-skill"
            element={
              <ProtectedRoute>
                <CreateSkill />
              </ProtectedRoute>
            }
          />

          <Route
            path="/skill/:id"
            element={
              <ProtectedRoute>
                <SkillDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chat/:roomId"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <SeasonalEvents />
              </ProtectedRoute>
            }
          />

          <Route
            path="/events/:id/leaderboard"
            element={
              <ProtectedRoute>
                <EventLeaderboard />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

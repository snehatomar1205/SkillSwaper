import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchAdminEvents,
  createAdminEvent,
  updateAdminEvent,
  publishAdminEvent,
  pauseAdminEvent,
  resumeAdminEvent,
  cancelAdminEvent,
  fetchAdminEventAnalytics,
} from "../services/adminApi";

const emptyChallenge = () => ({
  title: "",
  description: "",
  conditionType: "completed_exchanges",
  target: 1,
  skillCategory: "",
  eligibleRole: "both",
  rewardXP: 100,
  rewardAchievementId: "",
});

const emptyForm = () => ({
  title: "",
  description: "",
  bannerUrl: "",
  startDate: "",
  endDate: "",
  eligibleRoles: ["teacher", "student"],
  challenges: [emptyChallenge()],
});

const CONDITION_TYPES = [
  ["completed_exchanges", "Completed exchanges"],
  ["teaching_sessions", "Teaching sessions"],
  ["learning_sessions", "Learning sessions"],
  ["xp_earned", "XP earned"],
  ["skill_category_sessions", "Skill category sessions"],
];

const AdminEvents = () => {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("adminToken");

  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsEventId, setAnalyticsEventId] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const loadEvents = useCallback(async () => {
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await fetchAdminEvents(token);
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [navigate, token]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateChallenge = (index, field, value) => {
    setForm((current) => ({
      ...current,
      challenges: current.challenges.map((challenge, i) =>
        i === index ? { ...challenge, [field]: value } : challenge,
      ),
    }));
  };

  const addChallenge = () => {
    setForm((current) => ({
      ...current,
      challenges: [...current.challenges, emptyChallenge()],
    }));
  };

  const removeChallenge = (index) => {
    setForm((current) => ({
      ...current,
      challenges: current.challenges.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const handleEdit = (event) => {
    if (!["draft", "scheduled"].includes(event.status)) {
      setError("Only draft and scheduled events can be edited.");
      return;
    }

    setEditingId(event._id);

    setForm({
      title: event.title || "",
      description: event.description || "",
      bannerUrl: event.bannerUrl || "",
      startDate: event.startDate
        ? new Date(event.startDate).toISOString().slice(0, 16)
        : "",
      endDate: event.endDate
        ? new Date(event.endDate).toISOString().slice(0, 16)
        : "",
      eligibleRoles: event.eligibleRoles || ["teacher", "student"],
      challenges: (event.challenges || []).map((challenge) => ({
        title: challenge.title || "",
        description: challenge.description || "",
        conditionType: challenge.conditionType,
        target: challenge.target,
        skillCategory: challenge.skillCategory || "",
        eligibleRole: challenge.eligibleRole || "both",
        rewardXP: challenge.rewardXP || 0,
        rewardAchievementId: challenge.rewardAchievementId || "",
      })),
    });

    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError("Choose both event dates.");
      return;
    }

    if (new Date(form.startDate) >= new Date(form.endDate)) {
      setError("End date must be after start date.");
      return;
    }

    if (form.eligibleRoles.length === 0) {
      setError("Select at least one eligible role.");
      return;
    }

    if (form.challenges.length === 0) {
      setError("Add at least one challenge.");
      return;
    }

    for (const challenge of form.challenges) {
      if (!challenge.title.trim()) {
        setError("Every challenge needs a title.");
        return;
      }

      if (Number(challenge.target) < 1) {
        setError("Challenge targets must be at least 1.");
        return;
      }

      if (
        challenge.conditionType === "skill_category_sessions" &&
        !challenge.skillCategory.trim()
      ) {
        setError("Enter a skill category for category-based challenges.");
        return;
      }

      if (Number(challenge.rewardXP) < 0) {
        setError("Challenge rewards cannot be negative.");
        return;
      }
    }

    const payload = {
      ...form,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      challenges: form.challenges.map((challenge) => ({
        ...challenge,
        target: Number(challenge.target),
        rewardXP: Number(challenge.rewardXP),
        skillCategory: challenge.skillCategory.trim() || null,
        rewardAchievementId: challenge.rewardAchievementId.trim() || null,
      })),
    };

    try {
      setSaving(true);

      if (editingId) {
        await updateAdminEvent(token, editingId, payload);
        setMessage("Event updated successfully.");
      } else {
        await createAdminEvent(token, payload);
        setMessage("Event created successfully.");
      }

      resetForm();
      await loadEvents();
    } catch (err) {
      setError(err.message || "Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (eventId, action) => {
    const actionFunctions = {
      publish: publishAdminEvent,
      pause: pauseAdminEvent,
      resume: resumeAdminEvent,
      cancel: cancelAdminEvent,
    };

    const actionFunction = actionFunctions[action];

    if (!actionFunction) return;

    if (
      action === "cancel" &&
      !window.confirm("Are you sure you want to cancel this event?")
    ) {
      return;
    }

    try {
      setActionId(eventId);
      setError("");
      setMessage("");

      await actionFunction(token, eventId);

      setMessage(`Event ${action} successful.`);
      await loadEvents();
    } catch (err) {
      setError(err.message || `Failed to ${action} event.`);
    } finally {
      setActionId(null);
    }
  };

  const handleViewAnalytics = async (eventId) => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsEventId(eventId);
      setAnalytics(null);
      setError("");

      const data = await fetchAdminEventAnalytics(token, eventId);

      setAnalytics(data.analytics || data);
    } catch (err) {
      setError(err.message || "Failed to load event analytics.");
      setAnalyticsEventId(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminToken");
    navigate("/admin/login", { replace: true });
  };

  const toggleRole = (role) => {
    setForm((current) => ({
      ...current,
      eligibleRoles: current.eligibleRoles.includes(role)
        ? current.eligibleRoles.filter((item) => item !== role)
        : [...current.eligibleRoles, role],
    }));
  };

  const formatDate = (date) => new Date(date).toLocaleString();

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none";

  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  const buttonClass =
    "rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50";

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Seasonal Event Management
            </h1>
            <p className="mt-1 text-gray-600">
              Create events, configure challenges, and manage rewards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate("/admin/dashboard")}
              className={`rounded-lg border px-4 py-2 font-medium transition ${
                window.location.pathname === "/admin/dashboard"
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
              }`}
            >
              Dispute Management
            </button>

            <button
              onClick={() => navigate("/admin/events")}
              className={`rounded-lg border px-4 py-2 font-medium transition ${
                window.location.pathname === "/admin/events"
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
              }`}
            >
              Seasonal Events
            </button>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-900 hover:bg-gray-50"
            >
              Admin Logout
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 p-3 text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-4 rounded-lg bg-green-50 p-3 text-green-700"
          >
            {message}
          </div>
        )}

        {/* Event Form */}
        <section className="mb-10 rounded-xl bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900">
              {editingId ? "Edit Event" : "Create New Event"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className={`${buttonClass} border border-gray-300 text-gray-700 hover:bg-gray-50`}
              >
                Cancel Editing
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelClass}>Event Title</label>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                maxLength={150}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className={inputClass}
                rows={3}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                maxLength={2000}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Banner Image URL (optional)</label>
              <input
                className={inputClass}
                type="url"
                value={form.bannerUrl}
                onChange={(e) => updateField("bannerUrl", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Start Date</label>
                <input
                  className={inputClass}
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>End Date</label>
                <input
                  className={inputClass}
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <p className={labelClass}>Eligible Roles</p>

              <div className="flex flex-wrap gap-5">
                {["teacher", "student"].map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 capitalize"
                  >
                    <input
                      type="checkbox"
                      checked={form.eligibleRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>

            {/* Challenges */}
            <div className="border-t border-gray-200 pt-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-gray-900">
                  Event Challenges
                </h3>

                <button
                  type="button"
                  onClick={addChallenge}
                  className={`${buttonClass} bg-indigo-100 text-indigo-700 hover:bg-indigo-200`}
                >
                  + Add Challenge
                </button>
              </div>

              <div className="space-y-5">
                {form.challenges.map((challenge, index) => (
                  <div
                    key={index}
                    className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-800">
                        Challenge {index + 1}
                      </h4>

                      {form.challenges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeChallenge(index)}
                          className="text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>Challenge Title</label>
                      <input
                        className={inputClass}
                        value={challenge.title}
                        onChange={(e) =>
                          updateChallenge(index, "title", e.target.value)
                        }
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Description</label>
                      <textarea
                        className={inputClass}
                        rows={2}
                        value={challenge.description}
                        onChange={(e) =>
                          updateChallenge(index, "description", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Condition</label>
                        <select
                          className={inputClass}
                          value={challenge.conditionType}
                          onChange={(e) =>
                            updateChallenge(
                              index,
                              "conditionType",
                              e.target.value,
                            )
                          }
                        >
                          {CONDITION_TYPES.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Target</label>
                        <input
                          className={inputClass}
                          type="number"
                          min="1"
                          value={challenge.target}
                          onChange={(e) =>
                            updateChallenge(index, "target", e.target.value)
                          }
                          required
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Eligible Role</label>
                        <select
                          className={inputClass}
                          value={challenge.eligibleRole}
                          onChange={(e) =>
                            updateChallenge(
                              index,
                              "eligibleRole",
                              e.target.value,
                            )
                          }
                        >
                          <option value="both">Both</option>
                          <option value="teacher">Teacher</option>
                          <option value="student">Student</option>
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Reward XP</label>
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          value={challenge.rewardXP}
                          onChange={(e) =>
                            updateChallenge(index, "rewardXP", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    {challenge.conditionType === "skill_category_sessions" && (
                      <div>
                        <label className={labelClass}>
                          Skill Category / Tag
                        </label>
                        <input
                          className={inputClass}
                          value={challenge.skillCategory}
                          onChange={(e) =>
                            updateChallenge(
                              index,
                              "skillCategory",
                              e.target.value,
                            )
                          }
                          placeholder="Example: JavaScript"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className={labelClass}>
                        Achievement ID (optional)
                      </label>
                      <input
                        className={inputClass}
                        value={challenge.rewardAchievementId}
                        onChange={(e) =>
                          updateChallenge(
                            index,
                            "rewardAchievementId",
                            e.target.value,
                          )
                        }
                        placeholder="Example: event_champion"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Event"
                  : "Create Event"}
            </button>
          </form>
        </section>

        {/* Events List */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              All Events ({events.length})
            </h2>

            <button
              onClick={loadEvents}
              disabled={loading}
              className={`${buttonClass} bg-white text-gray-700 shadow-sm hover:bg-gray-50`}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="py-10 text-center text-gray-600">Loading events...</p>
          ) : events.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <p className="font-medium text-gray-800">
                No seasonal events created yet.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {events.map((event) => (
                <article
                  key={event._id}
                  className="rounded-xl bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {event.title}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {formatDate(event.startDate)} –{" "}
                        {formatDate(event.endDate)}
                      </p>
                    </div>

                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold capitalize text-indigo-700">
                      {event.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-gray-600">
                    {event.description}
                  </p>

                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => handleViewAnalytics(event._id)}
                      disabled={
                        analyticsLoading && analyticsEventId === event._id
                      }
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {analyticsLoading && analyticsEventId === event._id
                        ? "Loading Analytics..."
                        : "View Analytics"}
                    </button>
                  </div>

                  {analyticsEventId === event._id && analytics && (
                    <div className="mt-5 space-y-5 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
                      <h4 className="text-lg font-bold text-gray-900">
                        Event Analytics
                      </h4>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          ["Total Participants", analytics.participants.total],
                          ["Teachers", analytics.participants.teachers],
                          ["Students", analytics.participants.students],
                          ["Challenges", analytics.challenges.total],
                          [
                            "Completed Challenges",
                            analytics.challenges.completed,
                          ],
                          ["Rewards Issued", analytics.rewards.totalIssued],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-lg bg-white p-4 shadow-sm"
                          >
                            <p className="text-sm text-gray-500">{label}</p>
                            <p className="mt-1 text-2xl font-bold text-gray-900">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-lg bg-white p-4 shadow-sm">
                        <p className="text-sm text-gray-500">
                          Total XP Distributed
                        </p>
                        <p className="text-2xl font-bold text-indigo-600">
                          {analytics.rewards.totalXPDistributed} XP
                        </p>
                      </div>

                      <div>
                        <h5 className="mb-3 font-semibold text-gray-900">
                          Challenge Performance
                        </h5>

                        {analytics.challenges.breakdown.map((challenge) => (
                          <div
                            key={challenge.challengeId}
                            className="mb-3 rounded-lg bg-white p-4 shadow-sm"
                          >
                            <div className="flex flex-wrap justify-between gap-2">
                              <p className="font-semibold text-gray-800">
                                {challenge.title}
                              </p>
                              <p className="text-sm font-semibold text-indigo-600">
                                {challenge.completionRate}%
                              </p>
                            </div>

                            <p className="mt-1 text-xs text-gray-500">
                              {challenge.completed} completed out of{" "}
                              {challenge.participants} participants
                            </p>

                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full bg-indigo-600"
                                style={{
                                  width: `${challenge.completionRate}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 text-sm text-gray-600">
                    <p>Eligible roles: {event.eligibleRoles?.join(", ")}</p>
                    <p>Challenges: {event.challenges?.length || 0}</p>
                    <p>Rules version: {event.rulesVersion}</p>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                    {["draft", "scheduled"].includes(event.status) && (
                      <>
                        <button
                          onClick={() => handleEdit(event)}
                          className={`${buttonClass} bg-gray-100 text-gray-700 hover:bg-gray-200`}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleAction(event._id, "publish")}
                          disabled={actionId === event._id}
                          className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}
                        >
                          Publish
                        </button>
                      </>
                    )}

                    {event.status === "active" && (
                      <button
                        onClick={() => handleAction(event._id, "pause")}
                        disabled={actionId === event._id}
                        className={`${buttonClass} bg-amber-100 text-amber-800 hover:bg-amber-200`}
                      >
                        Pause
                      </button>
                    )}

                    {event.status === "paused" && (
                      <button
                        onClick={() => handleAction(event._id, "resume")}
                        disabled={actionId === event._id}
                        className={`${buttonClass} bg-green-100 text-green-800 hover:bg-green-200`}
                      >
                        Resume
                      </button>
                    )}

                    {!["completed", "cancelled"].includes(event.status) && (
                      <button
                        onClick={() => handleAction(event._id, "cancel")}
                        disabled={actionId === event._id}
                        className={`${buttonClass} bg-red-100 text-red-700 hover:bg-red-200`}
                      >
                        Cancel Event
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default AdminEvents;

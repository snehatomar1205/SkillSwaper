import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAdminDisputes, resolveAdminDispute } from "../services/adminApi";

const getName = (user) => {
  if (!user) return "Unknown participant";

  return user.username || user.name || user.email || "Unknown participant";
};

const getId = (value) => String(value?._id || value || "");

const formatDate = (value) => {
  if (!value) return "Not specified";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Not specified" : date.toLocaleString();
};

function AdminDashboard() {
  const navigate = useNavigate();

  const [disputes, setDisputes] = useState([]);
  const [notes, setNotes] = useState({});
  const [decisions, setDecisions] = useState({});
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = sessionStorage.getItem("adminToken");

  // Fetch disputes
  const loadDisputes = useCallback(async () => {
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchAdminDisputes(token);

      setDisputes(
        Array.isArray(data.disputes)
          ? data.disputes
          : Array.isArray(data.requests)
            ? data.requests
            : Array.isArray(data.data)
              ? data.data
              : [],
      );
    } catch (err) {
      setError(err.message || "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }, [navigate, token]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  // Resolve dispute
  const handleResolve = async (requestId) => {
    const decision = decisions[requestId];

    if (!["refund_learner", "pay_teacher"].includes(decision)) {
      setError("Choose a resolution before submitting.");
      return;
    }

    const confirmed = window.confirm(
      decision === "refund_learner"
        ? "Refund the reserved credits to the learner?"
        : "Pay the reserved credits to the teacher?",
    );

    if (!confirmed) return;

    setResolvingId(requestId);
    setError("");
    setMessage("");

    try {
      const result = await resolveAdminDispute(
        token,
        requestId,
        decision,
        notes[requestId] || "",
      );

      setMessage(result.msg || "Dispute resolved successfully.");

      setDisputes((current) =>
        current.filter((item) => String(item._id) !== requestId),
      );
    } catch (err) {
      setError(err.message || "Failed to resolve dispute");
    } finally {
      setResolvingId(null);
    }
  };

  // Admin logout
  const handleLogout = () => {
    sessionStorage.removeItem("adminToken");
    navigate("/admin/login", { replace: true });
  };

  // Download dispute attachment
  const handleDownloadAttachment = async (requestId, attachment) => {
    if (!attachment?._id) return;

    setDownloadingId(String(attachment._id));
    setError("");

    const downloadWindow = window.open("about:blank", "_blank");

    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000/api"
        }/admin/disputes/${requestId}/attachments/${attachment._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.attachment?.downloadUrl) {
        throw new Error(data.msg || "Unable to download attachment.");
      }

      if (downloadWindow) {
        downloadWindow.location.href = data.attachment.downloadUrl;
      } else {
        window.location.href = data.attachment.downloadUrl;
      }
    } catch (err) {
      downloadWindow?.close();
      setError(err.message || "Download failed.");
    } finally {
      setDownloadingId("");
    }
  };

  // Render attachments
  const renderAttachments = (attachments = [], requestId) => {
    if (!attachments.length) {
      return <p className="text-sm text-gray-400">No attachments submitted.</p>;
    }

    return (
      <div className="mt-2 space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment._id || attachment.publicId}
            className="flex flex-wrap justify-between gap-2 rounded-lg bg-gray-100 p-3"
          >
            <div>
              <p className="break-all text-sm font-medium text-gray-800">
                {attachment.originalName || "Evidence attachment"}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {attachment.mimeType || "Unknown file type"}

                {attachment.size
                  ? ` • ${(attachment.size / 1024).toFixed(1)} KB`
                  : ""}
              </p>
            </div>

            <button
              type="button"
              disabled={downloadingId === String(attachment._id)}
              onClick={() => handleDownloadAttachment(requestId, attachment)}
              className="text-sm font-medium text-indigo-600 hover:underline disabled:opacity-50"
            >
              {downloadingId === String(attachment._id)
                ? "Loading..."
                : "Download"}
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Dispute Management
            </h1>

            <p className="mt-1 text-gray-600">
              Review complaints, participant responses, and submitted evidence.
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

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 p-3 text-red-700"
          >
            {error}
          </div>
        )}

        {/* Success message */}
        {message && (
          <div
            role="status"
            className="mb-4 rounded-lg bg-green-50 p-3 text-green-700"
          >
            {message}
          </div>
        )}

        {/* Dispute list heading */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Open Disputes ({disputes.length})
          </h2>

          <button
            onClick={loadDisputes}
            disabled={loading}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>

        {/* Loading and empty states */}
        {loading ? (
          <p className="py-10 text-center text-gray-600">Loading disputes...</p>
        ) : disputes.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="font-medium text-gray-800">No open disputes</p>

            <p className="mt-1 text-sm text-gray-500">
              New disputes will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {disputes.map((dispute) => {
              const requestId = String(dispute._id);
              const learner = dispute.fromUser;
              const teacher = dispute.toUser;
              const details = dispute.dispute || {};

              const responses = details.responses || [];
              const evidenceRequests = details.evidenceRequests || [];

              return (
                <article
                  key={requestId}
                  className="space-y-5 rounded-xl bg-white p-5 shadow-sm sm:p-6"
                >
                  {/* Request information */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {dispute.skillPostId?.skillName || "Skill exchange"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Request ID: {requestId}
                      </p>
                    </div>

                    <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                      Disputed
                    </span>
                  </div>

                  {/* Participants */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["Learner", learner],
                      ["Teacher", teacher],
                    ].map(([label, user]) => (
                      <div key={label} className="rounded-lg bg-gray-50 p-4">
                        <p className="text-sm text-gray-500">{label}</p>

                        <p className="font-medium text-gray-900">
                          {getName(user)}
                        </p>

                        <p className="break-all text-sm text-gray-600">
                          {user?.email || ""}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Reserved credits */}
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Credits reserved
                    </p>

                    <p className="text-gray-900">
                      {dispute.hoursRequested} credits
                    </p>
                  </div>

                  {/* Original complaint */}
                  <section className="space-y-3 rounded-xl border border-amber-200 p-4">
                    <h4 className="font-semibold text-gray-900">
                      Original Complaint
                    </h4>

                    <p className="whitespace-pre-wrap text-gray-700">
                      {details.reason || "No reason provided"}
                    </p>

                    {details.evidence && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Additional details
                        </p>

                        <p className="mt-1 whitespace-pre-wrap text-gray-700">
                          {details.evidence}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-gray-500">
                      Raised by: {getName(details.raisedBy)}
                    </p>

                    <p className="text-xs text-gray-500">
                      Raised: {formatDate(details.raisedAt)}
                    </p>

                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        Original Attachments
                      </p>

                      {renderAttachments(details.attachments, requestId)}
                    </div>
                  </section>

                  {/* Participant responses */}
                  <section className="space-y-3">
                    <h4 className="font-semibold text-gray-900">
                      Participant Responses ({responses.length})
                    </h4>

                    {responses.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No participant responses submitted yet.
                      </p>
                    ) : (
                      responses.map((response) => {
                        const submitterId = getId(response.submittedBy);

                        const learnerId = getId(learner);
                        const teacherId = getId(teacher);

                        const participantRole =
                          submitterId === learnerId
                            ? "Learner"
                            : submitterId === teacherId
                              ? "Teacher"
                              : "Unknown participant";

                        return (
                          <div
                            key={response._id}
                            className="space-y-3 rounded-xl border border-gray-200 p-4"
                          >
                            <div className="flex flex-wrap justify-between gap-2">
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {participantRole} Response
                                </p>

                                <p className="text-xs text-gray-500">
                                  {getName(response.submittedBy)}
                                </p>
                              </div>

                              <span className="text-xs text-gray-500">
                                {formatDate(response.submittedAt)}
                              </span>
                            </div>

                            <p className="whitespace-pre-wrap text-gray-700">
                              {response.message}
                            </p>

                            <div>
                              <p className="text-sm font-semibold text-gray-700">
                                Response Attachments
                              </p>

                              {renderAttachments(
                                response.attachments,
                                requestId,
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </section>

                  {/* Additional evidence requests */}
                  <section className="space-y-3 rounded-xl border border-indigo-100 p-4">
                    <h4 className="font-semibold text-gray-900">
                      Additional Evidence Requests ({evidenceRequests.length})
                    </h4>

                    {evidenceRequests.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No additional evidence requested.
                      </p>
                    ) : (
                      evidenceRequests.map((item) => {
                        const linkedResponse = responses.find(
                          (response) =>
                            getId(response._id) === getId(item.responseId),
                        );

                        return (
                          <div
                            key={item._id}
                            className="space-y-3 rounded-lg border border-gray-200 p-4"
                          >
                            <div className="flex flex-wrap justify-between gap-2">
                              <p className="font-semibold text-gray-800">
                                Evidence requested from:{" "}
                                {getName(item.requestedFrom)}
                              </p>

                              <span className="text-xs capitalize text-gray-500">
                                {item.status}
                              </span>
                            </div>

                            <p className="whitespace-pre-wrap text-gray-700">
                              {item.question}
                            </p>

                            <div className="grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                              <p>Requested: {formatDate(item.createdAt)}</p>

                              <p>Due: {formatDate(item.dueAt)}</p>

                              <p>Responded: {formatDate(item.respondedAt)}</p>
                            </div>

                            {linkedResponse ? (
                              <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                                <p className="font-semibold text-gray-800">
                                  Submitted Evidence Response
                                </p>

                                <p className="text-xs text-gray-500">
                                  {getName(linkedResponse.submittedBy)}
                                </p>

                                <p className="whitespace-pre-wrap text-gray-700">
                                  {linkedResponse.message}
                                </p>

                                {renderAttachments(
                                  linkedResponse.attachments,
                                  requestId,
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">
                                No response linked to this evidence request yet.
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </section>

                  {/* Dispute resolution */}
                  <section className="space-y-3 border-t border-gray-200 pt-5">
                    <label
                      htmlFor={`decision-${requestId}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      Resolution
                    </label>

                    <select
                      id={`decision-${requestId}`}
                      value={decisions[requestId] || ""}
                      onChange={(e) =>
                        setDecisions((current) => ({
                          ...current,
                          [requestId]: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-3"
                    >
                      <option value="">Choose a resolution</option>

                      <option value="refund_learner">
                        Refund credits to learner
                      </option>

                      <option value="pay_teacher">
                        Pay credits to teacher
                      </option>
                    </select>

                    <label
                      htmlFor={`notes-${requestId}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      Resolution notes (optional)
                    </label>

                    <textarea
                      id={`notes-${requestId}`}
                      rows={3}
                      maxLength={2000}
                      value={notes[requestId] || ""}
                      onChange={(e) =>
                        setNotes((current) => ({
                          ...current,
                          [requestId]: e.target.value,
                        }))
                      }
                      placeholder="Explain the resolution..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    />

                    <button
                      onClick={() => handleResolve(requestId)}
                      disabled={resolvingId === requestId}
                      className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {resolvingId === requestId
                        ? "Resolving..."
                        : "Confirm Resolution"}
                    </button>
                  </section>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default AdminDashboard;


import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  confirmRequestCompletion,
  cancelRequest,
  scheduleSession,
  authenticatedFetch,
} from "../services/api";

const API_BASE = "http://localhost:5000/api";
const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const getCurrentUserId = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "";

    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    return String(payload.id || payload._id || payload.sub || "");
  } catch {
    return "";
  }
};

const getId = (value) => String(value?._id || value || "");

const formatDate = (value) => {
  if (!value) return "Not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not specified" : date.toLocaleString();
};

const RequestCard = ({
  request,
  isReceiver,
  onUpdate,
  onRefresh,
  onCancel,
}) => {
  const navigate = useNavigate();

  const {
    skillPostId,
    fromUser,
    toUser,
    hoursRequested,
    status,
    _id,
  } = request;

  const otherUser = isReceiver ? fromUser : toUser;
  const currentUserId = getCurrentUserId();

  const learnerId = getId(fromUser);
  const teacherId = getId(toUser);
  const isLearner = currentUserId === learnerId;

  const schedule = request.sessionSchedule || {};
  const scheduleStatus = schedule.status || "unscheduled";
  const proposerId = getId(schedule.proposedBy);

  const chatRoomId = getId(request.chatRoomId);

  const dispute = request.dispute || {};
  const responses = dispute.responses || [];
  const evidenceRequests = dispute.evidenceRequests || [];

  const isDisputeStatus = ["disputed", "dispute_resolved"].includes(status);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [disputeReason, setDisputeReason] = useState("");
  const [disputeEvidence, setDisputeEvidence] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  const [showInitialResponseForm, setShowInitialResponseForm] =
    useState(false);

  const [downloadingId, setDownloadingId] = useState("");

  const runAction = async (action, successMessage) => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await action();
      setMessage(result?.msg || successMessage);
      await onRefresh?.();
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    const dateTime = window.prompt(
      "Enter a future date and time (example: 2026-11-01T15:00)"
    );

    if (!dateTime) return;

    await runAction(
      () => scheduleSession(_id, { scheduledAt: dateTime }),
      "Session time proposed."
    );
  };

  const handleScheduleResponse = async (action) => {
    await runAction(
      () => scheduleSession(_id, { action }),
      action === "confirm"
        ? "Session time confirmed."
        : "Session proposal rejected."
    );
  };

  const handleConfirmCompletion = async () => {
    await runAction(
      () => confirmRequestCompletion(_id),
      "Completion confirmation recorded."
    );
  };

  const handleCancel = async () => {
    const confirmation =
      status === "accepted"
        ? "Cancel this accepted request? Reserved credits will be refunded."
        : "Cancel this pending request?";

    if (!window.confirm(confirmation)) return;

    await runAction(async () => {
      if (onCancel) {
        await onCancel(_id);
        return null;
      }

      return cancelRequest(_id);
    }, "Request cancelled.");
  };

  // Validate selected attachments before uploading.
  const validateFiles = (files) => {
    if (files.length > MAX_FILES) {
      throw new Error("You can upload a maximum of 5 attachments.");
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(
          `${file.name} exceeds the 5 MB file size limit.`
        );
      }
    }
  };

  // Raise a new dispute.
  const handleDispute = async (event) => {
    event.preventDefault();

    if (!disputeReason.trim()) {
      setError("Please enter a reason for the dispute.");
      return;
    }

    const form = event.currentTarget;
    const files = Array.from(form.attachments.files || []);

    try {
      validateFiles(files);
    } catch (err) {
      setError(err.message);
      return;
    }

    await runAction(async () => {
      const formData = new FormData();

      formData.append("reason", disputeReason.trim());
      formData.append("evidence", disputeEvidence.trim());

      files.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await authenticatedFetch(
        `${API_BASE}/requests/${_id}/dispute`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "Failed to submit dispute.");
      }

      setShowDisputeForm(false);
      setDisputeReason("");
      setDisputeEvidence("");

      return data;
    }, "Dispute submitted.");
  };

  // Submit initial response or additional evidence.
  const handleDisputeResponse = async (event, evidenceRequestId = null) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const responseMessage = String(formData.get("message") || "").trim();
    const files = Array.from(form.attachments.files || []);

    if (!responseMessage) {
      setError("Please enter your response.");
      return;
    }

    try {
      validateFiles(files);
    } catch (err) {
      setError(err.message);
      return;
    }

    await runAction(async () => {
      const payload = new FormData();

      payload.append("message", responseMessage);

      if (evidenceRequestId) {
        payload.append("evidenceRequestId", evidenceRequestId);
      }

      files.forEach((file) => {
        payload.append("attachments", file);
      });

      const response = await authenticatedFetch(
        `${API_BASE}/requests/${_id}/dispute-response`,
        {
          method: "POST",
          body: payload,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "Failed to submit dispute response.");
      }

      setShowInitialResponseForm(false);

      return data;
    }, "Dispute response submitted successfully.");
  };

  // Retrieve a short-lived signed Cloudinary URL.
  const handleDownloadAttachment = async (attachment) => {
    if (!attachment?._id) {
      setError("Invalid attachment.");
      return;
    }

    setDownloadingId(String(attachment._id));
    setError("");

    // Open a blank tab synchronously to avoid popup blocking.
    const downloadWindow = window.open("about:blank", "_blank");

    try {
      const response = await authenticatedFetch(
        `${API_BASE}/requests/${_id}/dispute/attachments/${attachment._id}`,
        { method: "GET" }
      );

      const data = await response.json();

      if (!response.ok || !data.attachment?.downloadUrl) {
        throw new Error(
          data.msg || "Unable to retrieve attachment."
        );
      }

      if (downloadWindow) {
        downloadWindow.location.href = data.attachment.downloadUrl;
      } else {
        window.location.href = data.attachment.downloadUrl;
      }
    } catch (err) {
      downloadWindow?.close();
      setError(err.message || "Failed to download attachment.");
    } finally {
      setDownloadingId("");
    }
  };

  const renderAttachments = (attachments = []) => {
    if (!attachments.length) return null;

    return (
      <div className="mt-2 space-y-2">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          Attachments
        </p>

        {attachments.map((attachment) => (
          <div
            key={attachment._id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-100 dark:bg-gray-700 p-2"
          >
            <span className="text-sm text-gray-700 dark:text-gray-200 break-all">
              {attachment.originalName}
            </span>

            <button
              type="button"
              disabled={downloadingId === String(attachment._id)}
              onClick={() => handleDownloadAttachment(attachment)}
              className="text-sm text-indigo-600 dark:text-indigo-300 hover:underline disabled:opacity-50"
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

  const canCancel =
    status === "pending" || (status === "accepted" && isLearner);

  const hasSubmittedInitialResponse = responses.some(
    (response) => getId(response.submittedBy) === currentUserId
  );

  const canSubmitInitialResponse =
    status === "disputed" &&
    getId(dispute.raisedBy) !== currentUserId &&
    !hasSubmittedInitialResponse &&
    dispute.workflowStatus === "awaiting_other_party_response" &&
    (!dispute.initialResponseDueAt ||
      new Date(dispute.initialResponseDueAt).getTime() >= Date.now());

  const myPendingEvidenceRequests = evidenceRequests.filter(
    (item) =>
      getId(item.requestedFrom) === currentUserId &&
      item.status === "pending" &&
      (!item.dueAt || new Date(item.dueAt).getTime() >= Date.now())
  );

  const isResolved =
    status === "dispute_resolved" ||
    dispute.workflowStatus === "resolved";

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-lg flex flex-col gap-4"
    >
      {/* User details */}
      <div className="flex items-center gap-3">
        {otherUser?.avatarUrl && (
          <img
            src={otherUser.avatarUrl}
            alt={otherUser.username || "User"}
            className="w-10 h-10 rounded-full object-cover border"
          />
        )}

        <div>
          <h4 className="font-semibold text-gray-800 dark:text-white">
            @{otherUser?.username || "User"}
          </h4>
          <p className="text-xs text-gray-500">
            {isReceiver ? "requested your skill" : "you requested"}
          </p>
        </div>
      </div>

      {/* Request details */}
      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <strong className="block text-indigo-600 dark:text-indigo-300">
          {skillPostId?.skillName || "Skill unavailable"}
        </strong>

        <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">
          {hoursRequested} hour(s)
        </p>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          Status:{" "}
          <b className="capitalize text-black dark:text-white">
            {status?.replace(/_/g, " ")}
          </b>
        </p>
      </div>

      {/* Expand / collapse only disputed and dispute-resolved requests */}
      {isDisputeStatus && (
        <button
          type="button"
          onClick={() => setIsExpanded((previous) => !previous)}
          aria-expanded={isExpanded}
          aria-controls={`request-details-${_id}`}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <span>{isExpanded ? "Hide Details" : "View Details"}</span>
          <span aria-hidden="true" className="text-lg">
            {isExpanded ? "−" : "+"}
          </span>
        </button>
      )}

      {/* Keep pending accept/decline actions accessible in the compact card. */}
      {isReceiver && status === "pending" && (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => onUpdate(_id, "accepted")}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
          >
            Accept
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onUpdate(_id, "declined")}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}

      {(!isDisputeStatus || isExpanded) && (
        <div id={`request-details-${_id}`} className="flex flex-col gap-4 pt-1">
      {/* Chat */}
      {status === "accepted" && chatRoomId && (
        <button
          type="button"
          onClick={() => navigate(`/chat/${chatRoomId}`)}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          Open Chat
        </button>
      )}

      {status === "accepted" && !chatRoomId && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Chat room is unavailable for this request.
        </p>
      )}

      {/* Session scheduling */}
      {status === "accepted" && (
        <section className="border border-indigo-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-800 dark:text-white">
            Session Scheduling
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>Proposed time:</strong>{" "}
            {schedule.scheduledAt
              ? formatDate(schedule.scheduledAt)
              : "Not scheduled"}
          </p>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>Schedule status:</strong>{" "}
            <span className="capitalize">{scheduleStatus}</span>
          </p>

          {schedule.note && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Note:</strong> {schedule.note}
            </p>
          )}

          {scheduleStatus !== "proposed" && (
            <button
              type="button"
              disabled={loading}
              onClick={handleSchedule}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {scheduleStatus === "confirmed"
                ? "Propose New Time"
                : "Propose Session Time"}
            </button>
          )}

          {scheduleStatus === "proposed" &&
            proposerId !== currentUserId && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleScheduleResponse("confirm")}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  Confirm Time
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleScheduleResponse("reject")}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  Reject Proposal
                </button>
              </div>
            )}

          <p className="text-xs text-gray-500">
            Both participants should confirm the session time before proceeding.
          </p>
        </section>
      )}

      {/* Completion confirmation */}
      {status === "accepted" && (
        <section className="space-y-2">
          <h3 className="font-semibold text-gray-800 dark:text-white">
            Completion
          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your confirmation:{" "}
            {isLearner
              ? request.learnerConfirmedCompletion
                ? "Confirmed"
                : "Pending"
              : request.teacherConfirmedCompletion
                ? "Confirmed"
                : "Pending"}
          </p>

          <p className="text-sm text-gray-600 dark:text-gray-300">
            Other participant:{" "}
            {isLearner
              ? request.teacherConfirmedCompletion
                ? "Confirmed"
                : "Pending"
              : request.learnerConfirmedCompletion
                ? "Confirmed"
                : "Pending"}
          </p>

          {!(isLearner
            ? request.learnerConfirmedCompletion
            : request.teacherConfirmedCompletion) && (
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmCompletion}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm disabled:opacity-50"
            >
              Confirm Completion
            </button>
          )}

          <p className="text-xs text-gray-500">
            Credits are transferred to the teacher only after both participants
            confirm completion.
          </p>
        </section>
      )}

      {/* Raise dispute */}
      {status === "accepted" && (
        <section className="space-y-3">
          <h3 className="font-semibold text-gray-800 dark:text-white">
            Dispute
          </h3>

          {showDisputeForm ? (
            <form onSubmit={handleDispute} className="space-y-3">
              <textarea
                value={disputeReason}
                onChange={(event) => setDisputeReason(event.target.value)}
                placeholder="Explain the issue (required)"
                maxLength={2000}
                required
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm"
              />

              <textarea
                value={disputeEvidence}
                onChange={(event) => setDisputeEvidence(event.target.value)}
                placeholder="Evidence or additional details (optional)"
                maxLength={5000}
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm"
              />

              <div>
                <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                  Attachments (maximum 5 files, 5 MB each)
                </label>
                <input
                  type="file"
                  name="attachments"
                  multiple
                  onChange={(event) => {
                    if (event.target.files.length > MAX_FILES) {
                      setError("You can select a maximum of 5 files.");
                      event.target.value = "";
                    } else {
                      setError("");
                    }
                  }}
                  className="w-full text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  Submit Dispute
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowDisputeForm(false)}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Back
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowDisputeForm(true)}
              className="px-4 py-2 border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg text-sm disabled:opacity-50"
            >
              Raise Dispute
            </button>
          )}

          <p className="text-xs text-gray-500">
            Raising a dispute locks reserved credits while the issue is reviewed.
          </p>
        </section>
      )}

      {/* Dispute details and participant workflow */}
      {(status === "disputed" || status === "dispute_resolved") && (
        <section className="border border-red-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">
              Dispute Details
            </h3>

            <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">
              <strong>Raised by:</strong>{" "}
              {getId(dispute.raisedBy) === currentUserId
                ? "You"
                : `@${otherUser?.username || "Other participant"}`}
            </p>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Raised on:</strong> {formatDate(dispute.raisedAt)}
            </p>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Workflow:</strong>{" "}
              <span className="capitalize">
                {(dispute.workflowStatus || "awaiting_other_party_response")
                  .replace(/_/g, " ")}
              </span>
            </p>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Initial response deadline:</strong>{" "}
              {formatDate(dispute.initialResponseDueAt)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 space-y-2">
            <h4 className="font-semibold text-sm text-gray-800 dark:text-white">
              Original Complaint
            </h4>

            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {dispute.reason || "No reason provided."}
            </p>

            {dispute.evidence && (
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                <strong>Additional details:</strong> {dispute.evidence}
              </p>
            )}

            {renderAttachments(dispute.attachments)}
          </div>

          {/* Initial response from the opposing participant */}
          {canSubmitInitialResponse && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-800 dark:text-white">
                Your Response
              </h4>

              {showInitialResponseForm ? (
                <form
                  onSubmit={(event) => handleDisputeResponse(event)}
                  className="space-y-2"
                >
                  <textarea
                    name="message"
                    required
                    maxLength={5000}
                    rows={4}
                    placeholder="Explain your side of the issue..."
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm"
                  />

                  <input
                    type="file"
                    name="attachments"
                    multiple
                    onChange={(event) => {
                      if (event.target.files.length > MAX_FILES) {
                        setError("You can select a maximum of 5 files.");
                        event.target.value = "";
                      } else {
                        setError("");
                      }
                    }}
                    className="w-full text-sm"
                  />

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      Submit Response
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowInitialResponseForm(false)}
                      className="px-4 py-2 border rounded-lg text-sm"
                    >
                      Back
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowInitialResponseForm(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  Respond to Dispute
                </button>
              )}
            </div>
          )}

          {/* Existing participant responses */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-800 dark:text-white">
              Participant Responses ({responses.length})
            </h4>

            {responses.length === 0 ? (
              <p className="text-sm text-gray-500">
                No responses submitted yet.
              </p>
            ) : (
              responses.map((response) => {
                const submittedByMe =
                  getId(response.submittedBy) === currentUserId;

                return (
                  <div
                    key={response._id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong className="text-sm text-gray-800 dark:text-white">
                        {submittedByMe ? "Your Response" : "Other Participant"}
                      </strong>

                      <span className="text-xs text-gray-500">
                        {formatDate(response.submittedAt)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {response.message}
                    </p>

                    {renderAttachments(response.attachments)}
                  </div>
                );
              })
            )}
          </div>

          {/* Admin evidence requests */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-800 dark:text-white">
              Additional Evidence Requests
            </h4>

            {evidenceRequests.length === 0 ? (
              <p className="text-sm text-gray-500">
                No additional evidence requested.
              </p>
            ) : (
              evidenceRequests.map((item) => {
                const assignedToMe =
                  getId(item.requestedFrom) === currentUserId;

                const linkedResponse = responses.find(
                  (response) =>
                    getId(response._id) === getId(item.responseId)
                );

                const canRespond =
                  assignedToMe &&
                  item.status === "pending" &&
                  (!item.dueAt ||
                    new Date(item.dueAt).getTime() >= Date.now());

                return (
                  <div
                    key={item._id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong className="text-sm text-gray-800 dark:text-white">
                        {assignedToMe
                          ? "Evidence requested from you"
                          : "Evidence requested from other participant"}
                      </strong>

                      <span className="text-xs capitalize text-gray-500">
                        {item.status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {item.question}
                    </p>

                    <p className="text-xs text-gray-500">
                      <strong>Due:</strong> {formatDate(item.dueAt)}
                    </p>

                    {linkedResponse && (
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                          Submitted Response
                        </p>

                        <p className="text-sm mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {linkedResponse.message}
                        </p>

                        {renderAttachments(linkedResponse.attachments)}
                      </div>
                    )}

                    {canRespond && (
                      <form
                        onSubmit={(event) =>
                          handleDisputeResponse(event, String(item._id))
                        }
                        className="space-y-2"
                      >
                        <textarea
                          name="message"
                          required
                          maxLength={5000}
                          rows={3}
                          placeholder="Provide the requested evidence..."
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm"
                        />

                        <input
                          type="file"
                          name="attachments"
                          multiple
                          onChange={(event) => {
                            if (event.target.files.length > MAX_FILES) {
                              setError("You can select a maximum of 5 files.");
                              event.target.value = "";
                            } else {
                              setError("");
                            }
                          }}
                          className="w-full text-sm"
                        />

                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm disabled:opacity-50"
                        >
                          Submit Additional Evidence
                        </button>
                      </form>
                    )}

                    {assignedToMe &&
                      item.status === "pending" &&
                      !canRespond && (
                        <p className="text-xs text-amber-600">
                          The evidence submission deadline has passed.
                        </p>
                      )}
                  </div>
                );
              })
            )}
          </div>

          {/* Resolution */}
          {isResolved && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 p-3 space-y-2">
              <h4 className="font-semibold text-sm text-emerald-800 dark:text-emerald-300">
                Dispute Resolved
              </h4>

              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Decision:</strong>{" "}
                {dispute.resolution?.decision === "refund_learner"
                  ? "Refund learner"
                  : dispute.resolution?.decision === "pay_teacher"
                    ? "Pay teacher"
                    : "Not available"}
              </p>

              {dispute.resolution?.notes && (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  <strong>Admin notes:</strong>{" "}
                  {dispute.resolution.notes}
                </p>
              )}

              <p className="text-xs text-gray-500">
                Resolved on: {formatDate(dispute.resolution?.resolvedAt)}
              </p>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Reserved credits remain locked until an administrator resolves the
            dispute.
          </p>
        </section>
      )}

      {/* Cancel request */}
      {canCancel && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="px-4 py-2 border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 rounded-md text-sm"
        >
          Cancel Request
        </button>
      )}
        </div>
      )}

      {loading && (
        <p className="text-sm text-gray-500">Processing...</p>
      )}

      {message && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {message}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </motion.div>
  );
};

export default RequestCard;

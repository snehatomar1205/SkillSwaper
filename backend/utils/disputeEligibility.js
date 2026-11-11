
const canResolveDispute = (request) => {
  if (
    !request ||
    request.status !== "disputed" ||
    request.creditsReserved !== true
  ) {
    return false;
  }

  const dispute = request.dispute;

  if (!dispute || !dispute.raisedBy) {
    return false;
  }

  const responses = dispute.responses || [];
  const evidenceRequests = dispute.evidenceRequests || [];
  const now = new Date();

  // Any unexpired pending evidence request blocks resolution.
  const pendingEvidenceRequests = evidenceRequests.some(
    (item) =>
      item.status === "pending" &&
      (!item.dueAt || new Date(item.dueAt) > now)
  );

  if (pendingEvidenceRequests) {
    return false;
  }

  // Check whether the opposing participant has responded.
  const otherParticipantResponded = responses.some(
    (response) =>
      String(response.submittedBy) !== String(dispute.raisedBy)
  );

  if (otherParticipantResponded) {
    return true;
  }

  // Support older disputes that do not have initialResponseDueAt.
  const initialDeadline =
    dispute.initialResponseDueAt ||
    (dispute.raisedAt
      ? new Date(
          new Date(dispute.raisedAt).getTime() +
            72 * 60 * 60 * 1000
        )
      : null);

  return Boolean(
    initialDeadline && now >= new Date(initialDeadline)
  );
};

module.exports = { canResolveDispute };

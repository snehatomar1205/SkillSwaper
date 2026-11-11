const isValidDisputeDecision = (decision) => {
  return ["refund_learner", "pay_teacher"].includes(decision);
};

const isValidDisputeNotes = (notes) => {
  return (
    notes === undefined ||
    (typeof notes === "string" && notes.trim().length <= 2000)
  );
};

const isValidDisputeEvidence = (evidence) => {
  return (
    evidence === undefined ||
    (typeof evidence === "string" && evidence.length <= 5000)
  );
};

module.exports = {
  isValidDisputeDecision,
  isValidDisputeNotes,
  isValidDisputeEvidence
};
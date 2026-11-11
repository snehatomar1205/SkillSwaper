
const XP_RULES = {
  exchangeCompletion: {
    teacher: 100,
    student: 100,
  },

  milestoneBonuses: {
    5: 100,
    10: 200,
  },

  levelThresholds: [
    { level: 1, xp: 0 },
    { level: 2, xp: 500 },
    { level: 3, xp: 1200 },
    { level: 4, xp: 2200 },
    { level: 5, xp: 3500 },
    { level: 6, xp: 5000 },
    { level: 7, xp: 7000 },
    { level: 8, xp: 9500 },
    { level: 9, xp: 12500 },
    { level: 10, xp: 16000 },
  ],
};

module.exports = XP_RULES;

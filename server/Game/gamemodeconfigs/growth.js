module.exports = {
  level_cap: 1000,
  growth: true,
  defineLevelSkillPoints: level => {
    if (level < 2) return 0
    if (level <= 40) return 1
    if (level <= 45 && (level & 1) == 1) return 1
    if (level <= 51 && level % 2 == 1) return 1
    if (level % 10 == 1) return 1
    return 0
  },
  // Smoother "current Arras" growth curve.
  defineGrowthMultiplier: (mult, score) =>
    mult +
        Math.pow(
          Math.max(0, (score - 26263) / 3660),
          0.6575 + Math.pow(score, 0.8) / 1e8
        ) /
            8,
  growthStatsMultipliers: {
    health: (level) => 0.05 * level,
    shield: (level) => 0.02 * level,
    regen: (level) => 0.002 * level
  }
}

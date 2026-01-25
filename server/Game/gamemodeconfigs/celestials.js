module.exports = {
	BOT_START_LEVEL: 90,
	LEVEL_CHEAT_CAP: 90,
	SPAWN_CLASS: 'proc_celestial',
	TIER_MULTIPLIER: 45,
	LEVEL_SKILL_POINT_FUNCTION: level => {
		if (level == 45) return 42;
		return 0;
	}
};

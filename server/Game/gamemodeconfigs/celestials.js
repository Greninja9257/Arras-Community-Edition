module.exports = {
	bot_start_level: 90,
	level_cap_cheat: 90,
	spawn_class: 'proc_celestial',
	tier_multiplier: 45,
	defineLevelSkillPoints: level => {
		if (level == 45) return 42;
		return 0;
	}
};

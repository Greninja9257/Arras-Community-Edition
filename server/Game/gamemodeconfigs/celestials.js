module.exports = {
	bot_start_level: 0,
	bot_xp_gain: 0,
	level_cap_cheat: 45,
	disable_auto_level: true,
	spawn_class: 'proc_celestial',
	tier_multiplier: 9,
	defineLevelSkillPoints: level => {
		if (level < 2) return 0;
		if (level <= 45) return 1;
		return 0;
	}
};

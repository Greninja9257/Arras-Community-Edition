// Harvest gamemode addon
// Listens for food entity deaths and hands them off to the Harvest gamemode
// to be claimed by the killing player's team.
module.exports = ({ Events, Config }) => {
    Events.on("spawn", entity => {
        if (!Config.harvest || entity.isHarvested) return;
        if (entity.type !== "food") return;

        entity.on("dead", ({ killers }) => {
            if (!Config.harvest_data?.active) return;

            // Walk up the master chain: bullet → gun owner → player tank
            const getTeam = e => e.master?.master?.team ?? e.master?.team ?? e.team;

            const killer = killers.find(e => {
                const root = e.master?.master ?? e.master ?? e;
                return root.isPlayer || root.isBot;
            });
            if (!killer) return;

            const killerTeam = getTeam(killer);
            Config.harvest_data.onFoodKilled(entity, killerTeam);
        });
    });
};

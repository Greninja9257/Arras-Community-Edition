// Harvest gamemode addon
// Attaches a "dead" listener to food entities so they can be claimed by the
// killing player's team. Must listen to the "define" event (not "spawn") because
// entities emit "spawn" before o.define(...) is called — type is "unknown" at
// spawn time and only becomes "food" after the caller defines it.
module.exports = ({ Events, Config }) => {
    Events.on("spawn", entity => {
        entity.on("define", ({ body }) => {
            if (!Config.harvest) return;
            if (body.isHarvested) return;            // spawned by claimShape
            if (body.type !== "food") return;
            if (body._harvestListenerAttached) return; // prevent double-attach on 2nd define
            body._harvestListenerAttached = true;

            body.on("dead", ({ killers }) => {
                if (!Config.harvest_data?.active) return;
                if (Config.harvest_data.phase !== "harvest") return;

                const getTeam = e => e.master?.master?.team ?? e.master?.team ?? e.team;

                const killer = killers.find(e => {
                    const root = e.master?.master ?? e.master ?? e;
                    return root.isPlayer || root.isBot;
                });
                if (!killer) return;

                const killerTeam = getTeam(killer);
                Config.harvest_data.onFoodKilled(body, killerTeam);
            });
        });
    });
};

class ClanWars {
  constructor (gameManager) {
    this.gameManager = gameManager
    this.clans = []
    this.index = -1
    this.teamID = 110
    Config.clan_wars_ft = {
      getClans: () => this.clans,
      add: (name, addToPartyList = false) => {
        const clanCheck = this.checkName(name)
        if (clanCheck) {
          const clan = this.clans.find(o => o.clanName === clanCheck[1])
          if (!clan) {
            this.clans.push({
              fullClanName: clanCheck[0],
              clanName: clanCheck[1],
              partyEntities: [],
              team: this.teamID++,
              index: this.index++
            })
            util.log('[INFO] Created an new clan party ' + this.clans[this.index].fullClanName)
          }
          if (addToPartyList) {
            const clan = this.clans.find(o => o.clanName === clanCheck[1])
            clan.partyEntities.push(addToPartyList)
          }
        }
      },
      remove: (entity) => {
        const clanCheck = this.checkName(entity.originalName)
        if (clanCheck) {
          const clan = this.clans.find(o => o.clanName === clanCheck[1])
          if (!clan || !Array.isArray(clan.partyEntities)) return
          util.remove(clan.partyEntities, clan.partyEntities.indexOf(entity))
        }
      },
      getSpawn: (name) => {
        const clanCheck = this.checkName(name)
        if (clanCheck) {
          const clan = this.clans.find(o => o.clanName === clanCheck[1])
          if (!clan || !Array.isArray(clan.partyEntities)) {
            return getSpawnableArea(null, this.gameManager)
          }
          const TheChosenOne = ran.choose(clan.partyEntities)
          if (TheChosenOne) {
            return {
              x: TheChosenOne.x + (TheChosenOne.size - 12 * 2) * Math.random() - TheChosenOne.size,
              y: TheChosenOne.y + (TheChosenOne.size + 12 * 2) * Math.random() + TheChosenOne.size
            }
          } else return getSpawnableArea(null, this.gameManager)
        } else return getSpawnableArea(null, this.gameManager)
      },
      getPlayerInfo: (name) => {
        const clanCheck = this.checkName(name)
        if (clanCheck) {
          const clan = this.clans.find(o => o.clanName === clanCheck[1])
          if (!clan) return { clan: null, team: getRandomTeam() }
          return {
            team: clan.team,
            clan: clan.fullClanName
          }
        } else {
          return {
            clan: null,
            team: getRandomTeam()
          }
        }
      }
    }
  }

  checkName (name) {
    if (!name) return null
    const matches = name.matchAll(/\[(.*?)\]/g)
    for (const match of matches) {
      if (!match[1]) continue
      if (match[1].toLowerCase() === 'ai') continue
      return match
    }
    return null
  };

  redefine (theshit) {
    this.gameManager = theshit
  }

  reset () {
    this.clans = []
    this.index = -1
    this.teamID = 110
  }
}

module.exports = { ClanWars }

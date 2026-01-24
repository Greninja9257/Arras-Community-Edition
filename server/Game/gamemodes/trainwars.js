// Thanks to Damocles
// https://discord.com/channels/366661839620407297/508125275675164673/1114907447195349074

class Train {
  constructor () {
    this.directions = new Map()
  }

  loop () {
    const train_able = []
    for (const instance of entities.values()) if (instance.isPlayer || instance.isBot) train_able.push(instance)
    const clans = new Set(train_able.map(r => r.clan).filter(Boolean))
    for (const clan of clans) {
      const train = train_able.filter(r => r.clan === clan).sort((a, b) => b.skill.score - a.skill.score)
      if (!train.length) continue
      const leader = train[0]
      if (leader.invuln) {
        leader.velocity.x = 0
        leader.velocity.y = 0
        continue
      }
      const t = leader.control?.target ?? { x: 0, y: 0 }
      const tlen = Math.hypot(t.x, t.y)
      const lastDir = this.directions.get(clan)
      const dirx = tlen > 0.01 ? t.x / tlen : lastDir?.x ?? Math.cos(leader.facing)
      const diry = tlen > 0.01 ? t.y / tlen : lastDir?.y ?? Math.sin(leader.facing)
      if (tlen > 0.01) this.directions.set(clan, { x: dirx, y: diry })
      const speedMult = 3
      const baseSpeed = 6
      const trainSpeed = baseSpeed * speedMult
      const leaderVelX = dirx * trainSpeed
      const leaderVelY = diry * trainSpeed
      leader.velocity.x += (leaderVelX - leader.velocity.x) * 0.35
      leader.velocity.y += (leaderVelY - leader.velocity.y) * 0.35

      for (let i = 1; i < train.length; i++) {
        const player = train[i]
        const prev = train[i - 1]
        const pv = Math.hypot(prev.velocity.x, prev.velocity.y)
        const pdx = pv > 0.01 ? prev.velocity.x / pv : Math.cos(prev.facing)
        const pdy = pv > 0.01 ? prev.velocity.y / pv : Math.sin(prev.facing)
        const followDistance = 80
        const targetX = prev.x - pdx * followDistance
        const targetY = prev.y - pdy * followDistance
        const dx = targetX - player.x
        const dy = targetY - player.y
        const dist = Math.hypot(dx, dy) || 1
        const pull = Math.min(90, dist)
        const desiredX = (dx / dist) * pull * player.damp * 1.1 + pdx * trainSpeed * 0.7
        const desiredY = (dy / dist) * pull * player.damp * 1.1 + pdy * trainSpeed * 0.7
        player.velocity.x += (desiredX - player.velocity.x) * 0.35
        player.velocity.y += (desiredY - player.velocity.y) * 0.35
      }
    }
  }
}

module.exports = { Train }

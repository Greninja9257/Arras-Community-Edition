const { dereference } = require('./facilitators')

// basically the length of a gun if it went from center to edge
const RADIUS = 10

exports.makeFat = (type, newSize) => {
  const output = dereference(type)
  let parent = type
  let size = 0

  // Getting SIZE
  while (!size && parent) {
    size = parent.SIZE
    if (Array.isArray(parent.PARENT)) parent = Class[parent.PARENT[0]] // lazy
    else parent = Class[parent.PARENT]
  }

  output.SIZE = newSize
  const ratio = (size || 1) / newSize

  if (output.GUNS) {
    for (const gun of output.GUNS) {
      if (typeof gun.POSITION !== 'object') {
        throw new Error(
          'POSITION is not an object. Your code is incorrect or the addon is outdated.'
        )
      }

      const length = (gun.POSITION[0] || gun.POSITION.LENGTH || 18) * ratio
      const width = (gun.POSITION[1] || gun.POSITION.WIDTH || 12) * ratio
      const x =
					RADIUS - (RADIUS - (gun.POSITION[3] || gun.POSITION.X || 0)) * ratio
      const y = (gun.POSITION[4] || gun.POSITION.Y || 0) * ratio

      // x /= 1.1; //idk

      if (gun.POSITION.length === 7) {
        gun.POSITION[0] = length
        gun.POSITION[1] = width
        gun.POSITION[3] = x
        gun.POSITION[4] = y
      } else if (Array.isArray(gun.POSITION)) {
        throw new Error('POSITION of one gun is not an 7 element array.')
      } else {
        gun.POSITION.LENGTH = length
        gun.POSITION.WIDTH = width
        gun.POSITION.X = x
        if (gun.POSITION.Y) gun.POSITION.Y = y
      }
    }
  }

  if (output.TURRETS) {
    for (const turret of output.TURRETS) {
      if (typeof turret.POSITION !== 'object') {
        throw new Error(
          'POSITION is not an object. Your code is incorrect or the addon is outdated.'
        )
      }

      const size = (turret.POSITION[0] || turret.POSITION.SIZE || 10) * ratio
      const _x = turret.POSITION[1] || turret.POSITION.X || 0
      const x = _x > RADIUS ? RADIUS - (RADIUS - _x) * ratio : _x

      if (turret.POSITION.length === 6) {
        turret.POSITION[0] = size
        turret.POSITION[1] = x
      } else if (Array.isArray(turret.POSITION)) {
        throw new Error('POSITION of one gun is not an 6 element array.')
      } else {
        turret.POSITION.SIZE = size
        if (turret.POSITION.X) turret.POSITION.X = x
      }
    }
  }

  return output
}

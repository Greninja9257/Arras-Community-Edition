let room = Array(Config.roomHeight).fill(() => Array(Config.roomWidth).fill()).map(x => x());

let baseProtectedGap = Math.ceil((Config.roomHeight - 1) / 6);
for (let y = 0; y < Config.roomHeight; y++) {
    room[y][0] = tileClass.base1;
    room[y][1] = tileClass.base1;
    room[y][Config.roomWidth - 2] = tileClass.base3;
    room[y][Config.roomWidth - 1] = tileClass.base3;
}

for (let i = -2; i <= 2; i++) {
    let y = Math.floor(Config.roomHeight / 2 - baseProtectedGap * i);
    room[y][0] = tileClass.baseprotected1;
    room[y][1] = tileClass.baseprotected1;
    room[y][Config.roomWidth - 2] = tileClass.baseprotected3;
    room[y][Config.roomWidth - 1] = tileClass.baseprotected3;
}

module.exports = room;

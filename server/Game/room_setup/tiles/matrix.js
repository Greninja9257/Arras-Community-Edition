tileClass.matrix = new Tile({
    COLOR: "pureBlack",
    NAME: "Matrix Tile",
    INIT: (tile, room) => room.spawnableDefault.push(tile),
});

tileClass.matrixWall = new Tile({
    COLOR: "black",
    NAME: "Matrix Wall Tile",
    INIT: (tile, room) => {
        let o = new Entity(tile.loc);
        o.define("wall");
        o.team = TEAM_ROOM;
        o.SIZE = room.tileWidth / 2 / lazyRealSizes[4] * Math.SQRT2 - 2;
        o.color.base = "black";
        o.protect();
        o.life();
        makeHitbox(o);
        walls.push(o);
        o.on("dead", () => {
            util.remove(walls, walls.indexOf(o));
        });
    }
});

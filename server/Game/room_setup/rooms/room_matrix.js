const {
    matrix: ____,
    matrixWall: wall,
} = tileClass;

const cellWidth = 16;
const cellHeight = 16;
const gridWidth = cellWidth * 2 + 1;
const gridHeight = cellHeight * 2 + 1;

const room = Array.from({ length: gridHeight }, () => Array.from({ length: gridWidth }, () => wall));
const visited = Array.from({ length: cellHeight }, () => Array(cellWidth).fill(false));
const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: -1 },
];

const carveBetween = (x, y, dx, dy) => {
    const tileX = 2 * x + 1;
    const tileY = 2 * y + 1;

    room[tileY][tileX] = ____;

    if (dx === 1 && x === cellWidth - 1) {
        room[tileY][gridWidth - 1] = ____;
        room[tileY][0] = ____;
        return;
    }
    if (dx === -1 && x === 0) {
        room[tileY][0] = ____;
        room[tileY][gridWidth - 1] = ____;
        return;
    }
    if (dy === 1 && y === cellHeight - 1) {
        room[gridHeight - 1][tileX] = ____;
        room[0][tileX] = ____;
        return;
    }
    if (dy === -1 && y === 0) {
        room[0][tileX] = ____;
        room[gridHeight - 1][tileX] = ____;
        return;
    }

    room[tileY + dy][tileX + dx] = ____;
};

const startX = Math.floor(Math.random() * cellWidth);
const startY = Math.floor(Math.random() * cellHeight);
const stack = [[startX, startY]];
visited[startY][startX] = true;

while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    room[2 * y + 1][2 * x + 1] = ____;

    const choices = [];
    for (const { dx, dy } of directions) {
        const nextX = (x + dx + cellWidth) % cellWidth;
        const nextY = (y + dy + cellHeight) % cellHeight;
        if (!visited[nextY][nextX]) {
            choices.push({ nextX, nextY, dx, dy });
        }
    }

    if (!choices.length) {
        stack.pop();
        continue;
    }

    const { nextX, nextY, dx, dy } = choices[Math.floor(Math.random() * choices.length)];
    carveBetween(x, y, dx, dy);
    room[2 * nextY + 1][2 * nextX + 1] = ____;
    visited[nextY][nextX] = true;
    stack.push([nextX, nextY]);
}

module.exports = room;

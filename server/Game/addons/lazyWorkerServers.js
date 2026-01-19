module.exports = ({ Config }) => {
    if (!global.gameManager || !global.gameManager.gameHandler || !global.gameManager.socketManager) return;
    if (!global.gameManager.parentPort) return;
    if (Config.lazy_server_workers === false) return;

    const gameManager = global.gameManager;
    const gameHandler = gameManager.gameHandler;
    const socketManager = gameManager.socketManager;
    const idleMs = Number.isFinite(Config.lazy_server_idle_ms) ? Config.lazy_server_idle_ms : 5000;

    const startLoops = () => {
        if (gameHandler._lazyIntervals) return;
        gameHandler.active = true;
        const gameLoop = setInterval(() => {
            if (!gameHandler.active) return clearInterval(gameLoop);
            if (gameHandler.checkUsers()) {
                try {
                    gameHandler.gameloop();
                    syncedDelaysLoop();
                    if (Config.enable_food) gameHandler.foodloop();
                    gameManager.roomLoop();
                    gameManager.gamemodeManager.request("quickloop");
                } catch (e) {
                    gameManager.gameSpeedCheckHandler.onError(e);
                    gameHandler.stop();
                }
            }
        }, gameManager.room.cycleSpeed);

        const maintainLoop = setInterval(() => {
            if (!gameHandler.active) return clearInterval(maintainLoop);
            gameManager.gameSpeedCheckHandler.update();
            socketManager.chatLoop();
            gameManager.gamemodeManager.request("loop");
            gameHandler.maintainloop();
        }, 1000);

        const otherLoop = setInterval(() => {
            if (!gameHandler.active) return clearInterval(otherLoop);
            gameHandler.quickMaintainLoop();
        }, 200);

        const healingLoop = setInterval(() => {
            if (!gameHandler.active) return clearInterval(healingLoop);
            gameHandler.regenHealthAndShield();
        }, Config.regenerate_tick);

        gameHandler._lazyIntervals = { gameLoop, maintainLoop, otherLoop, healingLoop };
    };

    const stopLoops = () => {
        if (!gameHandler._lazyIntervals) return;
        gameHandler.active = false;
        for (const interval of Object.values(gameHandler._lazyIntervals)) {
            clearInterval(interval);
        }
        gameHandler._lazyIntervals = null;
    };

    let idleTimer = null;
    const scheduleIdleStop = () => {
        if (idleTimer) return;
        idleTimer = setTimeout(() => {
            idleTimer = null;
            if (!socketManager.clients.length) stopLoops();
        }, idleMs);
    };

    const cancelIdleStop = () => {
        if (!idleTimer) return;
        clearTimeout(idleTimer);
        idleTimer = null;
    };

    const originalRun = gameHandler.run.bind(gameHandler);
    gameHandler.run = () => {
        gameHandler._lazyOriginalRun = originalRun;
        if (socketManager.clients.length) startLoops();
    };

    const originalConnect = socketManager.connect.bind(socketManager);
    socketManager.connect = (socket, req) => {
        const wasEmpty = socketManager.clients.length === 0;
        originalConnect(socket, req);
        if (wasEmpty && socketManager.clients.length) {
            cancelIdleStop();
            startLoops();
        }
    };

    const originalClose = socketManager.close.bind(socketManager);
    socketManager.close = (socket) => {
        originalClose(socket);
        if (!socketManager.clients.length) scheduleIdleStop();
    };
};

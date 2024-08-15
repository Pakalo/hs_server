const connectionsByGameCode = {};

function sendUpdateToGamePlayers(gameCode, message) {
    const connections = connectionsByGameCode[gameCode] || [];
    console.log("\n\n⚽ Nombre de socket rélié à " + gameCode + " : " + connections.length + "\n")
    connections.forEach(connection => {
        connection.send(message);
        console.log("connection envoyé  " + message);
    });
}

module.exports = {
    connectionsByGameCode,
    sendUpdateToGamePlayers
}


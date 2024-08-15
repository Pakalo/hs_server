const { User, Room } = require('../db/dbSync');
const { sendUpdateToGamePlayers } = require('../fonction/sendUpdateToGamePlayers.js');

module.exports = async function setOutOfZone(data, ws) {
    console.log("\n\n");
    console.log("⌨️ Commande : " + data.cmd + "\n");
    console.log("🤝 GameCode : " + data.gameCode + "\n");
    console.log("🙋 Player ID : " + data.id + "\n");
    console.log("📌 Position player : " + data.position);
    console.log("\n\n");

    try {
        // Find the room based on the game code
        const room = await Room.findOne({ where: { gameCode: data.gameCode } });

        if (room) {
            // Find the user based on the id
            const user = await User.findOne({ where: { id: data.playerId } });

            if (user) {
                // Create the message to send
                const message = JSON.stringify({
                    cmd: 'playerOutOfZone',
                    playerId: data.playerId,
                    playerName: user.username,
                    position: data.position
                });
        
                // Use the function to send the update to all game players
                sendUpdateToGamePlayers(data.gameCode, message);
            }
        
            } else {
                // Send error response if the user is not found
                ws.send(JSON.stringify({ cmd: data.cmd, status: 'error', message: 'User not found' }));
            }
    } catch (error) {
        console.error('Error setting out of zone status:', error);
        // Send error response
        ws.send(JSON.stringify({ cmd: data.cmd, status: 'error', message: 'Internal server error' }));
    }
}
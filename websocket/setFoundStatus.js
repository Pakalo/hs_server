const { User, Room, userParty } = require('../db/dbSync');
const { sendUpdateToGamePlayers } = require('../fonction/sendUpdateToGamePlayers.js');

module.exports = async function setFoundStatus(data, ws) {
    console.log("\n\n");
    console.log("⌨️ Commande : " + data.cmd);
    console.log("🤝 GameCode : " + data.gameCode);
    console.log("🙋 Player ID : " + data.playerId);
    console.log("\n");

    try {
        // Find the room based on the game code
        const room = await Room.findOne({ where: { gameCode: data.gameCode } });

        if (room) {
            // Find the userParty entry for the specified player in the specified game
            const userPartyEntry = await userParty.findOne({
                where: { gameID: room.id, UserId: data.playerId }
            });

            if (userPartyEntry) {
                // Set the Found status to true
                userPartyEntry.Found = true;
                await userPartyEntry.save();

                // Send a success response to the client
                ws.send(JSON.stringify({ cmd: data.cmd, status: 'success', message: 'Found status updated' }));
                const remainingPlayers = await userParty.count({
                    where: { gameID: room.id, Seeker: false, Found: false }
                });
                
                const user = await User.findOne({ where: { id: data.playerId } });
                const username = user ? user.username : 'Unknown';

                // Prepare the message to send
                const messageToSend = JSON.stringify({
                    'cmd': 'ReceiveMessage',
                    'message': `${username} has been found!`,
                    'username': 'System',
                    'email': '',
                    'timestamp': new Date().toISOString()
                });

                console.log("📩 Message à envoyer : " + messageToSend);

                // Use sendUpdateToGamePlayers to broadcast the message
                sendUpdateToGamePlayers(data.gameCode, messageToSend);

                if (remainingPlayers === 0) {
                    // If there are no remaining players, send the 'seeker win' command to the client
                    sendUpdateToGamePlayers(data.gameCode, '{"cmd":"seekerWin"}');
                }
            } else {
                // Send error response if the userParty entry is not found
                ws.send(JSON.stringify({ cmd: data.cmd, status: 'error', message: 'Player not found in this game' }));
            }
        } else {
            // Send error response if the room is not found
            ws.send(JSON.stringify({ cmd: data.cmd, status: 'error', message: 'Room not found' }));
        }
    } catch (error) {
        console.error('Error setting found status:', error);
        // Send error response
        ws.send(JSON.stringify({ cmd: data.cmd, status: 'error', message: 'Internal server error' }));
    }
}
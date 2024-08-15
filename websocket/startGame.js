const { Room, userParty } = require('../db/dbSync');
const { sendUpdateToGamePlayers } = require('../fonction/sendUpdateToGamePlayers.js');


module.exports = async function startGame(data, ws) {
    console.log("Starting game with data:", data);

    try {
        // Find the room based on the game code
        const room = await Room.findOne({ where: { gameCode: data.gameCode } });

        if (room) {
            console.log("🧕 Room found");
            // Update the room's startingTimeStamp
            await Room.update({ startingTimeStamp: data.startingTimeStamp }, { where: { gameCode: data.gameCode } });
            console.log("⛷️ Room updated");
            // Prepare the player dictionary
            const players = {};
            const userParties = await userParty.findAll({ where: { gameID: room.id } });
            console.log('userParties:', userParties);
            userParties.forEach(userParty => {
                players[userParty.UserId] = userParty.Seeker;
            });
            console.log('players:', players);

            // Prepare the data to send to clients
            const partyStartInfo = {
                center: room.center,
                duration: room.duration,
                hidingDuration: room.hidingDuration,
                startingTimeStamp: data.startingTimeStamp,
                radius: room.radius,
                players: players
            };
            console.log('partyStartInfo:', partyStartInfo);
            sendUpdateToGamePlayers(data.gameCode, '{"cmd":"partyStartInfo","data":' + JSON.stringify(partyStartInfo) + '}');
        } else {
            // Send error response if the room is not found
            ws.send(JSON.stringify({ cmd: data.cmd, status: 'error', message: 'Room not found' }));
        }
    } catch (error) {
        console.error('Error starting game:', error);
        // Send error response
        ws.send(JSON.stringify({ cmd: data.cmd, status: 'error', message: 'Internal server error' }));
    }
}
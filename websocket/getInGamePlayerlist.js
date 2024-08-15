const { User, Room, userParty } = require('../db/dbSync');

module.exports = async function getInGamePlayerlist(data, ws) {
    console.log("\n\n");
    console.log("⌨️ Commande : " + data.cmd);
    console.log("🤝 GameCode : " + data.gameCode);
    console.log("\n");

    try {
        // Find the room based on the game code
        const room = await Room.findOne({ where: { gameCode: data.gameCode } });

        if (room) {
            // Get the users in the userParty table for the specified game
            const userParties = await userParty.findAll({
                where: { gameID: room.id }
            });

            // Fetch user information for each userParty
            const players = await Promise.all(userParties.map(async (userParty) => {
                const user = await User.findOne({ where: { id: userParty.UserId } });
                return {
                    username: user ? user.username : null,
                    seeker: userParty.Seeker,
                    found: userParty.Found
                };
            }));

            console.log('players:', players);

            // Send the dictionary of players to the client
            ws.send(JSON.stringify({
                cmd: 'returnPlayerList',
                players: players
            }));
        } else {
            // Send error response if the room is not found
            ws.send(JSON.stringify({ cmd: data.cmd, status: 'error', message: 'Room not found' }));
        }
    } catch (error) {
        console.error('Error getting player list:', error);
        // Send error response
        ws.send(JSON.stringify({ cmd: data.cmd, status: 'error', message: 'Internal server error' }));
    }
}
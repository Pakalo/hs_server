const { User, Room, userParty } = require('../db/dbSync');

module.exports = async function getPositionForId(data, ws) {
    console.log("\n\n");
    console.log("⌨️ Commande : " + data.cmd);
    console.log("🤝 GameCode : " + data.gameCode);
    console.log("🙋 Liste ID : " + data.ids);
    console.log("\n");

    try {
        // Find the room based on the game code
        const room = await Room.findOne({ where: { gameCode: data.gameCode } });

        if (room) {
            // Get the positions of the users in the userParty table for the specified game
            const userParties = await userParty.findAll({
                where: { UserId: data.ids, gameID: room.id },
                attributes: ['UserId', 'Position']
            });

            // Fetch user information for each userParty
            const positions = await Promise.all(userParties.map(async (userParty) => {
                const user = await User.findOne({ where: { id: userParty.UserId } });
                return {
                    userId: userParty.UserId,
                    username: user ? user.username : null,
                    position: userParty.Position
                };
            }));

            // Send the list of positions to the client
            ws.send(JSON.stringify({
                cmd: 'returnPositions',
                positions: positions
            }));
        } else {
            // Send error response if the room is not found
            ws.send(JSON.stringify({ cmd: data.cmd, status: 'error', message: 'Room not found' }));
        }
    } catch (error) {
        console.error('Error getting positions:', error);
        // Send error response
        ws.send(JSON.stringify({ cmd: data.cmd, status: 'error', message: 'Internal server error' }));
    }
}
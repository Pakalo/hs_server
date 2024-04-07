const { dbSync, User, Room, userParty } = require('../db/dbSync');

module.exports = async function UpdatePlayerlist(data, ws) {
    try {
        const gameCode = data.gameCode;
        console.log("Game code : " + gameCode);
        
        // Find the room based on the game code
        const room = await Room.findOne({ where: { gameCode: gameCode } });

        if (room) {
            // Find all userParties associated with the room
            const userParties = await userParty.findAll({ where: { gameID: room.id } });

            // Fetch user information for each userParty
            const playerList = await Promise.all(userParties.map(async (userParty) => {
                const user = await User.findOne({ where: { id: userParty.UserId } });
                return user ? user.username : null;
            }));

            // Remove null entries (handling errors where user information couldn't be fetched)
            const filteredPlayerList = playerList.filter((player) => player !== null);

            // Send success response with the player list
            ws.send('{"cmd":"' + data.cmd + '","status":"success","players":' + JSON.stringify(filteredPlayerList) + '}');
        } else {
            // Send error response if the room is not found
            ws.send('{"cmd":"' + data.cmd + '","status":"error","message":"Room not found"}');
        }
    } catch (error) {
        console.error('Error fetching player list:', error);
        // Send error response
        ws.send('{"cmd":"' + data.cmd + '","status":"error","message":"Internal server error"}');
    }
}
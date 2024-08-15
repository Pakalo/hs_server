const { User, Room, userParty } = require('../db/dbSync');

module.exports = async function setPositionPlayer(data, ws) {
    console.log("\n\n");
    console.log("⌨️ Commande : " + data.cmd);
    console.log("🤝 GameCode : " + data.gameCode);
    console.log("🙋 Player ID : " + data.id);
    console.log("📌 Position player : " + data.position);
    console.log("\n");
    
    try {
        // Find the room based on the game code
        const room = await Room.findOne({ where: { gameCode: data.gameCode } });
    
        if (room) {
            // Update the user's position in the userParty table for the specified game
            const updateUserParty = await userParty.update(
                { Position: data.position },
                { where: { UserId: data.playerId, gameID: room.id } }
            );
            
            if (updateUserParty[0] === 0) {
                // User is not part of the game
                ws.send('{"cmd":"' + data.cmd + '","status":"error","message":"User is not part of the game"}');
            } else {
                // Send success message to the client
                ws.send('{"cmd":"' + data.cmd + '","status":"success", "gameCode":"' + data.gameCode + '"}');
            
            }
        } else {
            // Send error response if the room is not found
            ws.send('{"cmd":"' + data.cmd + '","status":"error","message":"Room not found"}');
        }
    } catch (error) {
        console.error('Error setting player position:', error);
        // Send error response
        ws.send('{"cmd":"' + data.cmd + '","status":"error","message":"Internal server error"}');
    }
}

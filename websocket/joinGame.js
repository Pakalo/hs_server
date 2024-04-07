const { dbSync, User, Room, userParty } = require('../db/dbSync');
const { connectionsByGameCode, sendUpdateToGamePlayers } = require('../index');


module.exports = async function joinGame(data, ws) {
    // Handle joining game logic here
    console.log("Joining game with data:", data);
                                                            
    try {
    // Find the room based on the game code
    const room = await Room.findOne({ where: { gameCode: data.gameCode } });
    
    if (room) {
        // Check if the user is already part of the game
        const existingUserParty = await userParty.findOne({
        where: { UserId: data.userId, gameID: room.id },
        });
    
        if (existingUserParty) {
        // User is already part of the game
        ws.send('{"cmd":"' + data.cmd + '","status":"error","message":"User is already part of the game"}');
        } else {
        // Add the user to the userParty table for the specified game
        const addUserParty = await userParty.create({
            UserId: data.userId,
            gameID: room.id,
        });
    
        // Send success message to the client
        ws.send('{"cmd":"' + data.cmd + '","status":"success", "gameCode":"' + data.gameCode + '","isAdmin":"' + room.creatorId + '"}');
    
        console.log('AAAAAAAAAAAAAAAAAA : ' + '{"cmd":"' + data.cmd + '","status":"success", "gameCode":"' + data.gameCode + '","isAdmin":"' + room.creatorId + '"}')

        // Notify all connected clients about the new player
        console.log("🦖🦖 Room ID : " + room.id + " 🦖🦖");
        const connectedClients = connectionsByGameCode[data.gameCode] || [];
        connectedClients.forEach(client => {
            client.send('{"cmd":"playerJoined","playerName":"' + data.userId + '"}');
        });
        }
    } else {
        // Send error response if the room is not found
        ws.send('{"cmd":"' + data.cmd + '","status":"error","message":"Room not found"}');
    }
    } catch (error) {
    console.error('Error joining game:', error);
    // Send error response
    ws.send('{"cmd":"' + data.cmd + '","status":"error","message":"Internal server error"}');
    }

    sendUpdateToGamePlayers(data.gameCode, '{"cmd":"playerJoined","playerName":"' + data.userId + '"}');
}
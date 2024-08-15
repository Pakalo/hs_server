const { User, Room, userParty } = require('../db/dbSync');


module.exports = async function createGame(data, ws) {
    // Handle game creation logic here
    try {
        if (data.cmd === 'createGame') {
            // Handle game creation logic here

    
            let newRoom; // Declare newRoom at a higher scope
    
            try {
                // Create a new record in the Room table
                newRoom = await Room.create({
                    radius: data.radius,
                    creatorId: data.creatorId,
                    center: data.center,
                    duration: data.duration,
                    hidingDuration: data.hidingDuration,
                    gameCode: await generateUniqueGameCode(), // Use await to handle the promise
                });
                // Now you can send a response or further process the data if needed
                // For example, you can send a success message to the client:
                ws.send('{"cmd":"' + data.cmd + '","status":"success","gameCode":"' + newRoom.gameCode + '","gameId":"' + newRoom.id + '"}');
            } catch (error) {
                console.error('Error creating room:', error);
                ws.send('{"cmd":"' + data.cmd + '","status":"error"}');
            }
    
            try {
                // Create a new record in the userParty table
                const addUserParty = await userParty.create({
                    UserId: data.creatorId, // Assuming data.creatorId is the correct value
                    gameID: newRoom.id, // Access newRoom in the higher scope
                });
            } catch (error) {
                console.error('Error creating userParty:', error);
                ws.send('{"cmd":"' + data.cmd + '","status":"error"}');
            }
        }
    } catch (error) {
        console.error('An unexpected error occurred:', error);
    }
    console.log("Game created with data:", data);
    
}

async function generateUniqueGameCode() {
    const codeLength = 6;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    while (true) {
        const generatedCode = Array.from({ length: codeLength }, () => characters[Math.floor(Math.random() * characters.length)]).join('');

        // Check if the generated code already exists in the database
        const existingRoom = await Room.findOne({
            where: {
                gameCode: generatedCode,
            },
        });

        if (!existingRoom) {
            return generatedCode.toString();  // Ensure the generatedCode is converted to a string
        }
    }
}
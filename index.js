const express = require('express');
const http = require('http');
const { Server } = require('ws');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const resetPasswordRoute = require('./routes/resetPasswordRoute'); // Remplacez par le chemin réel de votre route

const createGameRoute = require('./routes/createGameRoute'); // GameRoute

/////// HTTPS ///////
const https = require('https');
const fs = require('fs');

const options = {
    cert: fs.readFileSync('/etc/letsencrypt/live/app.hideandstreet.furrball.fr/cert.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/app.hideandstreet.furrball.fr/privkey.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/app.hideandstreet.furrball.fr/chain.pem'),
};  

const app = express();
const server = https.createServer(options, app);
const wss = new Server({ server });

fs.readdir('/etc/letsencrypt/live/app.hideandstreet.furrball.fr/', (err, files) => {
    if (err) {
      console.error('Erreur lors de la lecture du répertoire :', err);
      return;
    }
  
    console.log('Fichiers dans le répertoire :', files);
  });

require('dotenv').config();

const PORT = process.env.EXPRESS_PORT;

app.use(express.json()); // Utilisez le middleware pour traiter les données JSON

app.get('/', (req, res) => res.send('Hello, you!'));


// const dbSync = require('./db/dbSync');
// dbSync();

const User = require('./table/user'); // Importer le modèle User depuis le fichier existant
const Room = require('./table/room'); // Importer le modèle Room depuis le fichier existant
const userParty = require('./table/userParty'); // Importer le modèle userParty depuis le fichier existant

// Syncro des models / database
{
    User.sync()
    .then(() => {
        console.log('Model synchronized successfully');
        server.listen(PORT, () => console.log(`Listening on ${PORT}`));
    })
    .catch((error) => {
        console.error('Error syncing User model:', error);
    });

// Synchronisez le modèle avec la base de données
Room.sync({ alter: true })
  .then(() => {
    console.log('Model synchronized successfully');
  })
  .catch((error) => {
    console.error('Error syncing Room model:', error);
  });

userParty.sync({ alter: true })
  .then(() => {
    console.log('Model synchronized successfully');
  })
  .catch((error) => {
    console.error('Error syncing Room model:', error);
  });
}


const connectionsByGameCode = {};


wss.on('connection', function(ws, req) {
    ws.on('message', async message => {
        console.log("🎈🥎⚾ Message reçu : " + message);
        const datastring = message.toString();
        if (datastring.charAt(0) === "{") {
            const data = JSON.parse(datastring.replace(/'/g, '"'));
            if (data.auth === "chatappauthkey231r4") {
                try {
                    if (data.gameCode && (data.cmd === 'getPlayerlist' || data.cmd === 'setPositionPlayer')) {
                        console.log("☢️ Game code socket link: " + data.gameCode);
                        if (!connectionsByGameCode[data.gameCode]) {
                            connectionsByGameCode[data.gameCode] = [];
                        }
                    
                        // Vérifier si le WebSocket existe déjà dans la liste
                        const existingSocketIndex = connectionsByGameCode[data.gameCode].findIndex(socket => socket === ws);
                    
                        if (existingSocketIndex === -1) {
                            // Ajouter le WebSocket à la liste uniquement s'il n'existe pas déjà
                            connectionsByGameCode[data.gameCode].push(ws);
                        }
                    
                        console.log("socket list" + connectionsByGameCode[data.gameCode]);
                    }
                    if (data.cmd === 'sendMessage') {
                        // Vérifiez si le message contient un contenu
                        console.log("📩 Message : " + data.message);
                        if (data.message) {
                          // sanitize the message , permet de trier les messages avec la ban liste
                            // const sanitizedMessage = sanitizeMessage(data.message);
  
                            //vérifie si le message est une image
                            // const isMessageImage = isImage(Buffer.from(sanitizedMessage, 'utf-8'));
                            //On récupére l'username grâce à l'email
                            const user = await User.findOne({
                                where: {
                                    email: data.email,
                                }
                            });
  
                            // Préparez le message à envoyer
                            const messageToSend = JSON.stringify({
                                'cmd': 'ReceiveMessage',
                                'message': data.message,
                                'username': user.username,
                                'email': data.email,
                            }).replace(/'/g, "\\'");
                            console.log("📩 Message à envoyer : " + messageToSend);
                            // Utilisez sendUpdateToGamePlayers pour diffuser le message
                            sendUpdateToGamePlayers(data.gameCode, messageToSend);
                        }
                    }
                    if (data.cmd === "messageImage") {
                        // Vérifiez si le contenu est une image
                        if (isImage(Buffer.from(data.content, 'base64'))) {
                            console.log('Message image reçu');
                            const message = { cmd: 'Message Image', content: data.content };
                            sendUpdateToGamePlayers(data.gameCode, message);
                        }
                    }
                    if (data.cmd === 'getPlayerlist') {
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
                                console.log('{"cmd":"' + data.cmd + '","status":"success","adminID":'+ room.creatorId +',"players":' + JSON.stringify(filteredPlayerList) + '}');
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
                    if (data.cmd === 'setPositionPlayer') {
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
                    if (data.cmd === 'getInGamePlayerlist') {
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
                    if (data.cmd === 'setFoundStatus') {
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
                    if (data.cmd === 'setOutOfZone') {
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
                    if (data.cmd === 'startGame') {
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
                    if (data.cmd === 'UpdatePlayerlist') {
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
                    if (data.cmd === 'createGame') {
                        // Handle game creation logic here
                        console.log("Game created with data:", data);
                    
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
                    if (data.cmd === 'joinGame') {
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
                      
                              // Notify all connected clients about the new player
                              const connectedClients = getConnectedClientsForGame(room.id);
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
                    if (data.cmd === 'getPositionForId') {
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
                    if (data.cmd === 'updateSeekerStatus') {
                        try {
                            // Trouver la partie basée sur le code de jeu
                            const room = await Room.findOne({ where: { gameCode: data.gameCode } });
                    
                            if (room) {
                                // Trouver tous les userParties associés à la partie
                                const userParties = await userParty.findAll({ where: { gameID: room.id } });
                    
                                // Mettre à jour le statut Seeker en fonction des joueurs sélectionnés
                                await Promise.all(userParties.map(async (userParty) => {
                                    const user = await User.findOne({ where: { id: userParty.UserId } });
                                    if (user && data.selectedPlayers.includes(user.username)) {
                                        // Si le pseudo de l'utilisateur est dans la liste des joueurs sélectionnés, définissez Seeker à true
                                        await userParty.update({ Seeker: true });
                                    } else {
                                        // Sinon, définissez Seeker à false
                                        await userParty.update({ Seeker: false });
                                    }
                                }));
                    
                                sendUpdateToGamePlayers(data.gameCode, '{"cmd":"seekerStatusUpdated","selectedPlayers":' + JSON.stringify(data.selectedPlayers) + '}');
                                // Envoyer une réponse de succès au client
                                ws.send('{"cmd":"' + data.cmd + '","status":"success"}');
                            } else {
                                // Envoyer une réponse d'erreur si la partie n'est pas trouvée
                                ws.send('{"cmd":"' + data.cmd + '","status":"error","message":"Room not found"}');
                            }
                        } catch (error) {
                            console.error('Error updating Seeker status:', error);
                            // Envoyer une réponse d'erreur
                            ws.send('{"cmd":"' + data.cmd + '","status":"error","message":"Internal server error"}');
                        }
                    }
                    const user = await User.findOne({
                        where: {
                            email: data.email,
                            password: crypto.createHash('md5').update(data.password || '').digest('hex')
                        }
                    });
                    if (data.cmd === 'signup') {
                        // Vérifier si l'email existe déjà
                        User.findOne({ where: { email: data.email } })
                            .then((existingEmail) => {
                                // Vérifier si l'email n'existe pas
                                if (!existingEmail) {
                                    // Vérifier si le nom d'utilisateur existe déjà
                                    User.findOne({ where: { username: data.username } })
                                        .then((existingUser) => {
                                            // Vérifier si le nom d'utilisateur n'existe pas
                                            if (!existingUser) {
                                                const hash = crypto.createHash("md5");
                                                const hexPwd = hash.update(data.hash).digest('hex');
                                                const signupData = '{"cmd":"' + data.cmd + '","status":"success"}';
                    
                                                // Créer un nouvel utilisateur dans la base de données
                                                User.create({
                                                    email: data.email,
                                                    username: data.username,
                                                    password: hexPwd
                                                })
                                                    .then(() => {
                                                        // Envoyer une réponse réussie à l'utilisateur
                                                        ws.send(signupData);
                                                        console.log("Envoyé : " + signupData);
                                                    })
                                                    .catch((error) => {
                                                        // Envoyer un message d'erreur à l'utilisateur en cas d'échec d'insertion
                                                        console.error('Error creating user:', error);
                                                        ws.send('{"cmd":"' + data.cmd + '","status":"error"}');
                                                    });
                                            } else {
                                                // Envoyer un message d'erreur à l'utilisateur - nom d'utilisateur existant
                                                const signupData = '{"cmd":"' + data.cmd + '","status":"user_exists"}';
                                                console.log("Envoyé : " + signupData);
                                                ws.send(signupData);
                                            }
                                        })
                                        .catch((error) => {
                                            // Envoyer un message d'erreur à l'utilisateur en cas d'erreur lors de la recherche du nom d'utilisateur
                                            console.error('Error checking existing username:', error);
                                            ws.send('{"cmd":"' + data.cmd + '","status":"error"}');
                                        });
                                } else {
                                    // Envoyer un message d'erreur à l'utilisateur - email existant
                                    const signupData = '{"cmd":"' + data.cmd + '","status":"mail_exists"}';
                                    console.log("Envoyé : " + signupData);
                                    ws.send(signupData);
                                }
                            })
                            .catch((error) => {
                                // Envoyer un message d'erreur à l'utilisateur en cas d'erreur lors de la recherche de l'email
                                console.error('Error checking existing email:', error);
                                ws.send('{"cmd":"' + data.cmd + '","status":"error"}');
                            });
                    }
                    else if (data.cmd === 'login') {
                        // Vérifier si l'email existe
                        User.findOne({ where: { email: data.email } })
                            .then((user) => {
                                // Si l'email existe, user ne sera pas null
                                if (user !== null) {
                                    const hash = crypto.createHash("md5");
                                    const hexPwd = hash.update(data.hash || '').digest('hex');
                                
                                    // Vérifier si le mot de passe est correct
                                    if (hexPwd === user.password) {
                                        // Envoyer le nom d'utilisateur à l'utilisateur et le code de statut est "succes"
                                        const loginData = '{"email":"' + user.email + '","DateCreation":"' + user.createdAt+ '","userId":"' + user.id + '","username":"' + user.username + '","status":"success"}';
                                        // Envoyer les données à l'utilisateur
                                        console.log("Envoyé : " + loginData);
                                        ws.send(loginData);
                                    } else {
                                        // Envoyer une erreur - mot de passe incorrect
                                        const loginData = '{"cmd":"' + data.cmd + '","status":"wrong_pass"}';
                                        console.log("Envoyé : "+ loginData);
                                        ws.send(loginData);
                                    }
                                } else {
                                    // Envoyer une erreur - email incorrect
                                    const loginData = '{"cmd":"' + data.cmd + '","status":"wrong_mail"}';
                                    console.log("Envoyé : "+ loginData);
                                    ws.send(loginData);
                                }
                            })
                            .catch((error) => {
                                // Envoyer une erreur en cas d'erreur lors de la recherche de l'email
                                console.error('Error checking existing email:', error);
                                ws.send('{"cmd":"' + data.cmd + '","status":"error"}');
                            });
                    }
                    else if (data.cmd === 'resetPassword') {
                        try {
                            const user = await User.findOne({
                                where: { email: data.email },
                            });

                            if (user) {
                                const resetToken = crypto.randomBytes(20).toString('hex');

                                console.log("DEMANDE RESET PASSWORD")

                                // Enregistrez le jeton dans la base de données
                                user.resettoken = resetToken;
                                user.resettokenexpiry = Date.now() + 3600000; // Le jeton expire après 1 heure
                                await user.save();

                                // Envoyez un e-mail avec le lien de réinitialisation
                                const resetLink = `https://app.hideandstreet.furrball.fr/reset-password/${resetToken}`;
                                const transporter = nodemailer.createTransport({
                                    host: process.env.SMTP_HOST,
                                    port: process.env.SMTP_PORT,
                                    secure: false, // Ne pas utiliser SSL/TLS
                                    tls: {
                                      rejectUnauthorized: false, // Ignorer les erreurs d'authentification du certificat
                                    },
                                    auth: {
                                      user: process.env.SMTP_USER,
                                      pass: process.env.SMTP_PASSWORD,
                                    },
                                  });

                                const mailOptions = {
                                    from: process.env.SMTP_USER,
                                    to: data.email,
                                    subject: 'Réinitialisation du mot de passe',
                                    text: `Cliquez sur le lien suivant pour réinitialiser votre mot de passe : ${resetLink}`,
                                };

                                transporter.sendMail(mailOptions, (error, info) => {
                                    if (error) {
                                        console.error('Erreur lors de l\'envoi de l\'e-mail :', error);
                                        ws.send('{"cmd":"resetPassword","status":"error"}');
                                    } else {
                                        console.log('E-mail envoyé :', info.response);
                                        ws.send('{"cmd":"resetPassword","status":"success"}');
                                    }
                                });
                            } else {
                                ws.send('{"cmd":"resetPassword","status":"user_not_found"}');
                            }
                        } catch (error) {
                            console.error('Erreur lors de la réinitialisation du mot de passe :', error);
                            ws.send('{"cmd":"resetPassword","status":"error"}');
                        }
                    }
                    if (user) {
                        ws.send(JSON.stringify({ success: true, message: 'Login successful' }));
                    } else {
                        ws.send(JSON.stringify({ success: false, message: 'Invalid credentials' }));
                    }
                } catch (error) {
                    console.error('Error during login:', error);
                    ws.send(JSON.stringify({ success: false, message: 'An error occurred during login' }));
                }        
            }
        }
    });

    ws.on('close', () => {
        // Parcourez toutes les gameId associées à cette connexion et retirez la connexion
        console.log("⛔ Connection fermé");
        Object.keys(connectionsByGameCode).forEach(gameCode => {
            connectionsByGameCode[gameCode] = connectionsByGameCode[gameCode].filter(connection => connection !== ws);
        });
    });
});

function sanitizeMessage(message) {
    if (typeof message === 'string') {
      const normalizedMessage = Diacritics.remove(message);
      return bannedWords.reduce((acc, word) => {
        const regex = new RegExp('\\b' + word + '\\b', 'gi');
        return acc.replace(regex, '*'.repeat(word.length));
      }, normalizedMessage);
    } else {
      const normalizedMessage = Diacritics.remove(message.toString('utf-8'));
      return bannedWords.reduce((acc, word) => {
        const regex = new RegExp('\\b' + word + '\\b', 'gi');
        return acc.replace(regex, '*'.repeat(word.length));
      }, normalizedMessage);
    }
  }
  
  function isImage(data) {
    // Vérifiez si les premiers octets du message correspondent à une signature JPEG
    return (
      data[0] === 0xFF &&
      data[1] === 0xD8 &&
      data[data.length - 2] === 0xFF &&
      data[data.length - 1] === 0xD9
    );
  }

function sendUpdateToGamePlayers(gameCode, message) {
    const connections = connectionsByGameCode[gameCode] || [];
    console.log("\n\n⚽ Nombre de socket rélié à " + gameCode + " : " + connections.length + "\n")
    connections.forEach(connection => {
        connection.send(message);
        console.log("connection envoyé  " + message);
    });
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

app.use(express.static('public'));
const bodyParser = require('body-parser'); // Add this line
const { DATE } = require('sequelize');
const { log } = require('console');
app.use(bodyParser.json());
app.use(resetPasswordRoute);

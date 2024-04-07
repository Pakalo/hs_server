//////////////////////////////
/////////  IMPORTS  //////////
//////////////////////////////

const express = require('express');
const { Server } = require('ws');

//////////////////////////////
/////////  ROUTES  ///////////
//////////////////////////////

const resetPasswordRoute = require('./routes/resetPasswordRoute'); // Remplacez par le chemin réel de votre route

//////////////////////////////
//////////  HTTPS  ///////////
//////////////////////////////

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


// Page de base (app.hideandstreet.furrball.fr)
app.get('/', (req, res) => res.send('Hide & Street Server is running!'));


//////////////////////////////
////////  Syncro DB  /////////
//////////////////////////////

const { dbSync, User, Room, userParty } = require('./db/dbSync');

dbSync()
  .then(() => {
    console.log('✅ Tout les models sont synchronisé');
    server.listen(PORT, () => console.log(`🛰️ Ecoute sur le port ${PORT}`));
  })
  .catch((error) => {
    console.error('❌ Erreur de synchronisation avec les models :', error);
  });


//////////////////////////////
////////  WebSocket  /////////
//////////////////////////////
const login = require('./websocket/login');
const signup = require('./websocket/signup');
const resetPassword = require('./websocket/resetPassword');
const sendMessage = require('./websocket/sendMessage');
const startGame = require('./websocket/startGame');
// const joinGame = require('./websocket/joinGame');
const createGame = require('./websocket/createGame');
const getPlayerlist = require('./websocket/getPlayerlist');
const setPositionPlayer = require('./websocket/setPositionPlayer');
const getInGamePlayerlist = require('./websocket/getInGamePlayerlist');
const setFoundStatus = require('./websocket/setFoundStatus');
const setOutOfZone = require('./websocket/setOutOfZone');
const UpdatePlayerlist = require('./websocket/UpdatePlayerlist');
const getPositionForId = require('./websocket/getPositionForId');
const updateSeekerStatus = require('./websocket/updateSeekerStatus');
// const { sendUpdateToGamePlayers, connectionsByGameCode } = require('./websocket/_imports');


wss.on('connection', function(ws, req) {
    ws.on('message', async message => {
        console.log("⚾ Message reçu : " + message);
        const datastring = message.toString();
        if (datastring.charAt(0) === "{") {
            const data = JSON.parse(datastring.replace(/'/g, '"'));
            module.exports = data;
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
                    switch (data.cmd) {
                        case 'signup':
                            signup(data, ws);
                            break;
                        case 'login':
                            login(data, ws);
                            break;
                        case 'resetPassword':
                            resetPassword(data, ws);
                            break;
                        case 'sendMessage':
                            // sendMessage(data, ws);
                            {
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
                                    });
                                    console.log("📩 Message à envoyer : " + messageToSend);
                                    // Utilisez sendUpdateToGamePlayers pour diffuser le message
                                    sendUpdateToGamePlayers(data.gameCode, messageToSend);
                                }
                            }
                            break;
                        case 'getPlayerlist':
                            getPlayerlist(data, ws);
                            break;
                        case 'setPositionPlayer':
                            setPositionPlayer(data, ws);
                            break;
                        case 'getInGamePlayerlist':
                            getInGamePlayerlist(data, ws);
                            break;
                        case 'setFoundStatus':
                            // setFoundStatus(data, ws);
                            {
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
                            break;
                        case 'setOutOfZone':
                            // setOutOfZone(data, ws);
                            {
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
                            break;
                        case 'startGame':
                            {
                                //startGame(data, ws);
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
                            break;
                        case 'UpdatePlayerlist':
                            // UpdatePlayerlist(data, ws);
                            {
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
                            break;
                        case 'createGame':
                            createGame(data, ws);
                            break;
                        case 'joinGame':
                            // joinGame(data, ws);
                            {

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
                                const connectedClients = connectionsByGameCode[gameCode] || [];
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
                            break;
                        case 'getPositionForId':
                            // getPositionForId(data, ws);
                            {
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
                            break;
                        case 'updateSeekerStatus':
                            // updateSeekerStatus(data, ws);
                            {
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
                            break;
                        default:
                            break;
                    }
                } catch (error) {
                    console.error('Error during login:', error);
                    ws.send(JSON.stringify({ success: false, message: 'An error occurred during login' }));
                }
            }
        }
    });

    ws.on('close', () => {
        console.log("⛔ Connection fermée");
        Object.keys(connectionsByGameCode).forEach(gameCode => {
            connectionsByGameCode[gameCode] = connectionsByGameCode[gameCode].filter(connection => connection !== ws);
        });
    });
});

  
//////////////////////////////
////////  FUNCTIONS  /////////
//////////////////////////////

const sanitizeMessage = require('./fonction/sanitizeMessage');

const connectionsByGameCode = {};

function sendUpdateToGamePlayers(gameCode, message) {
    const connections = connectionsByGameCode[gameCode] || [];
    console.log("\n\n⚽ Nombre de socket rélié à " + gameCode + " : " + connections.length + "\n")
    connections.forEach(connection => {
        connection.send(message);
        console.log("sendUpdateToGamePlayers : " + message);
    });
}

module.exports = {
    connectionsByGameCode,
    sendUpdateToGamePlayers
}


app.use(express.static('public'));
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(resetPasswordRoute);

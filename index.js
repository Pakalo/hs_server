const express = require('express');
const http = require('http');
const { Server } = require('ws');
const crypto = require('crypto');
const User = require('./table/user'); // Importer le modèle User depuis le fichier existant
const Room = require('./table/room'); // Importer le modèle Room depuis le fichier existant
const userParty = require('./table/userParty'); // Importer le modèle userParty depuis le fichier existant
const nodemailer = require('nodemailer');


const resetPasswordRoute = require('./resetPasswordRoute'); // Remplacez par le chemin réel de votre route

const createGameRoute = require('./createGameRoute'); // GameRoute


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

//////////////////////


// /////// HTTP ///////

// const app = express();
// const server = http.createServer(app);
// const wss = new Server({ server });
// /////////////////////





require('dotenv').config();

const PORT = process.env.EXPRESS_PORT;







app.use(express.json()); // Utilisez le middleware pour traiter les données JSON

app.get('/', (req, res) => res.send('Hello, you!'));

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



wss.on('connection', function(ws, req) {
    ws.on('message', async message => {
        const datastring = message.toString();
        if (datastring.charAt(0) === "{") {
            const data = JSON.parse(datastring.replace(/'/g, '"'));
            if (data.auth === "chatappauthkey231r4") {
                try {
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
                                        const loginData = '{"userId":"' + user.id + '","username":"' + user.username + '","status":"success"}';
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
});

async function generateUniqueGameCode() {
    const codeLength = 6;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

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
app.use(bodyParser.json());
app.use(resetPasswordRoute);



// Ajouts de dorian : 
app.use('/api', createGameRoute);

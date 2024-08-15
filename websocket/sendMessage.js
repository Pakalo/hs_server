const { User } = require('../db/dbSync');
const { sendUpdateToGamePlayers } = require('../fonction/sendUpdateToGamePlayers.js');

const isImage = require('../fonction/isImage');

module.exports = async function sendMessage(data, ws) {
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
};
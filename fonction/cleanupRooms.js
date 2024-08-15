require('dotenv').config({ path: '/home/node/hs_server/.env' });
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const Room = require('../table/room');  // Ajuste le chemin selon ton architecture
const userParty = require('../table/userParty');  // Ajuste le chemin selon ton architecture

// Configuration du transporteur d'e-mails avec nodemailer
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

// Fonction pour envoyer un rapport par e-mail
async function sendReportEmail(subject, text) {
  try {
    console.log(`Envoi d'un e-mail avec pour sujet : ${subject}`);
    let info = await transporter.sendMail({
      from: `"Rapport de Nettoyage" <${process.env.SMTP_USER}>`,
      to: 'furballindustries@gmail.com', // Adresse e-mail du destinataire
      bcc: 'kytola303@gmail.com',
      subject: subject,
      text: text,
    });
    console.log('E-mail envoyé avec succès: %s', info.messageId);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'e-mail:', error);
  }
}

// Fonction principale pour le nettoyage des anciennes salles
async function cleanupOldRooms() {
    try {
      console.log('Début du nettoyage des anciennes salles.');
  
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      console.log('Temps actuel :', now);
      console.log('Temps limite pour suppression :', twentyFourHoursAgo);
  
      // Trouver toutes les salles créées il y a plus de 24 heures
      const oldRooms = await Room.findAll({
        where: {
          createdAt: {
            [Op.lt]: twentyFourHoursAgo
          }
        }
      });
  
      console.log(`Nombre de salles trouvées : ${oldRooms.length}`);
  
      if (oldRooms.length > 0) {
        // Collecter les IDs des parties à supprimer
        const roomIds = oldRooms.map(room => room.id);
        console.log('IDs des salles à supprimer :', roomIds);
  
        // Supprimer les enregistrements correspondants dans la table userParty
        const userPartyDeletionResult = await userParty.destroy({
          where: {
            gameID: {
              [Op.in]: roomIds
            }
          }
        });
        console.log(`Suppression des enregistrements dans userParty terminée : ${userPartyDeletionResult} enregistrements supprimés.`);
  
        // Supprimer les anciennes salles
        const roomDeletionResult = await Room.destroy({
          where: {
            id: {
              [Op.in]: roomIds
            }
          }
        });
        console.log(`Suppression des salles terminée : ${roomDeletionResult} salles supprimées.`);
  
        const reportMessage = `Bonjour,\n\nLe nettoyage des salles a été effectué avec succès.\n\nNombre de salles supprimées : ${roomIds.length}\n\nLes enregistrements correspondants dans la table userParty ont également été supprimés.\n\nHide & Street`;
        console.log('Envoi du rapport par e-mail...');
  
        // Envoyer un rapport par e-mail
        await sendReportEmail('Rapport de nettoyage des salles', reportMessage);
        console.log('Rapport par e-mail envoyé.');
      } else {
        const noRoomsMessage = 'Bonjour,\n\nLe nettoyage des salles a été effectué, mais aucune salle n\'a été supprimée.\n\nAucune salle ne correspondait au critère de suppression (créée il y a plus de 24 heures).\n\nHide & Street';
        console.log(noRoomsMessage);
  
        // Envoyer un rapport par e-mail
        await sendReportEmail('Rapport de nettoyage des salles', noRoomsMessage);
        console.log('Rapport par e-mail envoyé.');
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des salles:', error);
      const errorMessage = `Bonjour,\n\nUne erreur est survenue lors du nettoyage des salles :\n\nErreur : ${error.message}\n\nMerci de vérifier les logs de l'application pour plus de détails.\n\nHide & Street`;
      await sendReportEmail('Erreur lors du nettoyage des salles', errorMessage);
    }
    console.log('Fin du nettoyage des anciennes salles.');
  }
  
// Planification de l'exécution de cleanupOldRooms tous les jours à 4 heures du matin
cron.schedule('0 4 * * *', () => {
  console.log('Exécution planifiée du nettoyage des salles à 4h du matin');
  cleanupOldRooms();
});

console.log('Planification du nettoyage quotidien des salles à 4h du matin est en place.');

// Vérification pour voir si le script est exécuté directement
if (require.main === module) {
  console.log('Exécution manuelle du nettoyage des salles');
  cleanupOldRooms();
}

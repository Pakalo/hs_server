const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const User = require('../table/user');  // Modèle Sequelize pour l'utilisateur
const DeleteList = require('../table/deleteList');  // Nouveau modèle pour la liste de suppression
const { Op } = require('sequelize');
const router = express.Router();
require('dotenv').config();

// Configurer le transporteur d'e-mails
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Route GET pour servir la page de suppression de compte
router.get('/delete-account', (req, res) => {
  res.sendFile(path.join(__dirname, '../html/delete-account.html'));
});

// Route POST pour envoyer le code de vérification
router.post('/delete-account/send-code', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.json({ success: false, message: 'Adresse e-mail non trouvée.' });
    }

    // Générer un code de vérification à 6 chiffres
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryDate = Date.now() + 10 * 60 * 1000; // Valide pour 10 minutes

    // Stocker le code de vérification et son expiration dans la base de données
    user.deletetoken = verificationCode;
    user.deletetokenexpiry = expiryDate;
    await user.save();

    // Envoyer le code de vérification par e-mail
    await transporter.sendMail({
      from: `"Support" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Code de vérification pour la suppression de votre compte',
      text: `Votre code de vérification est : ${verificationCode}. Il est valable pendant 10 minutes.`,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du code de vérification :', error);
    return res.json({ success: false, message: 'Erreur lors de l\'envoi du code de vérification.' });
  }
});

// Route POST pour vérifier le code et ajouter l'utilisateur à la liste de suppression
router.post('/delete-account/verify-code', async (req, res) => {
  const { email, verificationCode } = req.body;

  try {
    const user = await User.findOne({
      where: {
        email,
        deletetoken: verificationCode,
        deletetokenexpiry: { [Op.gte]: Date.now() },
      },
    });

    if (!user) {
      return res.json({ success: false, message: 'Code de vérification invalide ou expiré.' });
    }

    // Ajouter l'utilisateur à la liste de suppression
    await DeleteList.create({ email: user.email });

    // Supprimer le token de l'utilisateur
    user.deletetoken = null;
    user.deletetokenexpiry = null;
    await user.save();

    return res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la vérification du code de suppression :', error);
    return res.json({ success: false, message: 'Erreur lors de la vérification du code de suppression.' });
  }
});

module.exports = router;

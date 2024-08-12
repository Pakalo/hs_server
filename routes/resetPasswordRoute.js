const express = require('express');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');  // Utilisé pour générer des jetons sécurisés
const User = require('../table/user');
const path = require('path');
const bodyParser = require('body-parser');
const { Op } = require('sequelize');

const router = express.Router();
require('dotenv').config();

// Middleware pour parser les corps de requête en JSON
router.use(bodyParser.urlencoded({ extended: true })); // Ajoute cette ligne pour parser les requêtes URL-encoded
router.use(bodyParser.json()); // Ceci est déjà inclus dans ton code, mais assure-toi qu'il est bien avant les routes.


// Configurer nodemailer
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

// Middleware pour parser les corps de requête en JSON
router.use(bodyParser.json());

// Route GET pour afficher le formulaire de demande de réinitialisation de mot de passe
router.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../html/forgot-password.html'));
});

// Route POST pour traiter la demande de réinitialisation de mot de passe
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.redirect('/error-page');
    }

    // Générer un jeton sécurisé
    const token = crypto.randomBytes(32).toString('hex');

    // Définir la validité du jeton à 1 heure
    const expiryDate = Date.now() + 3600000;

    user.resettoken = token;
    user.resettokenexpiry = expiryDate;
    await user.save();

    // Créer le lien de réinitialisation
    const resetLink = `${req.protocol}://${req.get('host')}/reset-password/${token}`;

    // Envoyer l'e-mail de réinitialisation
    await transporter.sendMail({
      from: `"Support" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      text: `Vous avez demandé une réinitialisation de mot de passe. Cliquez sur le lien suivant pour réinitialiser votre mot de passe : ${resetLink}`,
    });

    return res.redirect('/check-your-email');
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation de mot de passe :', error);
    return res.redirect('/error-page');
  }
});

// Route GET pour afficher le formulaire de réinitialisation de mot de passe
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({
      where: {
        resettoken: token,
        resettokenexpiry: { [Op.gte]: Date.now() },
      },
    });

    if (!user || user.resettokenexpiry < Date.now()) {
      return res.redirect('/error-page');
    }

    res.sendFile(path.join(__dirname, '../html/reset-password.html'));
  } catch (error) {
    console.error('Erreur lors de la vérification du jeton de réinitialisation :', error);
    return res.redirect('/error-page');
  }
});

// Route POST pour traiter la réinitialisation du mot de passe
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  try {
    const user = await User.findOne({
      where: {
        resettoken: token,
        resettokenexpiry: { [Op.gte]: Date.now() },
      },
    });

    if (!user || user.resettokenexpiry < Date.now()) {
      return res.redirect('/error-page');
    }

    if (newPassword !== confirmPassword) {
      return res.redirect('/error-page');
    }

    // Hacher le nouveau mot de passe de manière asynchrone
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour l'utilisateur
    user.password = hashedPassword;
    user.resettoken = null;
    user.resettokenexpiry = null;
    await user.save();

    // Rediriger vers la page de confirmation
    return res.redirect('/password-changed');
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe :', error);
    return res.redirect('/error-page');
  }
});

// Route pour la page de confirmation
router.get('/password-changed', (req, res) => {
  res.sendFile(path.join(__dirname, '../html/password-changed.html'));
});

// Route pour la page d'erreur
router.get('/error-page', (req, res) => {
  res.sendFile(path.join(__dirname, '../html/error-page.html'));
});

// Route pour indiquer à l'utilisateur de vérifier son e-mail
router.get('/check-your-email', (req, res) => {
  res.sendFile(path.join(__dirname, '../html/check-your-email.html'));
});

// Middleware pour servir les fichiers statiques (HTML, CSS, JS, etc.)
router.use(express.static('public'));

module.exports = router;

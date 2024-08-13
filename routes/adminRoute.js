const express = require('express');
const crypto = require('crypto');
const User = require('../table/user');
const DeleteList = require('../table/deleteList');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const router = express.Router();
require('dotenv').config();

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

// Middleware pour vérifier si l'utilisateur est administrateur
function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.isAdmin) {
    return next();
  } else {
    res.status(403).send('Accès interdit');
  }
}

// Appliquer le middleware à toutes les routes du panneau d'administration
router.use('/admin', ensureAdmin);

router.get('/admin', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'createdAt', 'nbGames', 'nbWonGames']
    });

    res.render('admin', { users });  // Utilisation d'un moteur de template comme EJS
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs :', error);
    res.status(500).send('Erreur serveur');
  }
});

router.post('/admin/reset-password/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).send('Utilisateur non trouvé');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 heure

    user.resettoken = resetToken;
    user.resettokenexpiry = resetTokenExpiry;
    await user.save();

    await transporter.sendMail({
      from: `"Support" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      text: `Cliquez sur le lien suivant pour réinitialiser votre mot de passe : ${req.protocol}://${req.get('host')}/reset-password/${resetToken}`
    });

    res.redirect('/admin');
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe :', error);
    res.status(500).send('Erreur serveur');
  }
});

router.post('/admin/delete-account/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).send('Utilisateur non trouvé');
    }

    await DeleteList.create({ email: user.email });

    res.redirect('/admin');
  } catch (error) {
    console.error('Erreur lors de la suppression du compte :', error);
    res.status(500).send('Erreur serveur');
  }
});

module.exports = router;

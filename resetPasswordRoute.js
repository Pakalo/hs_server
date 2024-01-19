const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('./table/user');
const path = require('path');

const router = express.Router();
require('dotenv').config();

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

const { Op } = require('sequelize');

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
      return res.status(400).send('Le lien de réinitialisation du mot de passe est invalide ou a expiré.');
    }

    res.sendFile(path.join(__dirname, '', '/reset-password.html'));
  } catch (error) {
    console.error('Erreur lors de la vérification du jeton de réinitialisation :', error);
    res.status(500).send('Une erreur est survenue lors de la vérification du lien de réinitialisation.');
  }
});

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
      return res.status(400).send('Le lien de réinitialisation du mot de passe est invalide ou a expiré.');
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).send('Les mots de passe ne correspondent pas.');
    }

    // Utilisez l'algorithme MD5 pour hacher le nouveau mot de passe
    const hashedPassword = crypto.createHash('md5').update(newPassword).digest('hex');

    user.password = hashedPassword;
    user.resettoken = null;
    user.resettokenexpiry = null;
    await user.save();

    return res.send('Le mot de passe a été réinitialisé avec succès.');
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe :', error);
    return res.send('Une erreur est survenue lors de la réinitialisation du mot de passe.');
  }
});

router.post('/reset-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    user.resettoken = token;
    user.resettokenexpiry = Date.now() + 14400000; // 4 heures
    await user.save();

    const resetLink = `https://app.hideandstreet.furrball.fr/reset-password/${token}`;
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Réinitialisation du mot de passe',
      text: `Cliquez sur le lien suivant pour réinitialiser votre mot de passe : ${resetLink}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Erreur lors de l\'envoi de l\'e-mail :', error);
        res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'e-mail' });
      } else {
        console.log('E-mail envoyé :', info.response);
        res.json({ message: 'Un e-mail de réinitialisation a été envoyé à votre adresse.' });
      }
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe :', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe' });
  }
});

router.use(express.static('public'));
const bodyParser = require('body-parser'); // Ajoutez cette ligne
router.use(bodyParser.json());

module.exports = router;

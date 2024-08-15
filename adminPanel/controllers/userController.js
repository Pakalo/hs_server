const User = require('../../table/user');
const DeleteList = require('../../table/deleteList');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
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

exports.getUsersWithDeleteFlag = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'createdAt', 'nbGames', 'nbWonGames']
        });

        const deleteList = await DeleteList.findAll();

        const usersWithDeleteFlag = users.map(user => {
            const isInDeleteList = deleteList.some(del => del.email === user.email);
            return { ...user.get({ plain: true }), isInDeleteList };
        });

        res.render('admin', { users: usersWithDeleteFlag });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs :', error);
        res.status(500).send('Erreur serveur');
    }
};

exports.resetPassword = async (req, res) => {
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
};

exports.addToDeleteList = async (req, res) => {
    const { email, addToDeleteList } = req.body;

    try {
        if (addToDeleteList) {
            await DeleteList.create({ email });
        } else {
            await DeleteList.destroy({ where: { email } });
        }
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Erreur lors de la mise à jour de la liste.' });
    }
};

exports.deleteAccount = async (req, res) => {
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
};

const { User } = require('../db/dbSync');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


module.exports = async function resetPassword(data, ws) {
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
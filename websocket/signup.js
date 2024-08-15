const { User } = require('../db/dbSync');
const bcrypt = require('bcryptjs');

module.exports = async function signup(data, ws) {
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
                        const signupData = '{"cmd":"' + data.cmd + '","status":"success"}';

                        mdpCrypte = bcrypt.hashSync(data.hash, 10);

                        // Créer un nouvel utilisateur dans la base de données
                        User.create({
                            email: data.email,
                            username: data.username,
                            password: mdpCrypte,
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
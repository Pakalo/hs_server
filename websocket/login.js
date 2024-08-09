const { User } = require('../db/dbSync');
const bcrypt = require('bcryptjs');

module.exports = async function login(data, ws) {
    // Vérifier si l'email existe
    User.findOne({ where: { email: data.email } })
    .then((user) => {
        // Si l'email existe, user ne sera pas null
        if (user !== null) {
            const mdp_app = data.hash;
            const passwordMatch = bcrypt.compareSync(mdp_app, user.password);
            //console.log("Mot de passe : " + mdp_app + " - " + user.password + " - " + passwordMatch);

            // Vérifier si le mot de passe est correct
            if (passwordMatch == true) {
                // Envoyer le nom d'utilisateur à l'utilisateur et le code de statut est "succes"
                const loginData = '{"email":"' + user.email + '","DateCreation":"' + user.createdAt+ '","userId":"' + user.id + '","nbGames":"' + user.nbGames + '","nbWonGames":"' + user.nbWonGames + '","username":"' + user.username + '","status":"success"}';
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
const { User, Room, userParty } = require('../db/dbSync');
const { sendUpdateToGamePlayers } = require('../fonction/sendUpdateToGamePlayers.js');

module.exports = async function updateSeekerStatus(data, ws) {
    try {
        // Trouver la partie basée sur le code de jeu
        const room = await Room.findOne({ where: { gameCode: data.gameCode } });

        if (room) {
            // Trouver tous les userParties associés à la partie
            const userParties = await userParty.findAll({ where: { gameID: room.id } });

            // Mettre à jour le statut Seeker en fonction des joueurs sélectionnés
            await Promise.all(userParties.map(async (userParty) => {
                const user = await User.findOne({ where: { id: userParty.UserId } });
                if (user && data.selectedPlayers.includes(user.username)) {
                    // Si le pseudo de l'utilisateur est dans la liste des joueurs sélectionnés, définissez Seeker à true
                    await userParty.update({ Seeker: true });
                } else {
                    // Sinon, définissez Seeker à false
                    await userParty.update({ Seeker: false });
                }
            }));

            sendUpdateToGamePlayers(data.gameCode, '{"cmd":"seekerStatusUpdated","selectedPlayers":' + JSON.stringify(data.selectedPlayers) + '}');
            // Envoyer une réponse de succès au client
            ws.send('{"cmd":"' + data.cmd + '","status":"success"}');
        } else {
            // Envoyer une réponse d'erreur si la partie n'est pas trouvée
            ws.send('{"cmd":"' + data.cmd + '","status":"error","message":"Room not found"}');
        }
    } catch (error) {
        console.error('Error updating Seeker status:', error);
        // Envoyer une réponse d'erreur
        ws.send('{"cmd":"' + data.cmd + '","status":"error","message":"Internal server error"}');
    }
}
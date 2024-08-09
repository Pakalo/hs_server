const { and, where } = require('sequelize');
const {User, userParty} = require('../db/dbSync');

module.exports = async function leaveGame(data, ws){
    try {
        // Trouver l'utilisateur basé sur l'id
        const userEntry = await User.findOne({
            where: { id: data.playerId }
        });


        if (userEntry) {
            //Supprimer l'entrée de la table userParty
            const userPartyEntry = await userParty.findAll({
                where: {UserId: data.playerId}
            });

            if(userPartyEntry){
                for(let i = 0; i < userPartyEntry.length; i++){
                    await userPartyEntry[i].destroy();
                }
            }


    
            // Envoyer une réponse de succès au client
            ws.send(JSON.stringify({ cmd: data.cmd, status: 'success', message: 'Player leaved the game ' }));
        }
        else {
            // Envoyer une réponse d'erreur si l'entrée de l'utilisateur n'est pas trouvée
            ws.send(JSON.stringify({ cmd: data.cmd, status: 'error', message: 'Player not found' }));
        }

    }catch (error) {
        console.error("Failed disconnect the player for ID:", data.playerId, error);

    }
}
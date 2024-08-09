// Ajouter une partie jouée pour un id
const { User} = require('../db/dbSync');

module.exports = async function addPlayedGameForId(data, ws){
    try {
        // Trouver l'utilisateur basé sur l'id
        const userEntry = await User.findOne({
            where: { id: data.playerId }
        });

        if (userEntry) {
            // Incrémenter le nombre de parties jouées
            userEntry.nbGames += 1;
            await userEntry.save();
    
            // Envoyer une réponse de succès au client
            ws.send(JSON.stringify({ cmd: data.cmd, status: 'success', message: 'Game count updated' }));
        }
        else {
            // Envoyer une réponse d'erreur si l'entrée de l'utilisateur n'est pas trouvée
            ws.send(JSON.stringify({ cmd: data.cmd, status: 'error', message: 'Player not found' }));
        }

    }catch (error) {
        console.error("Failed to add played game for ID:", data.playerId, error);

    }
}

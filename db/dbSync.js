const User = require('../table/user'); // Importer le modèle User depuis le fichier existant
const Room = require('../table/room'); // Importer le modèle Room depuis le fichier existant
const userParty = require('../table/userParty'); // Importer le modèle userParty depuis le fichier existant


function dbSync() {
    User.sync()
    .then(() => {
        console.log('✅ Model USER bien synchronisé');
    })
    .catch((error) => {
        console.error('❌ ERREUR syncro model user: ', error);
    });

    Room.sync({ alter: true })
  .then(() => {
    console.log('✅ Model ROOM bien synchronisé')
  })
  .catch((error) => {
    console.error('❌ ERREUR syncro model room: ', error);
  });

userParty.sync({ alter: true })
  .then(() => {
    console.log('✅ Model USERPARTY bien synchronisé');
  })
  .catch((error) => {
    console.error('❌ ERREUR syncro model userParty: ', error);
  });

}

module.exports = dbSync;
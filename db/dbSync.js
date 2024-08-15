const User = require('../table/user');
const Room = require('../table/room');
const userParty = require('../table/userParty');
const DeleteList = require('../table/deleteList');

async function dbSync() {
  try {
    await User.sync({ alter: true });  // Utiliser alter pour mettre à jour le schéma sans perdre de données
    console.log('🆗 Model User has been synchronized');

    await Room.sync({ alter: true });
    console.log('🆗 Model Room has been synchronized');

    await userParty.sync({ alter: true });
    console.log('🆗 Model userParty has been synchronized');

    await DeleteList.sync({ alter: true });
    console.log('🆗 Model DeleteList has been synchronized');
  } catch (error) {
    console.error('❌ Error synchronizing models:', error);
    throw error;
  }
}

module.exports = {
  dbSync,
  User,
  Room,
  userParty,
  DeleteList,
};

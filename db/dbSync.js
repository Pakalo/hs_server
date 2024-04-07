const User = require('../table/user');
const Room = require('../table/room');
const userParty = require('../table/userParty');

async function dbSync() {
  try {
    // Sync with force flag for initial setup or changes to model definitions
    await User.sync({ force: false }); // Adjust force based on your requirements
    console.log('🆗 Model User has been synchronized');

    // Sync Room with alter for table schema updates
    await Room.sync({ alter: true });
    console.log('🆗 Model Room has been synchronized');

    // Sync userParty with alter for table schema updates
    await userParty.sync({ alter: true });
    console.log('🆗 Model userParty has been synchronized');
  } catch (error) {
    console.error('❌ Error synchronizing models:', error);
    throw error; // Re-throw to allow handling in other parts of your application
  }
}

module.exports = {
  dbSync,
  User, // Export other models if needed
  Room,
  userParty,
};

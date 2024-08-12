const cron = require('node-cron');
const User = require('../table/user');
const DeleteList = require('../table/deleteList');

cron.schedule('0 4 * * *', async () => {
  console.log('Début de la suppression des comptes à 4h du matin');

  try {
    const deleteEntries = await DeleteList.findAll();
    const emailsToDelete = deleteEntries.map(entry => entry.email);

    await User.destroy({
      where: {
        email: emailsToDelete,
      },
    });

    console.log(`Comptes supprimés : ${emailsToDelete.length}`);

    // Vider la liste de suppression
    await DeleteList.destroy({ where: {}, truncate: true });

    console.log('Fin de la suppression des comptes.');
  } catch (error) {
    console.error('Erreur lors de la suppression des comptes :', error);
  }
});

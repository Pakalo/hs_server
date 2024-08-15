const User = require('../../table/user');

exports.getAdminsAndUsers = async (req, res) => {
    try {
        const admins = await User.findAll({ where: { isAdmin: true } });
        const nonAdmins = await User.findAll({ where: { isAdmin: false } });
        res.render('gestionRoles', { admins, nonAdmins });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs :', error);
        res.status(500).send('Erreur serveur');
    }
};


exports.promoteToAdmin = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (user) {
            user.isAdmin = true; // Utiliser isAdmin
            await user.save();
        }
        res.redirect('/admin/gestion-des-roles');
    } catch (error) {
        console.error('Erreur lors de la promotion :', error);
        res.status(500).send('Erreur serveur');
    }
};

exports.demoteToUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (user) {
            user.isAdmin = false; // Utiliser isAdmin
            await user.save();
        }
        res.redirect('/admin/gestion-des-roles');
    } catch (error) {
        console.error('Erreur lors de la rétrogradation :', error);
        res.status(500).send('Erreur serveur');
    }
};


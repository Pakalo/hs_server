function ensureAdmin(req, res, next) {
    if (req.user && req.user.isAdmin) {
      return next();  // L'utilisateur est un administrateur, on passe à la route suivante
    } else {
      res.status(403).send('Accès interdit : vous n\'avez pas les permissions nécessaires pour accéder à cette page.');
    }
  }
  
  module.exports = ensureAdmin;
  
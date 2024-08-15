module.exports = function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.isAdmin) {
      return next();
  } else {
      res.status(403).send('Accès interdit');
  }
};

const express = require('express');
const passport = require('passport');
const router = express.Router();

// Route pour afficher la page de connexion
router.get('/login', (req, res) => {
  res.render('login');
});

// Route pour gérer la connexion
router.post('/login', passport.authenticate('local', {
  successRedirect: '/admin',
  failureRedirect: '/login',
  failureFlash: false  // Utilisez connect-flash si vous voulez afficher des messages d'erreur
}));

// Route pour gérer la déconnexion
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Erreur lors de la déconnexion:', err);
      return res.redirect('/admin');
    }
    res.redirect('/login');
  });
});

module.exports = router;

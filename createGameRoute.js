const express = require('express');
const router = express.Router();
const Room = require('./table/room');
const crypto = require('crypto');

router.post('/createGame', async (req, res) => {
  try {
    const { radius, creatorId, center, duration } = req.body;

    // Générez le code de partie aléatoire (utilisez la fonction exportée de generateGameCode.js)
    const gameCode = require('./generateGameCode')();

    // Créez une nouvelle partie dans la base de données
    const newRoom = await Room.create({
      radius,
      creatorId,
      center,
      duration,
      gameCode,
    });

    res.status(201).json({ success: true, room: newRoom });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

module.exports = router;

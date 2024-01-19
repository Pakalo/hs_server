const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize.js'); // Assurez-vous d'importer votre instance sequelize appropriée

const Room = sequelize.define('Room', {
  radius: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  creatorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  center: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  gameCode: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
    timestamps: true,
    modelName: 'Room',
    tableName: 'rooms'
  
});


module.exports = Room;

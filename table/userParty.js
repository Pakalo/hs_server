const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize.js'); // Assurez-vous d'importer votre instance sequelize appropriée

const userParty = sequelize.define('userParty', {
  UserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  Seeker: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  Position: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  gameID: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
    timestamps: true,
    modelName: 'userParty',
    tableName: 'userPartys'
  
});


module.exports = userParty;

const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const DeleteList = sequelize.define('DeleteList', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  timestamps: true,
  tableName: 'delete_list',
});

module.exports = DeleteList;

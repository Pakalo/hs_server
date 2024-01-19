const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');  // Update the import path

const User = sequelize.define('User', {
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    resettoken: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    resettokenexpiry: {
        type: DataTypes.DATE,
        allowNull: true,
    }
}, {
    timestamps: true,
    modelName: 'User',
    tableName: 'users'
});

module.exports = User;

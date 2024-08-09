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
    },
    deletetoken: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    deletetokenexpiry: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    nbGames: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    nbWonGames: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    timestamps: true,
    modelName: 'User',
    tableName: 'users'
});

module.exports = User;

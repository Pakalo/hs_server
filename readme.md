# Accès au Serveur par SSH

Pour accéder au serveur par SSH, utilisez les informations suivantes :

- **IP :** 185.255.112.165
- **Port :** 22
- **Username :** jury
- **Mot de passe :** Soutenance2024

# Répertoire du Serveur

Le serveur se trouve dans le répertoire `/home/node/hs_serveur`.

# Console du Serveur

Pour afficher la console du serveur, utilisez la commande suivante :
````
screen -X hs_serveur
````


Pour quitter la console, appuyez sur CTRL+A puis sur la touche D.

### Gestion du Serveur

Arrêter le Serveur : Utilisez CTRL+C.

Redémarrer le Serveur : Utilisez la commande sudo node index.js.

### Accès à la Base de Données (PostgreSQL)

Utilisez les informations suivantes pour accéder à la base de données (PostgreSQL) :

```
DB_HOST : 193.38.250.113
DB_PORT : 5432
DB_USER : admin
```
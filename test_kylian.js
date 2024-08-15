const bcrypt = require('bcryptjs');


const password = "test"


const hashedPassword = bcrypt.hashSync(password, 10);
const compare = bcrypt.compareSync(password, hashedPassword);

console.log("Le mot de passe pour --> " + password + " : "+ hashedPassword);
console.log("Comparaison : " + compare);
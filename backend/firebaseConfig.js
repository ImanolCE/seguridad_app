const admin = require("firebase-admin");

// clave de servicio de Firebase 
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://console.firebase.google.com/project/seguridad-c9b92/firestore/databases/-default-/data/~2Froles~2F2?hl=es-419" // Reemplázalo con tu URL de Firebase
});

const db = admin.firestore();

module.exports = { admin, db };

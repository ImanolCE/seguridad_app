const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const PORT = 5000;
const SECRET_KEY = "s de seguro";

const { admin, db } = require("./firebaseConfig");
const bcrypt = require("bcrypt");


app.use(express.json());
app.use(cors());

// Usuarios hardcodeados
const users = [
  { username: "imanol", password: "12345" },
  { username: "pogo", password: "67890" }
];


// Endpoint de registro
app.post("/register", async (req, res) => {
    const { email, username, password, role } = req.body;
  
    if (!email || !username || !password || !role) {
      return res.status(400).json({ statusCode: 400, message: "Todos los campos son obligatorios" });
    }
  
    try {
      // Verificar si el usuario ya existe en Firebase
      const userSnapshot = await db.collection("users").where("email", "==", email).get();
      if (!userSnapshot.empty) {
        return res.status(400).json({ statusCode: 400, message: "El usuario ya existe" });
      }
  
      // Cifrar la contraseña antes de guardarla
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Guardar en Firebase
      await db.collection("users").add({
        email,
        username,
        password: hashedPassword,
        role,
        date_register: admin.firestore.Timestamp.now(),
        last_login: null
      });
  
      res.json({ statusCode: 201, message: "Usuario registrado correctamente" });
    } catch (error) {
      console.error("Error en el registro:", error);
      res.status(500).json({ statusCode: 500, message: "Error interno del servidor" });
    }
  });
  

// Endpoint de login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ statusCode: 400, message: "Campos requeridos" });
    }
  
    try {
      // Buscar usuario en Firebase
      const userSnapshot = await db.collection("users").where("email", "==", email).get();
  
      if (userSnapshot.empty) {
        return res.status(401).json({ statusCode: 401, message: "Credenciales incorrectas" });
      }
  
      const userData = userSnapshot.docs[0].data();
  
      // Verificar la contraseña
      const isMatch = await bcrypt.compare(password, userData.password);
      if (!isMatch) {
        return res.status(401).json({ statusCode: 401, message: "Credenciales incorrectas" });
      }
  
      // Actualizar el último login
      await db.collection("users").doc(userSnapshot.docs[0].id).update({
        last_login: admin.firestore.Timestamp.now()
      });
  
      // Generar token JWT válido por 1 hora
      const token = jwt.sign({ email, role: userData.role }, SECRET_KEY, { expiresIn: "1m" });
  
      res.json({
        statusCode: 200,
        intDataMessage: [{ credentials: token }]
      });
    } catch (error) {
      console.error("Error en el login:", error);
      res.status(500).json({ statusCode: 500, message: "Error interno del servidor" });
    }
  });
  


app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

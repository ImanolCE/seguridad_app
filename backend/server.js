const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const PORT = 5000;
const SECRET_KEY = "s de seguro";

app.use(express.json());
app.use(cors());

// Usuarios hardcodeados
const users = [
  { username: "imanol", password: "12345" },
  { username: "pogo", password: "67890" }
];

// Endpoint de login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ statusCode: 400, message: "Campos requeridos" });
  }

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ statusCode: 401, message: "Credenciales incorrectas" });
  }

  // Generar token JWT que expira en 1 minuto
  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1m" });

  res.json({
    statusCode: 200,
    intDataMessage: [{ credentials: token }]
  });
});

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

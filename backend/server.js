const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const router = express.Router();

const app = express();
const PORT = 5000;
const SECRET_KEY = "s de seguro";

const { admin, db } = require("./firebaseConfig");
const bcrypt = require("bcrypt");

app.use(express.json());
app.use(cors());

// Definir permisos para cada rol
const ROLE_PERMISSIONS = {
    admin: ["get_user", "delete_user", "update_user", "create_roles", "delete_roles", "assign_roles"],
    common_user: ["get_user", "update_user"]
};

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

        // Obtener los permisos basados en el rol del usuario
        const permissions = ROLE_PERMISSIONS[userData.role] || [];

        // Generar token JWT válido por 1 hora
        const token = jwt.sign(
            {
                email,
                role: userData.role,
                permissions,
                time_expiration: Math.floor(Date.now() / 1000) + 3600 // Expira en 1 hora
            },
            SECRET_KEY,
            { expiresIn: "1h" }
        );

        res.json({
            statusCode: 200,
            intDataMessage: [{ credentials: token }]
        });

    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).json({ statusCode: 500, message: "Error interno del servidor" });
    }
});

// Middleware para verificar el token JWT
const authenticateToken = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];
    if (!token) return res.status(401).json({ message: 'Acceso denegado' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token inválido' });
        req.user = user;
        next();
    });
};

// Middleware para verificar permisos específicos
const authorizePermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.user.permissions.includes(requiredPermission)) {
            return res.status(403).json({ message: 'No tienes permisos para esta acción' });
        }
        next();
    };
};

// Rutas para usuarios
router.get('/get_user', authenticateToken, authorizePermission('get_user'), async (req, res) => {
    try {
        const usersSnapshot = await db.collection("users").get();
        if (usersSnapshot.empty) {
            return res.status(404).json({ message: "No hay usuarios registrados" });
        }

        const users = usersSnapshot.docs.map(doc => {
            let user = doc.data();
            delete user.password;
            return user;
        });

        res.json({ users });
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});
router.delete('/delete_user/:id', authenticateToken, authorizePermission("deleteUsers"), async (req, res) => {
    res.json({ message: 'Usuario eliminado' });
});

router.put('/update_user/:id', authenticateToken, authorizePermission("updateUsers"), async (req, res) => {
    res.json({ message: 'Usuario actualizado' });
});

router.put('/update_rol/:id/role', authenticateToken, authorizePermission("updateRol"), async (req, res) => {
    res.json({ message: 'Rol actualizado' });
});

router.post('/add_rol', authenticateToken, authorizePermission("addRol"), async (req, res) => {
    res.json({ message: 'Rol agregado' });
});

router.delete('/delete_rol/:id', authenticateToken, authorizePermission("deleteRol"), async (req, res) => {
    res.json({ message: 'Rol eliminado' });
});

router.post('/add_permissions', authenticateToken, authorizePermission("addPermission"), async (req, res) => {
    res.json({ message: 'Permiso agregado' });
});

router.delete('/delete_permissions/:id', authenticateToken, authorizePermission("deletePermission"), async (req, res) => {
    res.json({ message: 'Permiso eliminado' });
});
 



// Usar las rutas en la app
app.use("/api", router);

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

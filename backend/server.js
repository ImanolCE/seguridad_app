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
    admin: ["get_user", "add_user","delete_user", "update_user", "add_permissions","delete_permissions","update_permissions","add_rol", "update_rol","delete_rol"],
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


router.post('/add_user', authenticateToken, authorizePermission("add_user"), async (req, res) => {
    const { email, password, username, role } = req.body;

    // Validar que se hayan proporcionado todos los campos requeridos
    if (!email || !password || !username || !role) {
        return res.status(400).json({ message: "Todos los campos son requeridos" });
    }

    // Validar el rol, debe ser admin o common_user
    if (role !== 'admin' && role !== 'common_user') {
        return res.status(400).json({ message: "Rol inválido. Debe ser 'admin' o 'common_user'" });
    }

    try {
        // Verificar si el correo ya está registrado
        const userSnapshot = await db.collection("users").where("email", "==", email).get();
        if (!userSnapshot.empty) {
            return res.status(400).json({ message: "El correo electrónico ya está registrado" });
        }

        // Encriptar la contraseña antes de guardarla
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear el objeto del nuevo usuario
        const newUser = {
            email,
            password: hashedPassword,
            username,
            role: role, // El rol elegido por el usuario
            date_register: new Date(), // Marca de tiempo de registro
            last_login: null, // No tiene último acceso al principio
            
        };

        // Agregar el usuario a la colección 'users' en Firestore
        const userRef = await db.collection("users").add(newUser);

        // Devolver una respuesta exitosa
        res.status(201).json({
            message: "Usuario creado exitosamente",
            userId: userRef.id
        });
    } catch (error) {
        console.error("Error al agregar usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});



router.delete('/delete_permissions/:role', authenticateToken, authorizePermission("delete_permissions"), async (req, res) => {
    const { role } = req.params;
    const { permission } = req.body; // Permiso a eliminar

    if (!permission) {
        return res.status(400).json({ message: 'El campo "permission" es obligatorio' });
    }

    try {
        // Buscar el rol en la colección "roles" basado en el campo "role"
        const rolesSnapshot = await db.collection('roles').where('role', '==', role).get();

        if (rolesSnapshot.empty) {
            return res.status(404).json({ message: `El rol "${role}" no existe` });
        }

        // Obtener el ID del documento del rol encontrado
        const roleDoc = rolesSnapshot.docs[0];
        const roleRef = db.collection('roles').doc(roleDoc.id);
        const roleData = roleDoc.data();

        // Obtener permisos actuales del rol
        const currentPermissions = roleData.permissions || [];

        // Verificar si el permiso existe en el rol
        if (!currentPermissions.includes(permission)) {
            return res.status(400).json({ message: `El permiso "${permission}" no está asignado al rol "${role}"` });
        }

        // Eliminar el permiso de la lista
        const updatedPermissions = currentPermissions.filter(perm => perm !== permission);

        // Actualizar el documento en Firestore
        await roleRef.update({ permissions: updatedPermissions });

        res.json({ message: `Permiso "${permission}" eliminado del rol "${role}" correctamente` });
    } catch (error) {
        console.error("Error al eliminar permiso:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});



// Endpoint para actualizar usuario
router.put('/update_user/:id', authenticateToken, authorizePermission("update_user"), async (req, res) => {
    const { id } = req.params;
    const { username, email, password, role } = req.body; // Campos a actualizar

    try {
        // Referencia al usuario
        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();

        // Verificar si el usuario existe
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Si el password es proporcionado, encriptarlo antes de actualizar
        let updateData = { email, role }; // Campos a actualizar

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10); // Encriptar la nueva contraseña
            updateData.password = hashedPassword; // Agregar la contraseña encriptada a los datos a actualizar
        }

        // Actualizar los datos del usuario
        await userRef.update({
            ...updateData,
            last_login: new Date(), // Actualizar la fecha del último login (opcional)
        });

        res.json({ message: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});


// Ruta para agregar un nuevo rol
router.post('/add_rol', authenticateToken, authorizePermission("add_rol"), async (req, res) => {
    const { role } = req.body;  // El rol a agregar

    // Validar que el rol esté presente
    if (!role) {
        return res.status(400).json({ message: 'El campo "role" es obligatorio' });
    }

    try {
        // Verificar si el rol ya existe en la base de datos
        const roleRef = db.collection("roles").doc(role); // Usamos el nombre del rol como ID
        const roleDoc = await roleRef.get();

        if (roleDoc.exists) {
            return res.status(400).json({ message: 'Este rol ya existe' });
        }

        // Si el rol no existe, creamos un nuevo documento con el nombre del rol
        await roleRef.set({
            permissions: [], // Inicialmente vacío
            date_created: new Date()
        });

        res.status(200).json({ message: `Rol "${role}" agregado correctamente` });
    } catch (error) {
        console.error("Error al agregar rol:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});




router.put('/update_rol/:oldRole', authenticateToken, authorizePermission("update_rol"), async (req, res) => {
    const { oldRole } = req.params; // Nombre del rol actual
    const { newRole } = req.body;   // Nuevo nombre del rol

    // Validar que el nuevo rol esté presente
    if (!newRole) {
        return res.status(400).json({ message: 'El campo "newRole" es obligatorio' });
    }

    try {
        const oldRoleRef = db.collection("roles").doc(oldRole);
        const oldRoleDoc = await oldRoleRef.get();

        if (!oldRoleDoc.exists) {
            return res.status(404).json({ message: 'El rol no existe' });
        }

        // Verificar si el nuevo rol ya existe
        const newRoleRef = db.collection("roles").doc(newRole);
        const newRoleDoc = await newRoleRef.get();

        if (newRoleDoc.exists) {
            return res.status(400).json({ message: 'El nuevo rol ya existe' });
        }

        // Obtener datos del rol actual
        const roleData = oldRoleDoc.data();

        // Crear el nuevo documento con los mismos datos pero con el nuevo nombre
        await newRoleRef.set({
            permissions: roleData.permissions || [],
            date_created: roleData.date_created
        });

        // Eliminar el documento con el nombre antiguo
        await oldRoleRef.delete();

        res.status(200).json({ message: `Rol "${oldRole}" renombrado a "${newRole}" correctamente` });
    } catch (error) {
        console.error("Error al actualizar rol:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});



// Ruta para eliminar un rol
router.delete('/delete_rol/:role', authenticateToken, authorizePermission("delete_rol"), async (req, res) => {
    const { role } = req.params; // Nombre del rol a eliminar

    try {
        const roleRef = db.collection("roles").doc(role);
        const roleDoc = await roleRef.get();

        if (!roleDoc.exists) {
            return res.status(404).json({ message: 'El rol no existe' });
        }

        // Eliminar el documento
        await roleRef.delete();

        res.status(200).json({ message: `Rol "${role}" eliminado correctamente` });
    } catch (error) {
        console.error("Error al eliminar rol:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});



// Ruta para agregar un permiso a un rol existente
router.post('/add_permissions', authenticateToken, authorizePermission("add_permissions"), async (req, res) => {
    const { roleId, permission } = req.body;  // roleId = ID del rol, permission = el permiso que quieres agregar

    if (!roleId || !permission) {
        return res.status(400).json({ message: 'El rol y el permiso son obligatorios' });
    }

    try {
        const roleRef = db.collection('roles').doc(roleId);  // Referencia al rol existente
        const roleDoc = await roleRef.get();

        if (!roleDoc.exists) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }

        // Obtener los permisos actuales del rol
        const currentPermissions = roleDoc.data().permissions || [];

        // Verificar si el permiso ya está agregado
        if (currentPermissions.includes(permission)) {
            return res.status(400).json({ message: 'Este permiso ya está agregado a este rol' });
        }

        // Agregar el permiso al array de permisos del rol
        await roleRef.update({
            permissions: [...currentPermissions, permission]  // Añadir el nuevo permiso al array de permisos
        });

        res.status(200).json({ message: `Permiso "${permission}" agregado correctamente al rol` });
    } catch (error) {
        console.error("Error al agregar permiso:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});


router.delete('/delete_permissions/:role', authenticateToken, authorizePermission("delete_permissions"), async (req, res) => {
    const { role } = req.params;
    const { permission } = req.body; // Permiso a eliminar

    if (!permission) {
        return res.status(400).json({ message: 'El campo "permission" es obligatorio' });
    }

    try {
        // Obtener referencia al documento del rol
        const roleRef = db.collection('roles').doc(role);
        const roleDoc = await roleRef.get();

        // Verificar si el rol existe
        if (!roleDoc.exists) {
            return res.status(404).json({ message: `El rol "${role}" no existe` });
        }

        // Obtener permisos actuales del rol
        const roleData = roleDoc.data();
        const currentPermissions = roleData.permissions || [];

        // Verificar si el permiso existe en el rol
        if (!currentPermissions.includes(permission)) {
            return res.status(400).json({ message: `El permiso "${permission}" no está asignado al rol "${role}"` });
        }

        // Eliminar el permiso de la lista
        const updatedPermissions = currentPermissions.filter(perm => perm !== permission);

        // Actualizar el documento en Firestore
        await roleRef.update({ permissions: updatedPermissions });

        res.json({ message: `Permiso "${permission}" eliminado del rol "${role}" correctamente` });
    } catch (error) {
        console.error("Error al eliminar permiso:", error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});




// Usar las rutas en la app
app.use("/api", router);

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/register", { email, username, password, role });

      if (response.data.statusCode === 201) {
        alert("Usuario registrado correctamente");
        navigate("/");  // Redirigir al login después del registro
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      alert("Error al registrar usuario");
    }
  };

  return (
    <div>
      <h2>Registro</h2>
      <form onSubmit={handleRegister}>
        <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="text" placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input type="text" placeholder="Rol (admin/comum_user)" value={role} onChange={(e) => setRole(e.target.value)} />
        <button type="submit">Registrar</button>
      </form>
    </div>
  );
};

export default Register;

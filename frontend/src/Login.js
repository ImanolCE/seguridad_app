import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setemail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/login", { email, password });

      if (response.data.statusCode === 200) {
        localStorage.setItem("token", response.data.intDataMessage[0].credentials);
        navigate("/home");
      } else {
        alert("Credenciales incorrectas");
      }
    } catch (error) {
      alert("Error al iniciar sesión");
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input type="text" placeholder="Correox" value={email} onChange={(e) => setemail(e.target.value)} />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Iniciar sesión</button>
      </form>

        {/* Botón para ir a la página de registro */}
      <p>¿Registrarse?</p>
      <button onClick={() => navigate("/register")}>Registrarse</button>

    </div>
  );
};

export default Login;

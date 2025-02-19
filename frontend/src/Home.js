import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Debes iniciar sesión para acceder a esta página");
        navigate("/"); // Redirige al login
        return;
      }

      try {
        const decodedToken = jwtDecode(token);
        const currentTime = Math.floor(Date.now() / 1000); // Tiempo actual en segundos

        if (decodedToken.exp < currentTime) {
          alert("La sesión ha expirado. Inicia sesión nuevamente.");
          localStorage.removeItem("token");
          navigate("/"); // Redirige al login
        }
      } catch (error) {
        console.error("Error decodificando el token:", error);
        localStorage.removeItem("token");
        navigate("/"); // Redirige al login
      }
    };
        // Verificar cada 5 segundos si el token ha expirado
        const interval = setInterval(checkAuth, 5000);

        return () => clearInterval(interval); // Limpiar intervalo al salir de la página
  }, [navigate]);

  return (
    <div>
      <h2>Bienvenido a Home</h2>
      <button
        onClick={() => {
          localStorage.removeItem("token");
          navigate("/");
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
};

export default Home;

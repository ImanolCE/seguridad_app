import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("La sesión ha expirado");
        navigate("/");
        return;
      }

      try {
        const decodedToken = jwtDecode(token);
        const currentTime = Math.floor(Date.now() / 1000); // Tiempo actual en segundos

        if (decodedToken.exp < currentTime) {
          alert("La sesión ha expirado");
          localStorage.removeItem("token");
          navigate("/");
        }
      } catch (error) {
        console.error("Error decodificando el token:", error);
        localStorage.removeItem("token");
        navigate("/");
      }
    };

    // Verificar cada 5 segundos si el token expiró
    const interval = setInterval(checkTokenExpiration, 5000);
    
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div>
      <h2>Bienvenido a Home</h2>
      <button onClick={() => {
        localStorage.removeItem("token");
        navigate("/");
      }}>
        Cerrar sesión
      </button>
    </div>
  );
};

export default Home;

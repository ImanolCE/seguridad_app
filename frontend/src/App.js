import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Register from "./Register"; // Nueva vista de registro
import Home from "./Home";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} /> {/* Ruta para el registro */}
        <Route path="/home" element={<Home />} />
      </Routes>
    </Router>
  );
};

export default App;

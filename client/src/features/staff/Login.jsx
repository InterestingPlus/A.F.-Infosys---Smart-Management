import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../config/AuthContext";
import "./Login.scss";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h2 className="brand">A.F. Infosys</h2>
        <h1 className="title">Login</h1>

        <form className="form" onSubmit={handleLogin}>
          <input
            className="input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
          <input
            className="input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
          <button className="btn" type="submit">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

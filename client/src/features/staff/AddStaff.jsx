// src/pages/AddStaff.jsx
import React, { useState } from "react";
import axios from "axios";
import apiPath from "../../isProduction";

import "./Login.scss";
import { useNavigate } from "react-router-dom";

const AddStaff = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "tellecaller",
  });

  const navigate = useNavigate();

  const [status, setStatus] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    try {
      const res = await axios.post(
        `${await apiPath()}/api/auth/register`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setStatus("✅ Staff Registered Successfully!");
      setFormData({ name: "", email: "", password: "", role: "surveyor" });

      navigate("/staff");
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong.";
      setStatus(`❌ ${msg}`);
    }
  };

  return (
    <div className="register-page">
      <div className="register-box">
        <h2 className="brand">A.F. Infosys</h2>
        <h1 className="title">Add Staff - Register</h1>

        <form onSubmit={handleSubmit} className="form">
          <input
            placeholder="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input"
            required
          />
          <input
            placeholder="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="input"
            required
          />
          <input
            placeholder="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            className="input"
            required
          />
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            children
            className="input"
          >
            <option value="telecaller">Telecaller</option>
            <option value="surveyor">Surveyor</option>
            <option value="accountant">Accountant</option>
            <option value="operator">Operator</option>
          </select>
          <button type="submit" className="btn">
            Add Staff
          </button>

          <button
            type="button"
            className="btn view-btn"
            onClick={() => {
              navigate("/staff");
            }}
          >
            View All Staff
          </button>
        </form>

        <br />
        {status && <p className="status">{status}</p>}
      </div>
    </div>
  );
};

export default AddStaff;

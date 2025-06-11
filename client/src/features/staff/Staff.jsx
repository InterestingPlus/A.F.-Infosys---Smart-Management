import React from "react";
import { useNavigate } from "react-router-dom";

const Staff = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h2>All Staff</h2>

      <button
        onClick={() => {
          navigate("/staff/add");
        }}
      >
        Add Staff
      </button>
    </div>
  );
};

export default Staff;

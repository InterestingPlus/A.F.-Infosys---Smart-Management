import React from "react";
import LeadTable from "./LeadTable";
import { useNavigate } from "react-router-dom";
import "./LeadDashboard.scss";

export default function LeadDashboard() {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
      <LeadTable />

      <br />
      <div className="flex justify-between items-center mb-4">
        <button className="add-btn" onClick={() => navigate("/leads/form")}>
          Lead Inquiry Form
        </button>
      </div>
    </div>
  );
}

import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import "./DashboardLayout.scss";

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      {/* Hamburger for Mobile */}
      <div
        className={`hamburger ${isSidebarOpen ? "open" : ""}`}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <span />
        <span />
        <span />
      </div>

      {/* Sidebar */}
      <aside className={isSidebarOpen ? "open" : ""}>
        <div className="navigation">
          <h1 className="text-2xl font-bold mb-6">A.F. Infosys</h1>
          <nav className="flex flex-col gap-4">
            <NavLink
              to="/leads"
              className="hover:underline"
              onClick={() => setIsSidebarOpen(false)}
            >
              Lead Inquiry
            </NavLink>
            <NavLink
              to="/customers"
              className="hover:underline"
              onClick={() => setIsSidebarOpen(false)}
            >
              Customer List
            </NavLink>
            <NavLink
              to="/orders"
              className="hover:underline"
              onClick={() => setIsSidebarOpen(false)}
            >
              Order Valuation
            </NavLink>
          </nav>
        </div>
        <div className="profile">
          <div className="profile-image">
            <img
              src="data:image/png;base64,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"
              alt="Avatar"
              className="avatar"
            />
            <p>Jatin Poriya</p>
          </div>
          <button>Logout</button>
        </div>
      </aside>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

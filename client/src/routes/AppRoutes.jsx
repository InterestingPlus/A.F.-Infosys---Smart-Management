import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import LeadDashboard from "../features/leads/LeadDashboard";
import CustomerList from "../features/customers/CustomerList";
import OrderValuation from "../features/orders/OrderValuation";
import LeadForm from "../features/leads/LeadForm";
import LeadEdit from "../features/leads/LeadEdit";

import ProtectedRoute from "./ProtectedRoute";
import Login from "../features/staff/Login";
import Staff from "../features/staff/Staff";
import AddStaff from "../features/staff/AddStaff";

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute
            allowedRoles={[
              "owner",
              "accountant",
              "operator",
              "surveyor",
              "telecaller",
            ]}
          >
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<LeadForm />} />
        <Route path="/leads/report" element={<LeadDashboard />} />
        <Route path="/leads/form" element={<LeadForm />} />
        <Route path="/leads/edit/:id" element={<LeadEdit />} />

        <Route path="/customers" element={<CustomerList />} />
        <Route path="/orders" element={<OrderValuation />} />

        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <Staff />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/add"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <AddStaff />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

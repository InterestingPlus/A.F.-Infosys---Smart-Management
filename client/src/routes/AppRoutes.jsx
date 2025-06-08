import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import LeadDashboard from "../features/leads/LeadDashboard";
import CustomerList from "../features/customers/CustomerList";
import OrderValuation from "../features/orders/OrderValuation";
import LeadForm from "../features/leads/LeadForm";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<LeadDashboard />} />
        <Route path="/leads" element={<LeadDashboard />} />
        <Route path="/leads/new" element={<LeadForm />} />
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/orders" element={<OrderValuation />} />
      </Route>
    </Routes>
  );
}

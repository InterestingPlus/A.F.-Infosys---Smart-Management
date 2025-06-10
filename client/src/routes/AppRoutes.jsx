import { Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import LeadDashboard from "../features/leads/LeadDashboard";
import CustomerList from "../features/customers/CustomerList";
import OrderValuation from "../features/orders/OrderValuation";
import LeadForm from "../features/leads/LeadForm";
import LeadEdit from "../features/leads/LeadEdit";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<LeadForm />} />
        <Route path="/leads/report" element={<LeadDashboard />} />
        <Route path="/leads/form" element={<LeadForm />} />
        <Route path="/leads/edit/:id" element={<LeadEdit />} />
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/orders" element={<OrderValuation />} />
      </Route>
    </Routes>
  );
}

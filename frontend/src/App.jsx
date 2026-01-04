import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

// Layouts
import MasterLayout from './layouts/MasterLayout';
import StaffLayout from './layouts/StaffLayout';
import RetailerLayout from './layouts/RetailerLayout';

// Master Components
import DashboardHome from './components/DashboardHome';
import ItemManager from './components/ItemManager';
import CategoryManager from './components/CategoryManager';
import LocationManager from './components/LocationManager';
import StaffManager from './components/StaffManager';
import RetailerManager from './components/RetailerManager';
import BillingManager from './components/BillingManager';
import InvoiceHistory from './components/InvoiceHistory';
import LedgerManager from './components/LedgerManager';
import StaffReports from './components/StaffReports';
import IncomingOrders from './components/IncomingOrders';
import PartnerManager from './components/PartnerManager';
import ReturnManager from './components/ReturnManager';
import SettingsManager from './components/SettingsManager';

// Staff Components
import StaffDashboard from './pages/StaffDashboard';

// Retailer Components
import RetailerCatalog from './pages/RetailerCatalog';
import RetailerOrders from './pages/RetailerOrders';

function App() {
  return (
    <BrowserRouter>
      {/* CHANGED POSITION TO BOTTOM-RIGHT */}
      <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />

      <Routes>
        {/* Login Page */}
        <Route path="/" element={<Login />} />

        {/* Super Admin Route */}
        <Route path="/admin" element={<SuperAdminDashboard />} />

        {/* Master Routes (Sidebar Layout) */}
        <Route path="/master" element={<MasterLayout />}>
            <Route index element={<Navigate to="home" />} />

            <Route path="home" element={<DashboardHome />} />
            <Route path="items" element={<ItemManager />} />
            <Route path="categories" element={<CategoryManager />} />
            <Route path="locations" element={<LocationManager />} />
            <Route path="staff" element={<StaffManager />} />
            <Route path="retailers" element={<RetailerManager />} />
            <Route path="billing" element={<BillingManager />} />
            <Route path="history" element={<InvoiceHistory />} />
            <Route path="ledger" element={<LedgerManager />} />
            <Route path="reports" element={<StaffReports />} />
            <Route path="orders" element={<IncomingOrders />} />
            <Route path="partners" element={<PartnerManager />} />
            <Route path="returns" element={<ReturnManager />} />
            <Route path="settings" element={<SettingsManager />} />
        </Route>

        {/* Staff Routes */}
        <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<StaffDashboard />} />
        </Route>

        {/* Retailer Routes */}
        <Route path="/retailer" element={<RetailerLayout />}>
            <Route index element={<Navigate to="catalog" />} />
            <Route path="catalog" element={<RetailerCatalog />} />
            <Route path="orders" element={<RetailerOrders />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;

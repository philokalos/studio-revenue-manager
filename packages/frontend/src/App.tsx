import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import ReservationsPage from './pages/ReservationsPage';
import SalesPage from './pages/SalesPage';
import DashboardPage from './pages/DashboardPage';
import CostsPage from './pages/CostsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="costs" element={<CostsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;

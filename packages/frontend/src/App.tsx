import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import QuoteCalculator from './pages/QuoteCalculator';
import CalendarSettings from './pages/CalendarSettings';
import CalendarCallback from './pages/CalendarCallback';
import CalendarDemo from './pages/CalendarDemo';
import CSVBank from './pages/CSVBank';
import Reservations from './pages/Reservations';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quote"
              element={
                <ProtectedRoute>
                  <QuoteCalculator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar/settings"
              element={
                <ProtectedRoute>
                  <CalendarSettings />
                </ProtectedRoute>
              }
            />
            <Route path="/calendar/callback" element={<CalendarCallback />} />
            <Route
              path="/calendar/demo"
              element={
                <ProtectedRoute>
                  <CalendarDemo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/csv-bank"
              element={
                <ProtectedRoute>
                  <CSVBank />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reservations"
              element={
                <ProtectedRoute>
                  <Reservations />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

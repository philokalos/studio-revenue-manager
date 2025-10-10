import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingFallback from './components/LoadingFallback';

// Lazy load page components for code splitting
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const QuoteCalculator = lazy(() => import('./pages/QuoteCalculator'));
const CalendarSettings = lazy(() => import('./pages/CalendarSettings'));
const CalendarCallback = lazy(() => import('./pages/CalendarCallback'));
const CalendarDemo = lazy(() => import('./pages/CalendarDemo'));
const CSVBank = lazy(() => import('./pages/CSVBank'));
const Reservations = lazy(() => import('./pages/Reservations'));

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
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
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

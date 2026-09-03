import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import RequireRole from './components/RequireRole';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ROLES, ROLE_HOME } from './constants/roles';
import BookingPage from './pages/BookingPage';
import DiagnosticTestManagementPage from './pages/DiagnosticTestManagementPage';
import ResultManagementPage from './pages/ResultManagementPage';
import SampleStatusPage from './pages/SampleStatusPage';
import ReportApprovalPage from './pages/ReportApprovalPage';
import MyDonorProfilePage from './pages/MyDonorProfilePage';
import ChatbotPage from './pages/ChatbotPage';
import EmergencyBloodRequestPage from './pages/EmergencyBloodRequestPage';
import PharmacyStockPage from './pages/PharmacyStockPage';
import MedicineSearchPage from './pages/MedicineSearchPage';
import MedicineRequestPage from './pages/MedicineRequestPage';
import PharmacyMedicineRequestsPage from './pages/PharmacyMedicineRequestsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminBookingsPage from './pages/AdminBookingsPage';
import PlaceholderDashboardPage from './pages/PlaceholderDashboardPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PaymentResultPage from './pages/PaymentResultPage';
// "/" has no page of its own — it just sends each role to its own dashboard.
function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={ROLE_HOME[user?.role] || '/login'} replace />;
}

// The whole app sits behind login: logged-out visitors only ever see Login/Signup,
// and the full app (Navbar + every page) only mounts once a token exists. Every route
// beyond that is further gated by role via RequireRole, matching the backend's
// requireRole checks so a role only ever sees the pages its API calls will succeed on.
function AppShell() {
  const { token } = useAuth();

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />

        <Route
          path="/booking"
          element={
            <RequireRole roles={[ROLES.PATIENT]}>
              <BookingPage />
            </RequireRole>
          }
        />
        <Route
          path="/payment-result"
          element={
            <RequireRole roles={[ROLES.PATIENT]}>
              <PaymentResultPage />
            </RequireRole>
          }
        />
        <Route
          path="/tests"
          element={
            <RequireRole roles={[ROLES.ADMIN]}>
              <DiagnosticTestManagementPage />
            </RequireRole>
          }
        />
        <Route
          path="/results"
          element={
            <RequireRole roles={[ROLES.LAB_STAFF]}>
              <ResultManagementPage />
            </RequireRole>
          }
        />
        <Route
          path="/sample-status"
          element={
            <RequireRole roles={[ROLES.PATIENT, ROLES.LAB_STAFF, ROLES.ADMIN]}>
              <SampleStatusPage />
            </RequireRole>
          }
        />
        <Route
          path="/report-approval"
          element={
            <RequireRole roles={[ROLES.PATIENT, ROLES.DOCTOR]}>
              <ReportApprovalPage />
            </RequireRole>
          }
        />
        <Route
          path="/support"
          element={
            <RequireRole roles={[ROLES.PATIENT]}>
              <ChatbotPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <RequireRole roles={[ROLES.ADMIN]}>
              <AdminBookingsPage />
            </RequireRole>
          }
        />
        <Route
          path="/donor-profile"
          element={
            <RequireRole roles={[ROLES.DONOR]}>
              <MyDonorProfilePage />
            </RequireRole>
          }
        />
        <Route
          path="/blood-request"
          element={
            <RequireRole roles={[ROLES.PATIENT, ROLES.HOSPITAL_STAFF, ROLES.ADMIN]}>
              <EmergencyBloodRequestPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireRole roles={[ROLES.ADMIN]}>
              <AdminUsersPage />
            </RequireRole>
          }
        />
        <Route
          path="/medicine-search"
          element={
            <RequireRole roles={[ROLES.PATIENT]}>
              <MedicineSearchPage />
            </RequireRole>
          }
        />
        <Route
          path="/pharmacy-stock"
          element={
            <RequireRole roles={[ROLES.PHARMACY]}>
              <PharmacyStockPage />
            </RequireRole>
          }
        />
        <Route
          path="/medicine-request"
          element={
            <RequireRole roles={[ROLES.PATIENT]}>
              <MedicineRequestPage />
            </RequireRole>
          }
        />
        <Route
          path="/medicine-requests"
          element={
            <RequireRole roles={[ROLES.PHARMACY]}>
              <PharmacyMedicineRequestsPage />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireRole roles={[ROLES.HOSPITAL_STAFF, ROLES.PHARMACY]}>
              <PlaceholderDashboardPage />
            </RequireRole>
          }
        />

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

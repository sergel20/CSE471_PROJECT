import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import BookingPage from './pages/BookingPage';
import DiagnosticTestManagementPage from './pages/DiagnosticTestManagementPage';
import ResultManagementPage from './pages/ResultManagementPage';
import SampleStatusPage from './pages/SampleStatusPage';
import ReportApprovalPage from './pages/ReportApprovalPage';
import MyDonorProfilePage from './pages/MyDonorProfilePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// The whole app sits behind login: logged-out visitors only ever see Login/Signup,
// and the full app (Navbar + every page) only mounts once a token exists.
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
        <Route path="/" element={<BookingPage />} />
        <Route path="/tests" element={<DiagnosticTestManagementPage />} />
        <Route path="/results" element={<ResultManagementPage />} />
        <Route path="/sample-status" element={<SampleStatusPage />} />
        <Route path="/report-approval" element={<ReportApprovalPage />} />
        <Route path="/donor-profile" element={<MyDonorProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
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

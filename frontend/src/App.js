import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import BookingPage from './pages/BookingPage';
import DiagnosticTestManagementPage from './pages/DiagnosticTestManagementPage';
import ResultManagementPage from './pages/ResultManagementPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<BookingPage />} />
          <Route path="/tests" element={<DiagnosticTestManagementPage />} />
          <Route path="/results" element={<ResultManagementPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

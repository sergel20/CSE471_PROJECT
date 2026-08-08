import './App.css';
import Navbar from './components/Navbar';
import BookingPage from './pages/BookingPage';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <BookingPage />
    </div>
  );
}

export default App;

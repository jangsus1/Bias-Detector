import logo from './logo.svg';
import './App.css';
import Dashboard from './dashboard/Dashboard';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/:dataset/:label" element={<Dashboard />} />
        <Route path="*" element={<Navigate replace to="/urbancars/urban" />} />
      </Routes>
    </Router>
  );
}

export default App;

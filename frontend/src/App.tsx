import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing/Landing';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import AuthCallback from './pages/AuthCallback/AuthCallback';
import Catalog from './pages/Catalog/Catalog';
import Cart from './pages/Cart/Cart';
import Admin from './pages/Admin/Admin';
import ClientDashboard from './pages/Dashboard/ClientDashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow">
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Rutas Privadas (Requieren Sesión Activa) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<ClientDashboard />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/cart" element={<Cart />} />
            </Route>

            {/* Rutas Privadas Admin (Solo Rol Administrador) */}
            <Route element={<ProtectedRoute adminOnly={true} />}>
              <Route path="/admin" element={<Admin />} />
            </Route>

          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

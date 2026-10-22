import Tarjetas from './pages/Tarjetas';
import Configuracion from './pages/Configuracion';
import Cobranzas from './pages/Cobranzas';
import Citaciones from './pages/Citaciones';
import CorregirCategorias from './pages/CorregirCategorias';
import ImportarDeportistas from './pages/ImportarDeportistas';
import EditarUsuarios from './pages/EditarUsuarios';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Deportistas from './pages/Deportistas';
import Asistencia from './pages/Asistencia';
import Profesores from './pages/Profesores';
import Historial from './pages/Historial';
import Reportes from './pages/Reportes';
import Claves from './pages/Claves';
import Categorias from './pages/Categorias';
import Login from './pages/Login';

// Verificar si hay sesión
const isAuthenticated = () => {
  return localStorage.getItem('usuarioActivo') !== null;
};

// Ruta protegida
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login - SIN protección */}
        <Route path="/login" element={<Login />} />
            
        {/* Rutas protegidas CON MainLayout (Sidebar) */}
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="citaciones" element={<Citaciones />} />
          <Route path="deportistas" element={<Deportistas />} />
          <Route path="importar-deportistas" element={<ImportarDeportistas />} />
          <Route path="asistencia" element={<Asistencia />} />
          <Route path="historial" element={<Historial />} />
          <Route path="tarjetas" element={<Tarjetas />} />  
          <Route path="reportes" element={<Reportes />} />
          <Route path="cobranzas" element={<Cobranzas />} />
          <Route path="corregir-categorias" element={<CorregirCategorias />} />
          <Route path="profesores" element={<Profesores />} />
          <Route path="editar-usuarios" element={<EditarUsuarios />} />
          <Route path="claves" element={<Claves />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Route>
        
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
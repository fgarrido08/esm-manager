import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children }) {
  try {
    const usuarioStr = localStorage.getItem('usuarioActivo');
    if (!usuarioStr) {
      return <Navigate to="/login" replace />;
    }
    
    const usuario = JSON.parse(usuarioStr);
    
    if (usuario.rol !== 'admin') {
      return <Navigate to="/" replace />; // Si no es admin, lo manda al Dashboard (no al login)
    }
    
    return children;
  } catch (error) {
    return <Navigate to="/login" replace />;
  }
}
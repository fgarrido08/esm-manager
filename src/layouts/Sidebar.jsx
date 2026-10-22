import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Sidebar({ onClose }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const cargarUsuario = () => {
      const datosUsuario = localStorage.getItem('usuarioActivo');
      if (datosUsuario) {
        try {
          const user = JSON.parse(datosUsuario);
          setUsuario(user);
        } catch (error) {
          console.error('Error al parsear usuario:', error);
        }
      }
      setCargando(false);
    };

    cargarUsuario();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('usuarioActivo');
    setUsuario(null);
    navigate('/login');
    if (onClose) onClose();
  };

  const menuItems = [
    { path: '/', label: 'Inicio', icon: '🏠', roles: ['admin', 'profesor', 'tesorero'] },
    { path: 'asistencia', label: 'Lista', icon: '✅', roles: ['admin', 'profesor'] },
    { path: 'historial', label: 'Panel', icon: '📊', roles: ['admin', 'profesor', 'tesorero'] },
    { path: 'reportes', label: 'Report.', icon: '📋', roles: ['admin', 'tesorero'] },
    { path: 'deportistas', label: 'Deportistas', icon: '👥', roles: ['admin','cobranzas', 'profesor', 'tesorero'] },
    { path: 'profesores', label: 'Profesores', icon: '👨‍🏫', roles: ['admin'] },
    { path: 'citaciones', label: 'Citaciones', icon: '📣', roles: ['admin', 'profesor'] },
    { path: 'categorias', label: 'Categorías', icon: '🏷️', roles: ['admin'] },
    { path: 'cobranzas', label: 'Cobranzas', icon: '💰', roles: ['admin','cobranzas', 'tesorero'] },
    { path: 'claves', label: 'Claves', icon: '🗝️', roles: ['admin', 'profesor', 'tesorero'] },
    { path: 'importar-deportistas', label: 'Importar', icon: '📥', roles: ['admin'] },
    { path: 'configuracion', label: 'Configuración', icon: '️⚙️', roles: ['admin'] },
    { path: 'tarjetas', label: 'Tarjetas', icon: '🟥🟦', roles: ['admin', 'profesor', 'tesorero', 'apoderado'] },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === '/' + path;
  };

  if (cargando) return null;
  if (!usuario) return null;

  return (
    <div className="w-64 bg-blue-900 text-white flex flex-col h-screen shadow-xl">
      {/* Header con logo y botón cerrar (móvil) */}
      <div className="p-4 text-center border-b border-blue-800 flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <img 
            src="/logo-esm-troquelado.png" 
            alt="ESM Logo"
            className="w-16 h-16 mx-auto drop-shadow-lg"
          />
          {/* Botón X solo en móvil */}
          <button 
            onClick={onClose}
            className="md:hidden text-white text-2xl p-2 hover:bg-blue-800 rounded"
          >
            ✕
          </button>
        </div>
        <h1 className="text-lg font-bold text-yellow-400">ESM Manager</h1>
        <p className="text-xs text-blue-200">Club Estudiantil San Miguel</p>
      </div>

      {/* Menú con scroll */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          if (!item.roles.includes(usuario.rol)) return null;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onClose && onClose()}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                isActive(item.path)
                  ? 'bg-yellow-500 text-blue-900 font-bold shadow-md'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer con usuario y cerrar sesión */}
      <div className="p-3 border-t border-blue-800 bg-blue-950 flex-shrink-0">
        <div className="mb-2 px-2">
          <p className="text-xs text-blue-300 uppercase tracking-wider">Conectado como</p>
          <p className="font-bold text-white truncate text-sm">{usuario.nombre}</p>
          <p className="text-xs text-yellow-400 capitalize">{usuario.rol}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
        >
          🚪 Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
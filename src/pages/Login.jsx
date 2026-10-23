import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocs, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function Login() {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para el cambio de contraseña forzado
  const [requiereCambio, setRequiereCambio] = useState(false);
  const [usuarioTemporal, setUsuarioTemporal] = useState(null);
  const [nuevaPass, setNuevaPass] = useState('');
  const [confirmarPass, setConfirmarPass] = useState('');
  
  // Estados para los botones de "ojo mágico"
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarNuevaPass, setMostrarNuevaPass] = useState(false);
  const [mostrarConfirmarPass, setMostrarConfirmarPass] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      // Cargar profesores desde la colección profesores
      const querySnapshot = await getDocs(collection(db, "profesores"));
      const listaProfesores = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nombre: data.nombre,
          cargo: data.cargo || 'Profesor',
          rol: data.rol || 'profesor', // ✅ NUEVO: campo rol
          password: data.password,
          cambioForzado: data.cambioForzado || false,
          email: data.email || ''
        };
      });
      
      const todos = [
        { nombre: 'admin', rol: 'admin', cargo: 'Administrador del Sistema' },
        ...listaProfesores
      ];
      
      setUsuarios(todos);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // LOGIN DE ADMINISTRADOR
      if (usuarioSeleccionado === 'admin') {
        const adminPassGuardada = localStorage.getItem('adminPassword') || 'admin123';
        if (password === adminPassGuardada) {
          const adminData = { 
            nombre: 'Administrador', 
            rol: 'admin', 
            cargo: 'Dueño del Sistema',
            email: 'admin@esm.cl'
          };
          localStorage.setItem('usuarioActivo', JSON.stringify(adminData));
          navigate('/');
          return;
        } else {
          setError('Contraseña de administrador incorrecta.');
          setLoading(false);
          return;
        }
      }

      // LOGIN DE PROFESORES Y COBRANZAS
      const usuario = usuarios.find(u => u.nombre === usuarioSeleccionado);
      if (!usuario) {
        setError('Usuario no encontrado.');
        setLoading(false);
        return;
      }
      
      if (usuario.password !== password) {
        setError('Contraseña incorrecta.');
        setLoading(false);
        return;
      }
      
      // Si requiere cambio de contraseña (primer ingreso)
      if (usuario.cambioForzado) {
        setUsuarioTemporal(usuario);
        setRequiereCambio(true);
        setLoading(false);
        return;
      }
      
      // Guardar datos del usuario en localStorage (incluyendo el rol)
      const datosUsuario = {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        cargo: usuario.cargo,
        email: usuario.email
      };
      localStorage.setItem('usuarioActivo', JSON.stringify(datosUsuario));
      
      // Redirigir según el rol
      if (usuario.rol === 'cobranzas') {
        navigate('/cobranzas');
      } else if (usuario.rol === 'profesor') {
        navigate('/');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error(error);
      setError('Error al conectar.');
    } finally {
      setLoading(false);
    }
  };

  const handleForzarCambio = async (e) => {
    e.preventDefault();
    if (nuevaPass.length < 4) return alert("La contraseña debe tener al menos 4 caracteres");
    if (nuevaPass !== confirmarPass) return alert("Las contraseñas no coinciden");

    try {
      const docRef = doc(db, "profesores", usuarioTemporal.id);
      await updateDoc(docRef, { 
        password: nuevaPass,
        cambioForzado: false 
      });
      
      alert("✅ Contraseña actualizada correctamente. Ahora puedes ingresar.");
      setRequiereCambio(false);
      setPassword(nuevaPass);
      setNuevaPass('');
      setConfirmarPass('');
      
      // Auto-login después del cambio
      const datosUsuario = {
        id: usuarioTemporal.id,
        nombre: usuarioTemporal.nombre,
        rol: usuarioTemporal.rol,
        cargo: usuarioTemporal.cargo,
        email: usuarioTemporal.email
      };
      localStorage.setItem('usuarioActivo', JSON.stringify(datosUsuario));
      
      if (usuarioTemporal.rol === 'cobranzas') {
        navigate('/cobranzas');
      } else {
        navigate('/');
      }
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* HEADER con LOGO DEL CLUB */}
        <div className="bg-primary text-white p-8 text-center">
          <img 
            src="/logo-esm-troquelado.png" 
            alt="ESM Hockey Estudiantil San Miguel"
            className="w-40 h-40 mx-auto mb-4 drop-shadow-lg"
          />
          <h1 className="text-2xl font-bold">ESM Manager</h1>
          <p className="text-sm mt-1 text-blue-100">Estudiantil San Miguel</p>
          <p className="text-xs mt-1 text-blue-200">Hockey Patín · Asistencia 2026</p>
        </div>

        {/* CUERPO DEL LOGIN */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                👤 Ingreso al Sistema
              </label>
              <select
                value={usuarioSeleccionado}
                onChange={(e) => setUsuarioSeleccionado(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-white"
                required
              >
                <option value="">— Selecciona tu usuario —</option>
                <option value="admin">️ Administrador</option>
                <optgroup label="Profesores">
                  {usuarios
                    .filter(u => u.rol === 'profesor' || !u.rol)
                    .map(u => (
                      <option key={u.id || 'admin'} value={u.nombre}>
                        {u.nombre} — {u.cargo}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Administración">
                  {usuarios
                    .filter(u => u.rol === 'cobranzas')
                    .map(u => (
                      <option key={u.id} value={u.nombre}>
                        {u.nombre} — {u.cargo}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔑 Contraseña
              </label>
              <div className="relative">
                <input
                  type={mostrarPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 text-xl focus:outline-none"
                  title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {mostrarPassword ? '👁️' : ''}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm text-center border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-[#2563eb] text-white py-4 rounded-lg font-bold text-lg transition-colors shadow-md ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'hover:bg-[#1e40af]'
            }`}
            >
              {loading ? 'Ingresando...' : 'Ingresar →'}
            </button>
          </form>
        </div>

        <div className="bg-gray-50 p-4 text-center text-xs text-gray-500 border-t">
          ESM Manager © 2026 · Estudiantil San Miguel
        </div>
      </div>

      {/* MODAL DE CAMBIO DE CONTRASEÑA FORZADO */}
      {requiereCambio && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-orange-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">🔐 Primer Ingreso</h2>
            <p className="text-gray-600 mb-6">
              Hola <b>{usuarioTemporal?.nombre}</b>, por seguridad debes elegir una contraseña personal.
            </p>
            
            <form onSubmit={handleForzarCambio} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                <div className="relative">
                  <input 
                    type={mostrarNuevaPass ? "text" : "password"} 
                    value={nuevaPass} 
                    onChange={(e) => setNuevaPass(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none pr-12"
                    placeholder="Ej: Cobranzas2026"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarNuevaPass(!mostrarNuevaPass)}
                    className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 text-xl focus:outline-none"
                    title={mostrarNuevaPass ? "Ocultar" : "Mostrar"}
                  >
                    {mostrarNuevaPass ? '👁️' : ''}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repetir contraseña</label>
                <div className="relative">
                  <input 
                    type={mostrarConfirmarPass ? "text" : "password"} 
                    value={confirmarPass} 
                    onChange={(e) => setConfirmarPass(e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none pr-12" 
                    placeholder="Escribe la misma contraseña"
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmarPass(!mostrarConfirmarPass)}
                    className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 text-xl focus:outline-none"
                    title={mostrarConfirmarPass ? "Ocultar" : "Mostrar"}
                  >
                    {mostrarConfirmarPass ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                Guardar y Entrar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 
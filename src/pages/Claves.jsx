import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { obtenerProfesores, cambiarPassword } from '../firebase/profesores';

export default function Claves() {
  const [usuario, setUsuario] = useState(null);
  const [profesores, setProfesores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  // Estados para "Cambiar mi contraseña" (Visible para todos)
  const [passActual, setPassActual] = useState('');
  const [nuevaPass, setNuevaPass] = useState('');
  const [confirmarPass, setConfirmarPass] = useState('');
  const [mostrarPassActual, setMostrarPassActual] = useState(false);
  const [mostrarNuevaPass, setMostrarNuevaPass] = useState(false);
  const [mostrarConfirmarPass, setMostrarConfirmarPass] = useState(false);

  // Estados para Administración (Solo visible para Admin)
  const [adminPass, setAdminPass] = useState('');
  const [mostrarAdminPass, setMostrarAdminPass] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  useEffect(() => {
    const datosUsuario = localStorage.getItem('usuarioActivo');
    if (datosUsuario) {
      const user = JSON.parse(datosUsuario);
      setUsuario(user);
      
      // Si es admin, cargamos la lista de profesores y su propia clave
      if (user.rol === 'admin') {
        cargarProfesores();
        const passGuardada = localStorage.getItem('adminPassword') || 'admin123';
        setAdminPass(passGuardada);
      }
    }
    setCargando(false);
  }, []);

  const cargarProfesores = async () => {
    const datos = await obtenerProfesores();
    setProfesores(datos);
  };

  // --- FUNCIÓN: Cambiar mi propia contraseña ---
  const handleCambiarMiPassword = async (e) => {
    e.preventDefault();
    if (!usuario) return;
    if (nuevaPass !== confirmarPass) return alert("Las contraseñas nuevas no coinciden");
    if (nuevaPass.length < 4) return alert("La contraseña debe tener al menos 4 caracteres");

    if (usuario.rol === 'admin') {
      const passGuardada = localStorage.getItem('adminPassword') || 'admin123';
      if (passActual !== passGuardada) return alert("La contraseña actual es incorrecta");
      
      localStorage.setItem('adminPassword', nuevaPass);
      setMensaje("✅ Contraseña de administrador actualizada correctamente.");
    } else {
      if (passActual !== usuario.password) return alert("La contraseña actual es incorrecta");
      
      try {
        await updateDoc(doc(db, "profesores", usuario.id), {
          password: nuevaPass,
          cambioForzado: false
        });
        // Actualizamos la sesión local para que no se cierre
        const usuarioActualizado = { ...usuario, password: nuevaPass };
        localStorage.setItem('usuarioActivo', JSON.stringify(usuarioActualizado));
        setMensaje("✅ Tu contraseña ha sido actualizada correctamente.");
      } catch (error) {
        alert("Error al actualizar: " + error.message);
        return;
      }
    }
    
    setPassActual('');
    setNuevaPass('');
    setConfirmarPass('');
    setTimeout(() => setMensaje(''), 4000);
  };

  // --- FUNCIONES DE ADMIN ---
  const toggleVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGuardarClaveProfesor = async (id, nuevaClave) => {
    if (nuevaClave.length < 4) {
      alert("La contraseña debe tener al menos 4 caracteres");
      return;
    }
    try {
      await cambiarPassword(id, nuevaClave);
      setMensaje(`✅ Contraseña de ${profesores.find(p => p.id === id)?.nombre} actualizada.`);
      setTimeout(() => setMensaje(''), 3000);
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleGuardarAdminPass = () => {
    if (adminPass.length < 4) {
      alert("La contraseña de administrador debe tener al menos 4 caracteres");
      return;
    }
    localStorage.setItem('adminPassword', adminPass);
    setMensaje("✅ Contraseña de Administrador actualizada.");
    setTimeout(() => setMensaje(''), 3000);
  };

  if (cargando) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800">🔑 Gestión de Contraseñas</h2>
      <p className="text-gray-600">Administra las claves de acceso al sistema.</p>

      {mensaje && (
        <div className="bg-green-100 text-green-800 p-4 rounded-lg border border-green-200 font-medium animate-pulse">
          {mensaje}
        </div>
      )}

      {/* SECCIÓN 1: Cambiar mi contraseña (Visible para TODOS) */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-primary">
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <h3 className="font-semibold text-blue-900">👤 Cambiar mi contraseña</h3>
          <p className="text-sm text-blue-700">Usuario actual: <b>{usuario?.nombre}</b> ({usuario?.rol === 'admin' ? 'Administrador' : 'Profesor'})</p>
        </div>
        <form onSubmit={handleCambiarMiPassword} className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contraseña Actual */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual *</label>
              <div className="relative">
                <input 
                  type={mostrarPassActual ? "text" : "password"} 
                  value={passActual}
                  onChange={(e) => setPassActual(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-primary outline-none font-mono pr-10"
                  required
                />
                <button type="button" onClick={() => setMostrarPassActual(!mostrarPassActual)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                  {mostrarPassActual ? '👁️' : '🙈'}
                </button>
              </div>
            </div>
            {/* Nueva Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña *</label>
              <div className="relative">
                <input 
                  type={mostrarNuevaPass ? "text" : "password"} 
                  value={nuevaPass}
                  onChange={(e) => setNuevaPass(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-primary outline-none font-mono pr-10"
                  required
                />
                <button type="button" onClick={() => setMostrarNuevaPass(!mostrarNuevaPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                  {mostrarNuevaPass ? '👁️' : '🙈'}
                </button>
              </div>
            </div>
            {/* Confirmar Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repetir nueva contraseña *</label>
              <div className="relative">
                <input 
                  type={mostrarConfirmarPass ? "text" : "password"} 
                  value={confirmarPass}
                  onChange={(e) => setConfirmarPass(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-primary outline-none font-mono pr-10"
                  required
                />
                <button type="button" onClick={() => setMostrarConfirmarPass(!mostrarConfirmarPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                  {mostrarConfirmarPass ? '👁️' : '🙈'}
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-800 font-medium">
              💾 Actualizar mi contraseña
            </button>
          </div>
        </form>
      </div>

      {/* SECCIÓN 2: Administración de Usuarios (SOLO PARA ADMIN) */}
      {usuario?.rol === 'admin' && (
        <>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="font-semibold text-gray-700">👨‍🏫 Contraseñas de Profesores</h3>
              <p className="text-sm text-gray-500">Como administrador, puedes restablecer las claves de cualquier profesor.</p>
            </div>
            <div className="divide-y">
              {profesores.map(p => (
                <div key={p.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{p.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {p.cargo} 
                      {p.cambioForzado && <span className="text-orange-500 font-bold ml-2">(Pendiente de cambio)</span>}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-48">
                      <input 
                        type={visiblePasswords[p.id] ? "text" : "password"} 
                        id={`pass-${p.id}`}
                        defaultValue={p.password}
                        className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-primary outline-none font-mono pr-10"
                        placeholder="Nueva contraseña"
                      />
                      <button
                        type="button"
                        onClick={() => toggleVisibility(p.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-lg"
                      >
                        {visiblePasswords[p.id] ? '👁️' : '🙈'}
                      </button>
                    </div>
                    <button 
                      onClick={() => handleGuardarClaveProfesor(p.id, document.getElementById(`pass-${p.id}`).value)}
                      className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-800 font-medium text-sm whitespace-nowrap"
                    >
                      💾 Guardar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <h3 className="font-semibold text-blue-900">⚙️ Contraseña Maestra de Administrador</h3>
              <p className="text-sm text-blue-700">Esta contraseña se guarda en este navegador.</p>
            </div>
            <div className="p-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div className="flex-1 w-full md:w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña de Admin</label>
                <div className="relative">
                  <input 
                    type={mostrarAdminPass ? "text" : "password"} 
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-primary outline-none font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarAdminPass(!mostrarAdminPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-lg"
                  >
                    {mostrarAdminPass ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>
              <button 
                onClick={handleGuardarAdminPass}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium w-full md:w-auto"
              >
                💾 Guardar mi contraseña
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
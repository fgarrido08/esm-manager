import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function Configuracion() {
  const [usuario, setUsuario] = useState(null);
  const [canchas, setCanchas] = useState([]);
  const [rivales, setRivales] = useState([]);
  const [nuevaCancha, setNuevaCancha] = useState('');
  const [nuevoRival, setNuevoRival] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const datosUsuario = localStorage.getItem('usuarioActivo');
    if (datosUsuario) setUsuario(JSON.parse(datosUsuario));
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [canchasSnap, rivalesSnap] = await Promise.all([
        getDocs(collection(db, 'canchas')),
        getDocs(collection(db, 'rivales'))
      ]);
      setCanchas(canchasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRivales(rivalesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error cargando config:", error);
    }
    setCargando(false);
  };

  const agregarCancha = async () => {
    if (!nuevaCancha.trim()) return alert("Escribe el nombre/dirección de la cancha");
    try {
      await addDoc(collection(db, 'canchas'), { 
        nombre: nuevaCancha.trim(), 
        fechaCreacion: new Date().toISOString() 
      });
      setNuevaCancha('');
      await cargarDatos();
    } catch (error) { alert("Error: " + error.message); }
  };

  const eliminarCancha = async (id) => {
    if (!window.confirm("¿Eliminar esta cancha? Ya no aparecerá en las citaciones.")) return;
    try {
      await deleteDoc(doc(db, 'canchas', id));
      await cargarDatos();
    } catch (error) { alert("Error: " + error.message); }
  };

  const agregarRival = async () => {
    if (!nuevoRival.trim()) return alert("Escribe el nombre del club rival");
    try {
      await addDoc(collection(db, 'rivales'), { 
        nombre: nuevoRival.trim(), 
        fechaCreacion: new Date().toISOString() 
      });
      setNuevoRival('');
      await cargarDatos();
    } catch (error) { alert("Error: " + error.message); }
  };

  const eliminarRival = async (id) => {
    if (!window.confirm("¿Eliminar este club rival?")) return;
    try {
      await deleteDoc(doc(db, 'rivales', id));
      await cargarDatos();
    } catch (error) { alert("Error: " + error.message); }
  };

  if (cargando) return <div className="p-8 text-center">Cargando configuración...</div>;
  if (usuario?.rol !== 'admin') return <div className="p-8 text-center text-red-600 font-bold">⛔ Acceso restringido solo a administradores.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">⚙️ Configuración del Sistema</h2>
        <p className="text-gray-600 mt-1">Administra las canchas y clubes rivales que aparecen en el módulo de Citaciones.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECCIÓN CANCHAS */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-orange-500">
          <div className="p-4 bg-orange-50 border-b border-orange-200">
            <h3 className="font-bold text-orange-900 text-lg">📍 Gestión de Canchas</h3>
            <p className="text-xs text-orange-700">Agrega las direcciones de los gimnasios o canchas donde juegan.</p>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={nuevaCancha}
                onChange={(e) => setNuevaCancha(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarCancha())}
                placeholder="Ej: Gimnasio Municipal San Miguel - Av. Portales 3350"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <button onClick={agregarCancha} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium whitespace-nowrap">
                ➕ Agregar
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {canchas.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">No hay canchas registradas</p> :
                canchas.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    <span className="text-sm text-gray-800 break-words pr-2">{c.nombre}</span>
                    <button onClick={() => eliminarCancha(c.id)} className="text-red-500 hover:text-red-700 p-1 text-xl" title="Eliminar">🗑️</button>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* SECCIÓN RIVALES */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-purple-500">
          <div className="p-4 bg-purple-50 border-b border-purple-200">
            <h3 className="font-bold text-purple-900 text-lg"> Gestión de Clubes Rivales</h3>
            <p className="text-xs text-purple-700">Agrega los clubes que participan en la liga.</p>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={nuevoRival}
                onChange={(e) => setNuevoRival(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarRival())}
                placeholder="Ej: Club Patín Talcahuano"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <button onClick={agregarRival} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium whitespace-nowrap">
                ➕ Agregar
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {rivales.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">No hay rivales registrados</p> :
                rivales.map(r => (
                  <div key={r.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    <span className="text-sm text-gray-800 break-words pr-2">{r.nombre}</span>
                    <button onClick={() => eliminarRival(r.id)} className="text-red-500 hover:text-red-700 p-1 text-xl" title="Eliminar">🗑️</button>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
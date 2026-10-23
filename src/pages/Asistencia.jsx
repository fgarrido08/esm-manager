import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { obtenerDeportistas } from '../firebase/deportistas';
import { obtenerCategorias } from '../firebase/categorias';
import { ordenarCategorias } from '../utils/ordenarCategorias';

export default function Asistencia() {
  const [usuario, setUsuario] = useState(null);
  const [deportistas, setDeportistas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [actividad, setActividad] = useState('Hockey Patines');
  const obtenerFechaLocal = () => {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`; };
  const [fecha, setFecha] = useState(obtenerFechaLocal());
  const [horario, setHorario] = useState('');
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const datosUsuario = localStorage.getItem('usuarioActivo');
    if (datosUsuario) setUsuario(JSON.parse(datosUsuario));
    cargarDatos();
  }, []);

  useEffect(() => {
    if (categoria) cargarDeportistasCategoria();
  }, [categoria, fecha, actividad, horario]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [deps, cats] = await Promise.all([
        obtenerDeportistas(),
        obtenerCategorias()
      ]);
      setDeportistas(deps);
      setCategorias(ordenarCategorias(cats.map(c => c.nombre)));
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
    setCargando(false);
  };

  const cargarDeportistasCategoria = async () => {
    setCargando(true);
    try {
      const deportistasFiltrados = deportistas.filter(d => 
        d.categoria && d.categoria.toUpperCase() === categoria.toUpperCase()
      );

      const condiciones = [
        where("fecha", "==", fecha),
        where("categoria", "==", categoria),
        where("actividad", "==", actividad)
      ];
      
      if (actividad === 'Entrenamiento GOM' && horario) {
        condiciones.push(where("horario", "==", horario));
      }

      const q = query(collection(db, "asistencias"), ...condiciones);
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setRegistros(docData.registros || []);
      } else {
        const nuevosRegistros = deportistasFiltrados.map(d => ({
          deportistaId: d.id,
          nombre: `${d.primerNombre || ''} ${d.apellidoPaterno || ''}`.trim(),
          estado: 'pendiente',
          observacion: ''
        }));
        setRegistros(nuevosRegistros);
      }
    } catch (error) {
      console.error("Error cargando deportistas:", error);
    }
    setCargando(false);
  };

  const cambiarEstado = (deportistaId, nuevoEstado) => {
    setRegistros(registros.map(r => 
      r.deportistaId === deportistaId ? { ...r, estado: nuevoEstado } : r
    ));
  };

  const cambiarObservacion = (deportistaId, observacion) => {
    setRegistros(registros.map(r => 
      r.deportistaId === deportistaId ? { ...r, observacion } : r
    ));
  };

  const handleGuardar = async () => {
  if (!categoria || !actividad || !fecha) {
    return alert("Completa categoría, actividad y fecha");
  }
  
  if (actividad === 'Entrenamiento GOM' && !horario) {
    return alert("️ Para Entrenamiento GOM es OBLIGATORIO seleccionar el Horario.");
  }

  if (registros.length === 0) {
    return alert("No hay deportistas en esta categoría");
  }

  setGuardando(true);
  
  try {
    const datosAsistencia = {
      fecha: fecha,
      categoria: categoria,
      actividad: actividad,
      profesorNombre: usuario?.nombre || 'Desconocido',
      profesorId: usuario?.id || '',
      registros: registros,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString()
    };

    if (actividad === 'Entrenamiento GOM' && horario) {
      datosAsistencia.horario = horario;
    }

    // Construir query de búsqueda
    const condiciones = [
      where("fecha", "==", fecha),
      where("categoria", "==", categoria),
      where("actividad", "==", actividad)
    ];
    
    if (actividad === 'Entrenamiento GOM' && horario) {
      condiciones.push(where("horario", "==", horario));
    }

    const q = query(collection(db, "asistencias"), ...condiciones);
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // ACTUALIZAR existente
      const docId = snapshot.docs[0].id;
      await updateDoc(doc(db, "asistencias", docId), datosAsistencia);
      alert("✅ Asistencia actualizada correctamente");
    } else {
      // CREAR nuevo
      await addDoc(collection(db, "asistencias"), datosAsistencia);
      alert("✅ Asistencia guardada correctamente");
    }
  } catch (error) {
    console.error("❌ Error al guardar:", error);
    alert("❌ Error al guardar: " + error.message);
  }
  
  setGuardando(false);
};

  const handleEliminarDeportista = async (deportistaId) => {
    const deportista = registros.find(r => r.deportistaId === deportistaId);
    if (!deportista) return;

    const confirmacion = window.confirm(`¿Eliminar el registro de ${deportista.nombre} de esta sesión?`);
    if (!confirmacion) return;

    try {
      const condiciones = [
        where("fecha", "==", fecha),
        where("categoria", "==", categoria),
        where("actividad", "==", actividad)
      ];
      if (actividad === 'Entrenamiento GOM' && horario) {
        condiciones.push(where("horario", "==", horario));
      }

      const q = query(collection(db, "asistencias"), ...condiciones);
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        const docRef = doc(db, "asistencias", docId);
        const docData = snapshot.docs[0].data();
        
        const nuevosRegistros = (docData.registros || []).filter(r => r.deportistaId !== deportistaId);
        await updateDoc(docRef, { registros: nuevosRegistros });
        
        setRegistros(registros.filter(r => r.deportistaId !== deportistaId));
        alert("✅ Registro eliminado de esta sesión");
      }
    } catch (error) {
      alert("❌ Error al eliminar: " + error.message);
    }
  };

  const handleBorrarSesion = async () => {
    const confirmacion = window.confirm(`⚠️ ¿Borrar TODA la asistencia de ${categoria} del ${fecha}?`);
    if (!confirmacion) return;
    try {
      const condiciones = [
        where("fecha", "==", fecha),
        where("categoria", "==", categoria),
        where("actividad", "==", actividad)
      ];
      if (actividad === 'Entrenamiento GOM' && horario) {
        condiciones.push(where("horario", "==", horario));
      }

      const q = query(collection(db, "asistencias"), ...condiciones);
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, "asistencias", document.id)));
      await Promise.all(deletePromises);
      alert("🗑️ Sesión borrada");
      setRegistros([]);
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
  };

  if (cargando) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">📋 Pasar Lista</h2>
          <p className="text-gray-600 mt-1">Registra la asistencia de los deportistas</p>
        </div>
        {usuario && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Profesor</p>
            <p className="font-semibold text-gray-800">{usuario.nombre}</p>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Categoría *</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
            <option value="">— Selecciona categoría —</option>
            {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Actividad *</label>
          <select value={actividad} onChange={(e) => setActividad(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
            <option value="Hockey Patines">🏒 Hockey Patines</option>
            <option value="Preparación Física">🏃 Preparación Física</option>
            <option value="Preparación Arqueros">🧤 Preparación Arqueros</option>
            <option value="Entrenamiento GOM">🏋️ Entrenamiento GOM</option>
          </select>
        </div>
        
        {actividad === 'Entrenamiento GOM' && (
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-red-700 mb-2 font-bold">Horario GOM *</label>
            <select 
              value={horario} 
              onChange={(e) => setHorario(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-red-300 bg-red-50 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-medium"
            >
              <option value="">— Selecciona horario —</option>
              <option value="20:00-21:00">🕗 20:00 - 21:00 hrs</option>
              <option value="22:00-23:30">🕙 22:00 - 23:30 hrs</option>
            </select>
          </div>
        )}
        
        <div className={actividad === 'Entrenamiento GOM' ? 'md:col-span-1' : 'md:col-span-2'}>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha *</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
        </div>
      </div>

      {categoria && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-semibold text-gray-700">
              Deportistas en {categoria} ({registros.length})
              {actividad === 'Entrenamiento GOM' && horario && <span className="text-sm text-red-600 font-bold ml-2">· Horario: {horario}</span>}
            </h3>
            <div className="flex gap-2 text-sm flex-wrap">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">✅ {registros.filter(r => r.estado === 'presente').length}</span>
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full">❌ {registros.filter(r => r.estado === 'ausente').length}</span>
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">🤒 {registros.filter(r => r.estado === 'justificado').length}</span>
            </div>
          </div>

          {registros.length === 0 ? (
            <div className="p-8 text-center text-gray-500"><p>No hay deportistas en esta categoría</p></div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {registros.map((reg, index) => (
                <div key={reg.deportistaId} className="p-3 hover:bg-gray-50">
                  <div className="md:hidden flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-gray-500 font-mono w-6">{index + 1}.</span>
                      <span className="font-medium text-gray-800 text-sm truncate">{reg.nombre}</span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => cambiarEstado(reg.deportistaId, 'presente')} className={`w-10 h-10 rounded-lg font-bold text-lg ${reg.estado === 'presente' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>✓</button>
                      <button onClick={() => cambiarEstado(reg.deportistaId, 'ausente')} className={`w-10 h-10 rounded-lg font-bold text-lg ${reg.estado === 'ausente' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}>✗</button>
                      <button onClick={() => cambiarEstado(reg.deportistaId, 'justificado')} className={`w-10 h-10 rounded-lg font-bold text-sm ${reg.estado === 'justificado' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-600'}`}>🤒</button>
                      {usuario?.rol === 'admin' && (
                        <button onClick={() => handleEliminarDeportista(reg.deportistaId)} className="w-10 h-10 rounded-lg font-bold text-lg bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center" title="Eliminar">🗑️</button>
                      )}
                    </div>
                  </div>

                  <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1"><p className="font-medium text-gray-800">{reg.nombre}</p></div>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => cambiarEstado(reg.deportistaId, 'presente')} className={`px-4 py-2 rounded-lg font-medium ${reg.estado === 'presente' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-green-100'}`}>✅ Presente</button>
                      <button onClick={() => cambiarEstado(reg.deportistaId, 'ausente')} className={`px-4 py-2 rounded-lg font-medium ${reg.estado === 'ausente' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-red-100'}`}>❌ Ausente</button>
                      <button onClick={() => cambiarEstado(reg.deportistaId, 'justificado')} className={`px-4 py-2 rounded-lg font-medium ${reg.estado === 'justificado' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-yellow-100'}`}>🤒 Justificado</button>
                      {usuario?.rol === 'admin' && (
                        <button onClick={() => handleEliminarDeportista(reg.deportistaId)} className="px-4 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200" title="Eliminar registro">️ Eliminar</button>
                      )}
                    </div>
                  </div>

                  {reg.estado !== 'pendiente' && (
                    <div className="mt-2">
                      <input type="text" value={reg.observacion || ''} onChange={(e) => cambiarObservacion(reg.deportistaId, e.target.value)} placeholder="Observación (opcional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {categoria && registros.length > 0 && (
        <div className="space-y-3">
          <button onClick={handleGuardar} disabled={guardando} className={`w-full py-4 rounded-lg font-bold text-lg ${guardando ? 'bg-gray-400' : 'bg-primary text-white hover:bg-blue-800'}`}>
            {guardando ? '💾 Guardando...' : '💾 Guardar Asistencia'}
          </button>
          {usuario?.rol === 'admin' && (
            <button onClick={handleBorrarSesion} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 border-2 border-red-800">
              ️ Borrar Asistencia de este día (Admin)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
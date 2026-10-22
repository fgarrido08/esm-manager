import { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { obtenerTodasLasAsistencias } from '../firebase/asistencia';
import { obtenerDeportistas } from '../firebase/deportistas';
import { obtenerProfesores } from '../firebase/profesores';

export default function Historial() {
  const [usuario, setUsuario] = useState(null);
  const [tab, setTab] = useState('deportista'); 
  const [asistencias, setAsistencias] = useState([]);
  const [deportistas, setDeportistas] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  const [filtroTiempo, setFiltroTiempo] = useState('todo');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  const hoy = new Date();
  const hoyStr = hoy.toISOString().split('T')[0];
  const [fechaRevision, setFechaRevision] = useState(hoyStr);

  useEffect(() => {
    const datosUsuario = localStorage.getItem('usuarioActivo');
    if (datosUsuario) setUsuario(JSON.parse(datosUsuario));
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    setCargando(true);
    try {
      const [asis, deps, profs] = await Promise.all([
        obtenerTodasLasAsistencias(),
        obtenerDeportistas(),
        obtenerProfesores()
      ]);
      setAsistencias(asis);
      setDeportistas(deps);
      setProfesores(profs);
    } catch (error) {
      console.error("Error cargando historial:", error);
    }
    setCargando(false);
  };

  const formatearFecha = (f) => { 
    if (!f) return '';
    const [y, m, d] = f.split('-'); 
    return `${d}/${m}/${y}`; 
  };

  const obtenerInicioSemana = () => {
    const d = new Date(hoy);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };
  
  const obtenerInicioMes = () => {
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  };

  const deportistaEncontrado = deportistas.find(d => {
    const nombreCompleto = [d.primerNombre, d.segundoNombre, d.apellidoPaterno, d.apellidoMaterno]
      .filter(p => p)
      .join(' ')
      .toLowerCase();
    const rut = String(d.rut || '').toLowerCase();
    const texto = (busqueda || '').toLowerCase();
    return nombreCompleto.includes(texto) || rut.includes(texto);
  });

  const historialCrudo = deportistaEncontrado 
    ? asistencias.filter(a => (a.registros || []).some(r => String(r.deportistaId) === String(deportistaEncontrado.id)))
    : [];

  const historialFiltrado = historialCrudo.filter(a => {
    if (filtroTiempo === 'todo') return true;
    if (filtroTiempo === 'semana') return a.fecha >= obtenerInicioSemana() && a.fecha <= hoyStr;
    if (filtroTiempo === 'mes') return a.fecha >= obtenerInicioMes() && a.fecha <= hoyStr;
    if (filtroTiempo === 'rango') {
      if (!fechaInicio || !fechaFin) return true;
      return a.fecha >= fechaInicio && a.fecha <= fechaFin;
    }
    return true;
  });

  const calcularPorcentaje = () => {
    if (!historialFiltrado || historialFiltrado.length === 0) return 0;
    let totalRegistros = 0;
    let presentes = 0;
    
    historialFiltrado.forEach(a => {
      const reg = (a.registros || []).find(r => String(r.deportistaId) === String(deportistaEncontrado.id));
      if (reg) {
        totalRegistros++;
        if (reg.estado === 'presente') presentes++;
      }
    });
    
    return totalRegistros === 0 ? 0 : Math.round((presentes / totalRegistros) * 100);
  };

  const eliminarHistorialCompleto = async () => {
    if (!window.confirm(`⚠️ ¿Estás seguro de ELIMINAR TODOS los registros de asistencia de ${deportistaEncontrado.primerNombre} ${deportistaEncontrado.apellidoPaterno} en TODAS las fechas?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    setCargando(true);
    try {
      console.log("🔍 Iniciando eliminación para ID:", deportistaEncontrado.id);
      let sesionesModificadas = 0;
      let errores = 0;
      
      for (const a of asistencias) {
        if (!a.registros || !Array.isArray(a.registros)) continue;
        
        const index = a.registros.findIndex(r => String(r.deportistaId) === String(deportistaEncontrado.id));
        
        if (index !== -1) {
          console.log("✅ Encontrado en sesión:", a.id, "Fecha:", a.fecha);
          
          try {
            a.registros.splice(index, 1);
            const docRef = doc(db, 'asistencias', a.id);
            
            if (a.registros.length === 0) {
              await deleteDoc(docRef);
              console.log("🗑️ Documento eliminado:", a.id);
            } else {
              await updateDoc(docRef, { registros: a.registros });
              console.log("✏️ Documento actualizado:", a.id);
            }
            sesionesModificadas++;
          } catch (err) {
            console.warn("⚠️ Error al actualizar sesión", a.id, ":", err.message);
            errores++;
          }
        }
      }
      
      console.log(" Total modificadas:", sesionesModificadas, "Errores:", errores);
      
      setBusqueda('');
      setFiltroTiempo('todo');
      setFechaInicio('');
      setFechaFin('');
      await cargarTodo();
      
      if (sesionesModificadas > 0) {
        alert(`✅ Se eliminaron los registros de ${sesionesModificadas} sesión(es). La página se actualizó.`);
      } else {
        alert("️ No se encontraron registros para eliminar o ya habían sido borrados.");
      }
    } catch (error) {
      console.error("❌ Error general:", error);
      alert("⚠️ Ocurrió un error, pero es posible que algunos registros se hayan eliminado. Recarga la página (Ctrl + Shift + R) para verificar.");
      setCargando(false);
    }
  };

  const cumplimientoProfesores = profesores.map(p => {
    const asistenciasFecha = asistencias.filter(a => a.fecha === fechaRevision && a.profesorNombre === p.nombre);
    return { ...p, sesionesFecha: asistenciasFecha.length };
  });

  if (cargando) return <div className="p-8 text-center">Cargando historial...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800"> Historial y Control</h2>

      <div className="flex gap-4 border-b">
        <button 
          onClick={() => setTab('deportista')} 
          className={`pb-2 px-4 font-medium ${tab === 'deportista' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
        >
          👤 Historial Deportista
        </button>
        <button 
          onClick={() => setTab('profesores')} 
          className={`pb-2 px-4 font-medium ${tab === 'profesores' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
        >
          ‍🏫 Cumplimiento Profesores
        </button>
      </div>

      {tab === 'deportista' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por Nombre o RUT</label>
            <input 
              type="text" 
              value={busqueda} 
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ej: Juan Pérez o 12.345.678-9"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-lg"
            />
          </div>

          {deportistaEncontrado && historialFiltrado.length > 0 && (
            <>
              {usuario?.rol === 'admin' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <p className="text-sm font-bold text-red-800"> Zona de Peligro (Solo Admin)</p>
                    <p className="text-xs text-red-600">Usa esto para borrar datos de prueba que no se eliminaron correctamente.</p>
                  </div>
                  <button 
                    onClick={eliminarHistorialCompleto}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 flex items-center gap-2 whitespace-nowrap"
                  >
                    🗑️ Eliminar TODO el historial de este deportista
                  </button>
                </div>
              )}

              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <p className="text-sm font-medium text-gray-700 mb-2">Filtrar por período:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {['todo', 'semana', 'mes', 'rango'].map((filtro) => (
                    <button 
                      key={filtro}
                      onClick={() => setFiltroTiempo(filtro)} 
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${filtroTiempo === filtro ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      {filtro === 'todo' ? 'Todo el historial' : filtro === 'semana' ? 'Esta Semana' : filtro === 'mes' ? 'Este Mes' : 'Rango Personalizado'}
                    </button>
                  ))}
                </div>
                
                {filtroTiempo === 'rango' && (
                  <div className="flex flex-wrap gap-3 items-center bg-gray-50 p-3 rounded-lg">
                    <label className="text-sm text-gray-600">Desde:</label>
                    <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary outline-none" />
                    <label className="text-sm text-gray-600">Hasta:</label>
                    <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 bg-blue-50 border-b flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {[deportistaEncontrado.primerNombre, deportistaEncontrado.apellidoPaterno].join(' ')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {deportistaEncontrado.categoria} | RUT: {deportistaEncontrado.rut || 'Sin RUT'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Asistencia del período</p>
                    <p className={`text-3xl font-bold ${calcularPorcentaje() >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                      {calcularPorcentaje()}%
                    </p>
                  </div>
                </div>
                
                <div className="p-4">
                  {historialFiltrado.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No hay registros de asistencia para este período.</p>
                  ) : (
                    <div className="space-y-2">
                      {historialFiltrado
                        .sort((a,b) => new Date(b.fecha) - new Date(a.fecha))
                        .map(a => {
                          const reg = (a.registros || []).find(r => String(r.deportistaId) === String(deportistaEncontrado.id));
                          let icono = '⚪', color = 'bg-gray-100 text-gray-700', texto = 'Pendiente';
                          if (reg?.estado === 'presente') { icono = '✅'; color = 'bg-green-100 text-green-800'; texto = 'Presente'; }
                          if (reg?.estado === 'ausente') { icono = '❌'; color = 'bg-red-100 text-red-800'; texto = 'Ausente'; }
                          if (reg?.estado === 'justificado') { icono = ''; color = 'bg-yellow-100 text-yellow-800'; texto = 'Justificado'; }
                          
                          return (
                            <div key={a.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                              <div>
                                <span className="font-medium text-gray-800">{formatearFecha(a.fecha)}</span>
                                <span className="text-sm text-gray-500 ml-2">({a.actividad})</span>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
                                {icono} {texto} {reg?.observacion ? `- ${reg.observacion}` : ''}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {deportistaEncontrado && historialFiltrado.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-blue-800 font-medium text-lg mb-2">
                👤 {deportistaEncontrado.primerNombre} {deportistaEncontrado.apellidoPaterno}
              </p>
              <p className="text-blue-600">
                {deportistaEncontrado.categoria} | RUT: {deportistaEncontrado.rut || 'Sin RUT'}
              </p>
              <p className="text-blue-500 mt-4">
                📭 Este deportista no tiene registros de asistencia{filtroTiempo !== 'todo' ? ' en el período seleccionado' : ''}.
              </p>
              {usuario?.rol === 'admin' && busqueda && (
                <button 
                  onClick={() => setBusqueda('')}
                  className="mt-4 text-blue-700 underline text-sm hover:text-blue-900"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}

          {busqueda && !deportistaEncontrado && (
            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg text-center">
              No se encontró ningún deportista con "{busqueda}".
            </div>
          )}
        </div>
      )}

      {tab === 'profesores' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-semibold text-gray-700">‍🏫 Cumplimiento de Profesores</h3>
              <p className="text-sm text-gray-500">Revisa quién registró asistencia en una fecha específica.</p>
            </div>
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-300">
              <label className="text-sm font-medium text-gray-700">📅 Revisar fecha:</label>
              <input 
                type="date" 
                value={fechaRevision} 
                onChange={e => setFechaRevision(e.target.value)} 
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary outline-none" 
              />
            </div>
          </div>
          
          <table className="w-full text-left">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-700">Profesor</th>
                <th className="p-4 font-semibold text-gray-700">Cargo</th>
                <th className="p-4 font-semibold text-gray-700 text-center">Sesiones el {formatearFecha(fechaRevision)}</th>
                <th className="p-4 font-semibold text-gray-700 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cumplimientoProfesores.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{p.nombre}</td>
                  <td className="p-4 text-sm text-gray-600">{p.cargo}</td>
                  <td className="p-4 text-center text-xl font-bold">{p.sesionesFecha}</td>
                  <td className="p-4 text-center">
                    {p.sesionesFecha > 0 ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">✅ Cumplió</span>
                    ) : (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">⚠️ Sin registros</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
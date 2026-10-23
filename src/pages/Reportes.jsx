import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { obtenerTodasLasAsistencias } from '../firebase/asistencia';
import { obtenerProfesores } from '../firebase/profesores';

export default function Reportes() {
  const [asistencias, setAsistencias] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('deportistas'); // 'deportistas' o 'profesores'
  
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [categoria, setCategoria] = useState('');
  const [filas, setFilas] = useState([]);

  const categoriasDisponibles = ['TODAS', 'ESCUELITA', 'SUB 9', 'SUB 10', 'SUB 11', 'SUB 13 FEM', 'SUB 13 MASC', 'SUB 15 FEM', 'SUB 15 MASC', 'SUB 17 FEM', 'SUB 17 MASC', 'SUB 19 FEM', 'SUB 19 MASC', 'SUB 23 FEM', 'SUB 23 MASC', 'ADULTA FEM', 'ADULTA MASC', 'ARQUEROS'];

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const [datosAsis, datosProfs] = await Promise.all([
      obtenerTodasLasAsistencias(),
      obtenerProfesores()
    ]);
    datosAsis.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    setAsistencias(datosAsis);
    setProfesores(datosProfs);
    setCargando(false);
  };

 const generarReporteDeportistas = () => {
  const datosFiltrados = [];
  const registrosVistos = new Set(); // ← NUEVO: Para detectar duplicados
  
  asistencias.forEach(asistencia => {
    if (categoria && categoria !== 'TODAS' && asistencia.categoria !== categoria) return;
    if (fechaInicio && asistencia.fecha < fechaInicio) return;
    if (fechaFin && asistencia.fecha > fechaFin) return;

    asistencia.registros.forEach(reg => {
      // ← NUEVO: Crear clave única para detectar duplicados
      const claveUnica = `${asistencia.fecha}|${asistencia.categoria}|${asistencia.actividad}|${reg.deportistaId || reg.nombre}`;
      
      // ← NUEVO: Solo agregar si no existe
      if (!registrosVistos.has(claveUnica)) {
        registrosVistos.add(claveUnica);
        
        datosFiltrados.push({
          'Fecha': asistencia.fecha,
          'Categoría': asistencia.categoria,
          'Actividad': asistencia.actividad,
          'Deportista': reg.nombre,
          'Estado': reg.estado.toUpperCase(),
          'Observación': reg.observacion || '',
          'Profesor': asistencia.profesorNombre
        });
      }
    });
  });

  setFilas(datosFiltrados);
  if (datosFiltrados.length === 0) return alert("No hay datos con esos filtros.");

  const worksheet = XLSX.utils.json_to_sheet(datosFiltrados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia Deportistas");
  worksheet['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 20 }];
  XLSX.writeFile(workbook, `Reporte_Deportistas_${fechaInicio || 'Inicio'}_${fechaFin || 'Fin'}.xlsx`);
};

  // --- LÓGICA REPORTE PROFESORES (CUMPLIMIENTO) ---
  const generarReporteProfesores = () => {
    const datosFiltrados = [];
    
    // 1. Filtrar asistencias por rango de fechas
    const asistenciasFiltradas = asistencias.filter(a => {
      if (fechaInicio && a.fecha < fechaInicio) return false;
      if (fechaFin && a.fecha > fechaFin) return false;
      return true;
    });

    // 2. Agrupar por profesor
    const mapaProfesores = {};
    asistenciasFiltradas.forEach(a => {
      const nombre = a.profesorNombre || 'Desconocido';
      if (!mapaProfesores[nombre]) {
        const profReal = profesores.find(p => p.nombre === nombre);
        mapaProfesores[nombre] = {
          'Profesor': nombre,
          'Cargo': profReal ? profReal.cargo : 'Sin cargo asignado',
          'Total Sesiones Registradas': 0,
          'Fechas de Registro': []
        };
      }
      mapaProfesores[nombre]['Total Sesiones Registradas']++;
      mapaProfesores[nombre]['Fechas de Registro'].push(a.fecha);
    });

    // 3. Convertir a lista y formatear fechas
    Object.values(mapaProfesores).forEach(p => {
      p['Fechas de Registro'] = p['Fechas de Registro'].sort().join(', ');
      datosFiltrados.push(p);
    });

    setFilas(datosFiltrados);
    if (datosFiltrados.length === 0) return alert("No hay registros de profesores en este rango de fechas.");

    const worksheet = XLSX.utils.json_to_sheet(datosFiltrados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cumplimiento Profesores");
    worksheet['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 50 }];
    XLSX.writeFile(workbook, `Cumplimiento_Profesores_${fechaInicio || 'Inicio'}_${fechaFin || 'Fin'}.xlsx`);
  };

  if (cargando) return <div className="p-8 text-center">Cargando datos...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">📋 Reportes y Exportación</h2>

      {/* Pestañas */}
      <div className="flex gap-4 border-b">
        <button onClick={() => { setTab('deportistas'); setFilas([]); }} className={`pb-2 px-4 font-medium ${tab === 'deportistas' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>
          👥 Asistencia Deportistas
        </button>
        <button onClick={() => { setTab('profesores'); setFilas([]); }} className={`pb-2 px-4 font-medium ${tab === 'profesores' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>
          ‍🏫 Cumplimiento Técnicos
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-semibold text-gray-700 mb-4">1. Selecciona los filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tab === 'deportistas' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
                {categoriasDisponibles.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          )}
          <div className={tab === 'profesores' ? 'md:col-span-1' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div className={tab === 'profesores' ? 'md:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
          </div>
        </div>
      </div>
// Agrega este botón temporal antes del botón de generar reporte
<button 
  onClick={async () => {
    if (confirm("️ Esto eliminará duplicados de Firestore. ¿Continuar?")) {
      const { limpiarDuplicadosAsistencias } = await import('../utils/limpiarDuplicados');
      const resultado = await limpiarDuplicadosAsistencias();
      alert(`✅ Se eliminaron ${resultado.eliminados} registros duplicados`);
      cargarDatos(); // Recargar datos
    }
  }}
  className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-700"
>
   Limpiar duplicados (SOLO UNA VEZ)
</button>

      {/* Botón de acción */}
      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div>
          <p className="font-medium text-blue-900">Registros encontrados:</p>
          <p className="text-2xl font-bold text-primary">{filas.length}</p>
        </div>
        <button 
          onClick={tab === 'deportistas' ? generarReporteDeportistas : generarReporteProfesores}
          className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg"
        >
          📥 Generar y Descargar Excel
        </button>
      </div>

      {/* Vista previa */}
      {filas.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-700">Vista Previa (Primeros 50 registros)</h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  {tab === 'deportistas' ? (
                    <>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3">Deportista</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Profesor</th>
                    </>
                  ) : (
                    <>
                      <th className="p-3">Profesor</th>
                      <th className="p-3">Cargo</th>
                      <th className="p-3">Total Sesiones</th>
                      <th className="p-3">Fechas</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filas.slice(0, 50).map((fila, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    {tab === 'deportistas' ? (
                      <>
                        <td className="p-3">{fila.Fecha}</td>
                        <td className="p-3">{fila.Categoría}</td>
                        <td className="p-3 font-medium">{fila.Deportista}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            fila.Estado === 'PRESENTE' ? 'bg-green-100 text-green-800' : 
                            fila.Estado === 'AUSENTE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {fila.Estado}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600">{fila.Profesor}</td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 font-medium">{fila.Profesor}</td>
                        <td className="p-3 text-gray-600">{fila.Cargo}</td>
                        <td className="p-3 text-center font-bold text-lg">{fila['Total Sesiones Registradas']}</td>
                        <td className="p-3 text-xs text-gray-500">{fila['Fechas de Registro']}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
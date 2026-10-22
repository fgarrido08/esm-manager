import { useState, useEffect } from 'react';
import { obtenerDeportistas } from '../firebase/deportistas';
import { obtenerProfesores } from '../firebase/profesores';
import { obtenerCategorias } from '../firebase/categorias';
import { obtenerTodasLasAsistencias } from '../firebase/asistencia';

export default function Dashboard() {
  const [stats, setStats] = useState({
    deportistas: 0,
    profesores: 0,
    categorias: 0,
    actividades: 3,
    sesionesHoy: [],
    asistenciasHoyPorActividad: { 'Hockey Patines': [], 'Preparación Física': [], 'Preparación Arqueros': [] },
    cargando: true
  });

  const hoy = new Date().toISOString().split('T')[0];

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    const [deportistas, profesores, categorias, asistencias] = await Promise.all([
      obtenerDeportistas(),
      obtenerProfesores(),
      obtenerCategorias(),
      obtenerTodasLasAsistencias()
    ]);

    // Filtrar asistencias de hoy
    const sesionesHoy = asistencias.filter(a => a.fecha === hoy);

    // Organizar por actividad
    const porActividad = { 'Hockey Patines': [], 'Preparación Física': [], 'Preparación Arqueros': [] };
    sesionesHoy.forEach(s => {
      if (porActividad[s.actividad]) {
        porActividad[s.actividad].push(s);
      }
    });

    setStats({
      deportistas: deportistas.length,
      profesores: profesores.length,
      categorias: categorias.length,
      actividades: 3,
      sesionesHoy,
      asistenciasHoyPorActividad: porActividad,
      cargando: false
    });
  };

  const formatearFecha = (f) => { const [y, m, d] = f.split('-'); return `${d}/${m}/${y}`; };

  if (stats.cargando) return <div className="p-8 text-center text-gray-500">Cargando Dashboard...</div>;

  const usuarioActivo = JSON.parse(localStorage.getItem('usuarioActivo') || '{}');

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">🏠 Dashboard</h2>
        <span className="text-gray-500">Bienvenido, {usuarioActivo.nombre || 'Usuario'}</span>
      </div>

      {/* Tarjetas de Resumen General */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm font-medium">👥 Deportistas</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{stats.deportistas}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-green-500">
          <p className="text-gray-500 text-sm font-medium">👨‍🏫 Profesores</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{stats.profesores}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-purple-500">
          <p className="text-gray-500 text-sm font-medium"> Categorías</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{stats.categorias}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-orange-500">
          <p className="text-gray-500 text-sm font-medium"> Actividades</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{stats.actividades}</p>
        </div>
      </div>

      {/* Widget: Asistencias de Hoy */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <h3 className="font-bold text-blue-900 text-lg">🏑 Asistencias de Hoy ({formatearFecha(hoy)})</h3>
          <p className="text-sm text-blue-700">Categorías que ya registraron asistencia hoy</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {/* Columna Hockey */}
          <div className="p-4">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">🏑 Hockey Patines</h4>
            {stats.asistenciasHoyPorActividad['Hockey Patines'].length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sin registros hoy</p>
            ) : (
              <ul className="space-y-2">
                {stats.asistenciasHoyPorActividad['Hockey Patines'].map(s => (
                  <li key={s.id} className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
                    <span className="font-medium text-green-800">{s.categoria}</span>
                    <span className="text-xs text-green-600 block">Por: {s.profesorNombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Columna Prep. Física */}
          <div className="p-4">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">🏃 Preparación Física</h4>
            {stats.asistenciasHoyPorActividad['Preparación Física'].length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sin registros hoy</p>
            ) : (
              <ul className="space-y-2">
                {stats.asistenciasHoyPorActividad['Preparación Física'].map(s => (
                  <li key={s.id} className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
                    <span className="font-medium text-green-800">{s.categoria}</span>
                    <span className="text-xs text-green-600 block">Por: {s.profesorNombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Columna Arqueros */}
          <div className="p-4">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">🥅 Preparación Arqueros</h4>
            {stats.asistenciasHoyPorActividad['Preparación Arqueros'].length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sin registros hoy</p>
            ) : (
              <ul className="space-y-2">
                {stats.asistenciasHoyPorActividad['Preparación Arqueros'].map(s => (
                  <li key={s.id} className="bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
                    <span className="font-medium text-green-800">{s.categoria}</span>
                    <span className="text-xs text-green-600 block">Por: {s.profesorNombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Historial de Sesiones de Hoy */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="font-bold text-gray-700 text-lg"> Historial de Sesiones de Hoy</h3>
        </div>
        {stats.sesionesHoy.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">Aún no hay sesiones guardadas hoy.</p>
            <p className="text-sm mt-2">¡Anima a los profesores a pasar lista!</p>
          </div>
        ) : (
          <div className="divide-y">
            {stats.sesionesHoy.map(s => {
              const presentes = s.registros.filter(r => r.estado === 'presente').length;
              const ausentes = s.registros.filter(r => r.estado === 'ausente').length;
              const justificados = s.registros.filter(r => r.estado === 'justificado').length;
              const total = s.registros.length;

              return (
                <div key={s.id} className="p-4 hover:bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {s.categoria} <span className="text-gray-500 font-normal">- {s.actividad}</span>
                      </p>
                      <p className="text-xs text-gray-500">Registrado por: {s.profesorNombre}</p>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">✅ {presentes}</span>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">❌ {ausentes}</span>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">🤒 {justificados}</span>
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full font-bold">👥 {total}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
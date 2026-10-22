import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { obtenerDeportistas } from '../firebase/deportistas';

export default function Tarjetas() {
  const [usuario, setUsuario] = useState(null);
  const [deportistas, setDeportistas] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados para el modal (Agregar/Editar)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formData, setFormData] = useState({
    deportistaId: '',
    tipo: 'azul', // azul, roja, amarilla
    torneo: 'Regular', // Regular, Liga Honor
    numeroTarjeta: '',
    estado: 'pendiente', // pendiente, espera_fallo, cumplida, suspendido
    partidoCumplido: '',
    fechaPartido: new Date().toISOString().split('T')[0],
    rival: '',
    observaciones: ''
  });

  // Estados para filtros
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroTorneo, setFiltroTorneo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  useEffect(() => {
    const datosUsuario = localStorage.getItem('usuarioActivo');
    if (datosUsuario) setUsuario(JSON.parse(datosUsuario));
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [depsSnapshot, tarjetasSnapshot] = await Promise.all([
        obtenerDeportistas(),
        getDocs(collection(db, 'tarjetas'))
      ]);
      
      // Ordenar deportistas por nombre para el dropdown
      const depsOrdenados = depsSnapshot.sort((a, b) => 
        `${a.primerNombre} ${a.apellidoPaterno}`.localeCompare(`${b.primerNombre} ${b.apellidoPaterno}`)
      );
      setDeportistas(depsOrdenados);
      
      const tarjetasData = tarjetasSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenar por fecha descendente
      tarjetasData.sort((a, b) => new Date(b.fechaPartido) - new Date(a.fechaPartido));
      setTarjetas(tarjetasData);
    } catch (error) {
      console.error("Error cargando datos:", error);
      alert("❌ Error al cargar los datos");
    }
    setCargando(false);
  };

  // ✅ Lógica para contar tarjetas azules activas de un deportista
  const contarTarjetasAzules = (deportistaId) => {
    return tarjetas.filter(t => 
      t.deportistaId === deportistaId && 
      t.tipo === 'azul' && 
      t.estado !== 'cumplida' // Si ya cumplió la suspensión, no suma para la próxima
    ).length;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Lógica automática de estados según el tipo de tarjeta
      if (name === 'tipo') {
        if (value === 'roja') newData.estado = 'espera_fallo';
        else if (value === 'amarilla') newData.estado = 'cumplida';
        else newData.estado = 'pendiente';
      }
      return newData;
    });
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!formData.deportistaId || !formData.numeroTarjeta) {
      return alert("⚠️ Completa el deportista y el número de tarjeta");
    }

    // ✅ Validación de 5 tarjetas azules
    if (formData.tipo === 'azul' && formData.estado === 'pendiente') {
      const azulesActuales = contarTarjetasAzules(formData.deportistaId);
      if (azulesActuales >= 4) {
        const confirmacion = window.confirm(
          "⚠️ ¡ALERTA! Este deportista alcanzará o ya tiene 5 Tarjetas Azules.\n" +
          "Esto genera una SUSPENSIÓN AUTOMÁTICA de 1 partido.\n\n" +
          "¿Deseas continuar y registrar la suspensión?"
        );
        if (!confirmacion) return;
        
        // Marcar automáticamente como suspendido si llega a 5
        if (azulesActuales === 4) {
          formData.estado = 'suspendido';
          formData.observaciones = (formData.observaciones || '') + ' | Suspensión automática por 5ta tarjeta azul';
        }
      }
    }

    try {
      const deportista = deportistas.find(d => d.id === formData.deportistaId);
      const datosAGuardar = {
        ...formData,
        deportistaNombre: `${deportista.primerNombre} ${deportista.apellidoPaterno}`,
        categoria: deportista.categoria,
        fechaActualizacion: new Date().toISOString(),
        modificadoPor: usuario?.nombre || 'Sistema'
      };

      if (editandoId) {
        await updateDoc(doc(db, 'tarjetas', editandoId), datosAGuardar);
        alert("✅ Tarjeta actualizada correctamente");
      } else {
        datosAGuardar.fechaCreacion = new Date().toISOString();
        datosAGuardar.creadoPor = usuario?.nombre || 'Sistema';
        await addDoc(collection(db, 'tarjetas'), datosAGuardar);
        alert("✅ Tarjeta registrada correctamente");
      }

      setModalAbierto(false);
      setEditandoId(null);
      setFormData({
        deportistaId: '', tipo: 'azul', torneo: 'Regular', numeroTarjeta: '',
        estado: 'pendiente', partidoCumplido: '', fechaPartido: new Date().toISOString().split('T')[0],
        rival: '', observaciones: ''
      });
      await cargarDatos();
    } catch (error) {
      alert("❌ Error al guardar: " + error.message);
    }
  };

  const handleEditar = (tarjeta) => {
    setFormData({
      deportistaId: tarjeta.deportistaId,
      tipo: tarjeta.tipo,
      torneo: tarjeta.torneo,
      numeroTarjeta: tarjeta.numeroTarjeta,
      estado: tarjeta.estado,
      partidoCumplido: tarjeta.partidoCumplido || '',
      fechaPartido: tarjeta.fechaPartido,
      rival: tarjeta.rival || '',
      observaciones: tarjeta.observaciones || ''
    });
    setEditandoId(tarjeta.id);
    setModalAbierto(true);
  };

  const handleEliminar = async (id) => {
    const confirmacion = window.confirm("⚠️ ¿Estás seguro de eliminar este registro de tarjeta? Esta acción no se puede deshacer.");
    if (!confirmacion) return;

    try {
      await deleteDoc(doc(db, 'tarjetas', id));
      alert("🗑️ Registro eliminado");
      await cargarDatos();
    } catch (error) {
      alert("❌ Error al eliminar: " + error.message);
    }
  };

  // Filtrado de la tabla
  const tarjetasFiltradas = tarjetas.filter(t => {
    const cumpleCategoria = filtroCategoria === 'todas' || t.categoria === filtroCategoria;
    const cumpleTorneo = filtroTorneo === 'todos' || t.torneo === filtroTorneo;
    const cumpleEstado = filtroEstado === 'todos' || t.estado === filtroEstado;
    return cumpleCategoria && cumpleTorneo && cumpleEstado;
  });

  const categoriasUnicas = [...new Set(deportistas.map(d => d.categoria).filter(Boolean))].sort();

  if (cargando) return <div className="p-8 text-center text-xl font-bold text-gray-600">Cargando módulo de tarjetas...</div>;

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">🟥🟦 Control de Tarjetas</h2>
          <p className="text-gray-600 mt-1">Gestión de sanciones y cumplimientos - Estudiantil San Miguel</p>
        </div>
        <button 
          onClick={() => { setEditandoId(null); setModalAbierto(true); }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-md"
        >
          ➕ Registrar Nueva Tarjeta
        </button>
      </div>

      {/* RESUMEN RÁPIDO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <p className="text-sm text-blue-700 font-medium">Tarjetas Azules Pendientes</p>
          <p className="text-2xl font-bold text-blue-900">{tarjetas.filter(t => t.tipo === 'azul' && t.estado === 'pendiente').length}</p>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-sm text-red-700 font-medium">Tarjetas Rojas (Espera Fallo)</p>
          <p className="text-2xl font-bold text-red-900">{tarjetas.filter(t => t.estado === 'espera_fallo').length}</p>
        </div>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
          <p className="text-sm text-yellow-700 font-medium">Suspensiones Cumplidas (CR)</p>
          <p className="text-2xl font-bold text-yellow-900">{tarjetas.filter(t => t.estado === 'cumplida').length}</p>
        </div>
        <div className="bg-gray-100 border-l-4 border-gray-600 p-4 rounded-lg">
          <p className="text-sm text-gray-700 font-medium">Deportistas Suspendidos (S)</p>
          <p className="text-2xl font-bold text-gray-900">{tarjetas.filter(t => t.estado === 'suspendido').length}</p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-lg shadow-md flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-600 mb-1">Categoría</label>
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
            <option value="todas">Todas las categorías</option>
            {categoriasUnicas.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-600 mb-1">Torneo</label>
          <select value={filtroTorneo} onChange={(e) => setFiltroTorneo(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
            <option value="todos">Todos</option>
            <option value="Regular">Regular (R)</option>
            <option value="Liga Honor">Liga de Honor (L)</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-600 mb-1">Estado</label>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="espera_fallo">Espera Fallo Tribunal</option>
            <option value="cumplida">Cumplida (CR)</option>
            <option value="suspendido">Suspendido (S)</option>
          </select>
        </div>
      </div>

      {/* TABLA DE TARJETAS */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-700">Deportista / Categoría</th>
                <th className="p-4 font-semibold text-gray-700 text-center">Tipo</th>
                <th className="p-4 font-semibold text-gray-700">N° Tarjeta</th>
                <th className="p-4 font-semibold text-gray-700">Torneo</th>
                <th className="p-4 font-semibold text-gray-700 text-center">Estado</th>
                <th className="p-4 font-semibold text-gray-700 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tarjetasFiltradas.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">No hay registros de tarjetas con estos filtros</td></tr>
              ) : (
                tarjetasFiltradas.map(t => {
                  const azulesAcumuladas = contarTarjetasAzules(t.deportistaId);
                  const alertaCincoAzules = t.tipo === 'azul' && azulesAcumuladas >= 5;

                  return (
                    <tr key={t.id} className={`hover:bg-gray-50 ${alertaCincoAzules ? 'bg-red-50' : ''}`}>
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{t.deportistaNombre}</div>
                        <div className="text-xs text-gray-500">{t.categoria}</div>
                        {alertaCincoAzules && (
                          <span className="inline-block mt-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                            ⚠️ {azulesAcumuladas} Tarjetas Azules (Suspendido)
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {t.tipo === 'azul' && <span className="text-2xl" title="Tarjeta Azul">🟦</span>}
                        {t.tipo === 'roja' && <span className="text-2xl" title="Tarjeta Roja">🟥</span>}
                        {t.tipo === 'amarilla' && <span className="text-2xl" title="Cumplimiento">🟨</span>}
                      </td>
                      <td className="p-4 font-mono font-bold text-gray-700">{t.numeroTarjeta}</td>
                      <td className="p-4 text-sm">{t.torneo}</td>
                      <td className="p-4 text-center">
                        {t.estado === 'pendiente' && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">Pendiente</span>}
                        {t.estado === 'espera_fallo' && <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-bold">Espera Fallo</span>}
                        {t.estado === 'cumplida' && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">Cumplida (CR)</span>}
                        {t.estado === 'suspendido' && <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold">Suspendido (S)</span>}
                        {t.partidoCumplido && <div className="text-xs text-gray-500 mt-1">Partido N°: {t.partidoCumplido}</div>}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleEditar(t)} className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-200" title="Editar / Corregir">✏️</button>
                          <button onClick={() => handleEliminar(t.id)} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-200" title="Eliminar registro">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE AGREGAR / EDITAR */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">{editandoId ? '✏️ Editar Registro de Tarjeta' : '➕ Registrar Nueva Tarjeta'}</h3>
              <button onClick={() => setModalAbierto(false)} className="text-2xl text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Deportista *</label>
                <select name="deportistaId" value={formData.deportistaId} onChange={handleInputChange} required className="w-full px-3 py-2 border rounded-lg">
                  <option value="">-- Seleccionar Deportista --</option>
                  {deportistas.map(d => (
                    <option key={d.id} value={d.id}>{d.primerNombre} {d.apellidoPaterno} ({d.categoria})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Tarjeta *</label>
                  <select name="tipo" value={formData.tipo} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="azul">🟦 Tarjeta Azul (Acumulativa)</option>
                    <option value="roja">🟥 Tarjeta Roja (Espera fallo tribunal)</option>
                    <option value="amarilla">🟨 Cumplimiento de Suspensión (CR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">N° de Tarjeta (Ej: R000033, L000008) *</label>
                  <input type="text" name="numeroTarjeta" value={formData.numeroTarjeta} onChange={handleInputChange} required placeholder="Ej: R000033" className="w-full px-3 py-2 border rounded-lg uppercase" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Torneo</label>
                  <select name="torneo" value={formData.torneo} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="Regular">Regular (R)</option>
                    <option value="Liga Honor">Liga de Honor (L)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fecha del Partido</label>
                  <input type="date" name="fechaPartido" value={formData.fechaPartido} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Estado Actual</label>
                  <select name="estado" value={formData.estado} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="pendiente">Pendiente</option>
                    <option value="espera_fallo">Espera Fallo Tribunal</option>
                    <option value="cumplida">Cumplida (CR)</option>
                    <option value="suspendido">Suspendido (S)</option>
                  </select>
                </div>
                {formData.estado === 'cumplida' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">N° de Partido Cumplido</label>
                    <input type="number" name="partidoCumplido" value={formData.partidoCumplido} onChange={handleInputChange} placeholder="Ej: 1" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Rival (Opcional)</label>
                  <input type="text" name="rival" value={formData.rival} onChange={handleInputChange} placeholder="Ej: Palestino" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones</label>
                  <input type="text" name="observaciones" value={formData.observaciones} onChange={handleInputChange} placeholder="Ej: Agresión, doble amarilla..." className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setModalAbierto(false)} className="flex-1 bg-gray-200 py-3 rounded-lg font-bold hover:bg-gray-300">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">💾 Guardar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
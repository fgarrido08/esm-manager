import { useState, useEffect } from 'react';
import { obtenerDeportistas, agregarDeportista, eliminarDeportista, actualizarDeportista } from '../firebase/deportistas';
import { obtenerCategorias } from '../firebase/categorias';
import { ordenarCategorias } from '../utils/ordenarCategorias';

export default function Deportistas() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('todas'); // NUEVO: filtro por categoría
  
  const formularioVacio = {
    primerNombre: '', segundoNombre: '', apellidoPaterno: '', apellidoMaterno: '',
    rut: '', fechaNacimiento: '', sexo: 'Masculino', categoria: '',
    apoderadoNombre: '', apoderadoTelefono: '', apoderadoEmail: '',
    grupoSanguineo: 'O+', alergias: 'Ninguna'
  };
  const [form, setForm] = useState(formularioVacio);

  useEffect(() => { cargarDatos(); cargarCategorias(); }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const datos = await obtenerDeportistas();
    setLista(datos);
    setCargando(false);
  };

  const cargarCategorias = async () => {
    const cats = await obtenerCategorias();
    // ORDENAR las categorías usando la función
    const categoriasOrdenadas = ordenarCategorias(cats.map(c => c.nombre));
    setCategoriasDisponibles(categoriasOrdenadas);
  };

  const abrirModal = (deportista = null) => {
    if (deportista) {
      setEditandoId(deportista.id);
      setForm(deportista);
    } else {
      setEditandoId(null);
      setForm({ ...formularioVacio, categoria: categoriasDisponibles[0] || '' });
    }
    setMostrarModal(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!form.primerNombre || !form.apellidoPaterno) return alert("Nombre y Apellido Paterno obligatorios");
    try {
      if (editandoId) await actualizarDeportista(editandoId, form);
      else await agregarDeportista(form);
      setMostrarModal(false);
      await cargarDatos();
    } catch (error) { alert("Error: " + error.message); }
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Eliminar deportista?")) {
      await eliminarDeportista(id);
      await cargarDatos();
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const getNombreCompleto = (d) => [d.primerNombre, d.segundoNombre, d.apellidoPaterno, d.apellidoMaterno].filter(p => p).join(' ') || 'Sin nombre';

  // NUEVO: Filtrar y ordenar la lista por categoría
  const listaFiltrada = lista
    .filter(d => filtroCategoria === 'todas' || d.categoria === filtroCategoria)
    .sort((a, b) => {
      // Primero ordenar por categoría (usando el orden correcto)
      const ordenCats = [
        'ESCUELITA', 'SUB 11 MIXTO', 'SUB 10 MIXTO', 'SUB 9 MIXTO',
        'SUB 13 FEMENINA', 'SUB 13 MASCULINA',
        'SUB 15 FEMENINA', 'SUB 15 MASCULINA',
        'SUB 17 FEMENINA', 'SUB 17 MASCULINA',
        'SUB 19 FEMENINA', 'SUB 19 MASCULINA',
        'SUB 23 FEMENINA', 'SUB 23 MASCULINA',
        'ADULTA FEMENINA', 'ADULTA MASCULINA'
      ];
      const idxA = ordenCats.indexOf((a.categoria || '').toUpperCase());
      const idxB = ordenCats.indexOf((b.categoria || '').toUpperCase());
      if (idxA !== idxB) return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      // Luego alfabéticamente por apellido
      return (a.apellidoPaterno || '').localeCompare(b.apellidoPaterno || '');
    });

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-3xl font-bold text-gray-800">👥 Deportistas</h2>
        <div className="flex gap-2 flex-wrap">
          {/* NUEVO: Filtro por categoría */}
          <select 
            value={filtroCategoria} 
            onChange={(e) => setFiltroCategoria(e.target.value)} 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="todas">Todas las categorías</option>
            {categoriasDisponibles.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <button onClick={() => abrirModal()} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors">+ Nuevo Deportista</button>
        </div>
      </div>

      {cargando ? <p className="text-gray-500">Cargando...</p> : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="p-4 bg-gray-50 border-b text-sm text-gray-600">
            Mostrando <b>{listaFiltrada.length}</b> de <b>{lista.length}</b> deportistas
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-700">Nombre Completo</th>
                <th className="p-4 font-semibold text-gray-700">RUT</th>
                <th className="p-4 font-semibold text-gray-700">Categoría</th>
                <th className="p-4 font-semibold text-gray-700">Sexo</th>
                <th className="p-4 font-semibold text-gray-700 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-gray-500">No hay deportistas registrados.</td></tr> : (
                listaFiltrada.map((d) => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{getNombreCompleto(d)}</td>
                    <td className="p-4 text-gray-600">{d.rut || 'Sin RUT'}</td>
                    <td className="p-4"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{d.categoria}</span></td>
                    <td className="p-4"><span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">{d.sexo || 'No especificado'}</span></td>
                    <td className="p-4 text-center space-x-2">
                      <button onClick={() => abrirModal(d)} className="text-blue-500 hover:text-blue-700 p-2">✏️</button>
                      <button onClick={() => handleEliminar(d.id)} className="text-red-500 hover:text-red-700 p-2">🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6 sticky top-0 bg-white pb-4 border-b">{editandoId ? '✏️ Editar Deportista' : '➕ Nuevo Deportista'}</h3>
            <form onSubmit={handleGuardar} className="space-y-6">
              <div className="border-b pb-6">
                <h4 className="font-semibold text-gray-700 mb-4">👤 Datos Personales</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Primer Nombre *</label><input type="text" name="primerNombre" value={form.primerNombre} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Segundo Nombre</label><input type="text" name="segundoNombre" value={form.segundoNombre} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Apellido Paterno *</label><input type="text" name="apellidoPaterno" value={form.apellidoPaterno} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Apellido Materno</label><input type="text" name="apellidoMaterno" value={form.apellidoMaterno} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">RUT</label><input type="text" name="rut" value={form.rut} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="12.345.678-9" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label><input type="date" name="fechaNacimiento" value={form.fechaNacimiento} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label><select name="sexo" value={form.sexo} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"><option>Masculino</option><option>Femenino</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label><select name="categoria" value={form.categoria} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none">{categoriasDisponibles.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                </div>
              </div>
              <div className="border-b pb-6">
                <h4 className="font-semibold text-gray-700 mb-4">‍👩‍ Datos del Apoderado</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Apoderado</label><input type="text" name="apoderadoNombre" value={form.apoderadoNombre} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="tel" name="apoderadoTelefono" value={form.apoderadoTelefono} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label><input type="email" name="apoderadoEmail" value={form.apoderadoEmail} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" /></div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-4"> Salud</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Grupo Sanguíneo</label><select name="grupoSanguineo" value={form.grupoSanguineo} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"><option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Alergias / Observaciones Médicas</label><textarea name="alergias" value={form.alergias} onChange={handleChange} rows="2" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"></textarea></div>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium">Cancelar</button>
                <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium">{editandoId ? '💾 Actualizar' : '✅ Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { obtenerProfesores, agregarProfesor, eliminarProfesor, actualizarProfesor } from '../firebase/profesores';
import { obtenerCategorias } from '../firebase/categorias';

export default function Profesores() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [verPasswordId, setVerPasswordId] = useState(null);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  
  const formularioVacio = { nombre: '', cargo: 'Entrenador Escuela', categorias: [], password: '' };
  const [form, setForm] = useState(formularioVacio);
  const cargos = ['Entrenador Jefe', 'Entrenador', 'Entrenador Escuela', 'Preparador Físico', 'Entrenador Arqueros'];

  useEffect(() => { cargarDatos(); cargarCategorias(); }, []);

  const cargarDatos = async () => { setCargando(true); const datos = await obtenerProfesores(); setLista(datos); setCargando(false); };
  const cargarCategorias = async () => { const cats = await obtenerCategorias(); setCategoriasDisponibles(cats.map(c => c.nombre)); };

  const abrirModal = (profesor = null) => {
    if (profesor) { setEditandoId(profesor.id); setForm(profesor); } 
    else { setEditandoId(null); setForm({ ...formularioVacio, categorias: [] }); }
    setMostrarModal(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.password) return alert("Nombre y contraseña obligatorios");
    try {
      if (editandoId) await actualizarProfesor(editandoId, form);
      else await agregarProfesor({ ...form, cambioForzado: true });
      setMostrarModal(false); await cargarDatos();
    } catch (error) { alert("Error: " + error.message); }
  };

  const handleEliminar = async (id) => { if (window.confirm("¿Eliminar profesor?")) { await eliminarProfesor(id); await cargarDatos(); } };
  const toggleCategoria = (cat) => { const nuevasCats = form.categorias.includes(cat) ? form.categorias.filter(c => c !== cat) : [...form.categorias, cat]; setForm({ ...form, categorias: nuevasCats }); };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">👨‍ Gestión de Profesores</h2>
        <button onClick={() => abrirModal()} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors">+ Nuevo Profesor</button>
      </div>
      {cargando ? <p className="text-gray-500">Cargando...</p> : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-700">Nombre</th>
                <th className="p-4 font-semibold text-gray-700">Cargo</th>
                <th className="p-4 font-semibold text-gray-700">Categorías</th>
                <th className="p-4 font-semibold text-gray-700">Contraseña</th>
                <th className="p-4 font-semibold text-gray-700 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? <tr><td colSpan="5" className="p-8 text-center text-gray-500">No hay profesores registrados.</td></tr> : (
                lista.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{p.nombre}</td>
                    <td className="p-4 text-sm text-gray-600">{p.cargo}</td>
                    <td className="p-4"><div className="flex flex-wrap gap-1">{p.categorias?.map(cat => <span key={cat} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{cat}</span>)}</div></td>
                    <td className="p-4 font-mono text-sm flex items-center gap-2"><span className="flex-1">{verPasswordId === p.id ? p.password : '••••••'}</span><button onClick={() => setVerPasswordId(verPasswordId === p.id ? null : p.id)} className="text-gray-500 hover:text-primary p-1">{verPasswordId === p.id ? '' : '👁️'}</button></td>
                    <td className="p-4 text-center space-x-2"><button onClick={() => abrirModal(p)} className="text-blue-500 hover:text-blue-700 p-2">️</button><button onClick={() => handleEliminar(p.id)} className="text-red-500 hover:text-red-700 p-2">🗑️</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">{editandoId ? '️ Editar Profesor' : '➕ Nuevo Profesor'}</h3>
            <form onSubmit={handleGuardar} className="space-y-6">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label><input type="text" name="nombre" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label><select name="cargo" value={form.cargo} onChange={(e) => setForm({...form, cargo: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">{cargos.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-2">Categorías que entrena</label><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{categoriasDisponibles.map(cat => (<label key={cat} className="flex items-center space-x-2 bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100"><input type="checkbox" checked={form.categorias.includes(cat)} onChange={() => toggleCategoria(cat)} className="rounded text-primary focus:ring-primary" /><span className="text-sm">{cat}</span></label>))}</div></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de acceso</label><input type="text" name="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono" placeholder="Mínimo 4 caracteres" required /></div>
              <div className="flex gap-3 pt-4 border-t"><button type="button" onClick={() => setMostrarModal(false)} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium">Cancelar</button><button type="submit" className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium">{editandoId ? '💾 Actualizar' : '✅ Guardar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
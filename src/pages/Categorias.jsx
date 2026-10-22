import { useState, useEffect } from 'react';
import { obtenerCategorias, agregarCategoria, eliminarCategoria, actualizarCategoria } from '../firebase/categorias';

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevaCat, setNuevaCat] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [nombreEditado, setNombreEditado] = useState('');

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const datos = await obtenerCategorias();
    // Ordenar alfabéticamente
    datos.sort((a, b) => a.nombre.localeCompare(b.nombre));
    setCategorias(datos);
    setCargando(false);
  };

  const handleAgregar = async (e) => {
    e.preventDefault();
    if (!nuevaCat.trim()) return;
    await agregarCategoria(nuevaCat);
    setNuevaCat('');
    await cargarDatos();
  };

  const handleEditar = async (id) => {
    if (!nombreEditado.trim()) return;
    await actualizarCategoria(id, nombreEditado);
    setEditandoId(null);
    setNombreEditado('');
    await cargarDatos();
  };

  const handleEliminar = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de eliminar la categoría "${nombre}"?`)) {
      await eliminarCategoria(id);
      await cargarDatos();
    }
  };

  if (cargando) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-800"> Gestión de Categorías</h2>
      <p className="text-gray-600">Agrega, edita o elimina las categorías del club. Los cambios se reflejarán automáticamente en Deportistas y Asistencia.</p>

      {/* Formulario para agregar */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-semibold text-gray-700 mb-4">➕ Agregar Nueva Categoría</h3>
        <form onSubmit={handleAgregar} className="flex gap-3">
          <input 
            type="text" 
            value={nuevaCat}
            onChange={(e) => setNuevaCat(e.target.value)}
            placeholder="Ej: SUB 11 FEM"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none uppercase"
            required
          />
          <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-blue-800 font-medium">
            Agregar
          </button>
        </form>
      </div>

      {/* Lista de categorías existentes */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-700"> Categorías Existentes ({categorias.length})</h3>
        </div>
        <div className="divide-y">
          {categorias.length === 0 ? (
            <p className="p-6 text-center text-gray-500">No hay categorías registradas.</p>
          ) : (
            categorias.map(cat => (
              <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                {editandoId === cat.id ? (
                  <div className="flex gap-2 flex-1">
                    <input 
                      type="text" 
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none uppercase"
                      autoFocus
                    />
                    <button onClick={() => handleEditar(cat.id)} className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm">💾</button>
                    <button onClick={() => setEditandoId(null)} className="bg-gray-300 text-gray-700 px-3 py-1 rounded-lg text-sm">✕</button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-800 text-lg">{cat.nombre}</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setEditandoId(cat.id); setNombreEditado(cat.nombre); }}
                        className="text-blue-500 hover:text-blue-700 p-2" title="Editar"
                      >✏️</button>
                      <button 
                        onClick={() => handleEliminar(cat.id, cat.nombre)}
                        className="text-red-500 hover:text-red-700 p-2" title="Eliminar"
                      >🗑️</button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
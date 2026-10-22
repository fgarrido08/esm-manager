import { useState, useEffect } from 'react';
import { obtenerProfesores, agregarProfesor, eliminarProfesor, actualizarProfesor } from '../firebase/profesores';
import { obtenerCategorias } from '../firebase/categorias';
import { Link } from 'react-router-dom';

export default function EditarUsuarios() {
  const [profesores, setProfesores] = useState([]);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [verPasswordId, setVerPasswordId] = useState(null);

  const formularioVacio = { 
    nombre: '', 
    cargo: 'Entrenador Escuela', 
    categorias: [], 
    password: '',
    cambioForzado: false
  };
  const [form, setForm] = useState(formularioVacio);
  
  const cargos = [
    'Entrenador Jefe', 
    'Entrenador Escuela', 
    'Preparador Físico', 
    'Entrenador Arqueros'
  ];

  useEffect(() => { 
    cargarDatos(); 
    cargarCategorias();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const datos = await obtenerProfesores();
    setProfesores(datos);
    setCargando(false);
  };

  const cargarCategorias = async () => {
    try {
      const cats = await obtenerCategorias();
      console.log("Categorías cargadas:", cats);
      setCategoriasDisponibles(cats.map(c => c.nombre));
    } catch (error) {
      console.error("Error cargando categorías:", error);
      setCategoriasDisponibles([]);
    }
  };

  const abrirModal = (profesor = null) => {
    if (profesor) {
      setEditandoId(profesor.id);
      setForm(profesor);
    } else {
      setEditandoId(null);
      setForm({ ...formularioVacio, categorias: [] });
    }
    setMostrarModal(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.password) {
      return alert("Nombre y contraseña son obligatorios");
    }
    
    try {
      if (editandoId) {
        await actualizarProfesor(editandoId, form);
      } else {
        await agregarProfesor({ ...form, cambioForzado: true });
      }
      setMostrarModal(false);
      await cargarDatos();
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
  };

  const handleEliminar = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de eliminar a "${nombre}"? Esta acción no se puede deshacer.`)) {
      try {
        await eliminarProfesor(id);
        await cargarDatos();
      } catch (error) {
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  const toggleCategoria = (cat) => {
    const nuevasCats = form.categorias.includes(cat)
      ? form.categorias.filter(c => c !== cat)
      : [...form.categorias, cat];
    setForm({ ...form, categorias: nuevasCats });
  };

  if (cargando) return <div className="p-8 text-center text-gray-500">Cargando usuarios...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">👥 Gestión de Usuarios</h2>
          <p className="text-gray-600 mt-1">Administra profesores, cargos y accesos al sistema</p>
        </div>
        <button 
          onClick={() => abrirModal()} 
          className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium flex items-center gap-2"
        >
           Nuevo Usuario
        </button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm">Total Usuarios</p>
          <p className="text-2xl font-bold text-blue-600">{profesores.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
          <p className="text-gray-500 text-sm">Entrenadores</p>
          <p className="text-2xl font-bold text-green-600">
            {profesores.filter(p => p.cargo.includes('Entrenador')).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-purple-500">
          <p className="text-gray-500 text-sm">Preparadores Físicos</p>
          <p className="text-2xl font-bold text-purple-600">
            {profesores.filter(p => p.cargo === 'Preparador Físico').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-orange-500">
          <p className="text-gray-500 text-sm">Pendientes de Cambio</p>
          <p className="text-2xl font-bold text-orange-600">
            {profesores.filter(p => p.cambioForzado).length}
          </p>
        </div>
      </div>

      {/* Lista de Profesores */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-700">👨🏫 Profesores Registrados</h3>
        </div>
        
        {profesores.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">No hay profesores registrados</p>
            <p className="text-sm mt-2">Haz clic en "Nuevo Usuario" para agregar el primero</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-4 font-semibold text-gray-700">Nombre</th>
                  <th className="p-4 font-semibold text-gray-700">Cargo</th>
                  <th className="p-4 font-semibold text-gray-700">Categorías</th>
                  <th className="p-4 font-semibold text-gray-700">Contraseña</th>
                  <th className="p-4 font-semibold text-gray-700 text-center">Estado</th>
                  <th className="p-4 font-semibold text-gray-700 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {profesores.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">{p.nombre}</td>
                    <td className="p-4 text-sm text-gray-600">{p.cargo}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {p.categorias?.map(cat => (
                          <span key={cat} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {cat}
                          </span>
                        ))}
                        {(!p.categorias || p.categorias.length === 0) && (
                          <span className="text-xs text-gray-400">Sin categorías</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-sm flex items-center gap-2">
                      <span className="flex-1">
                        {verPasswordId === p.id ? p.password : '••••••'}
                      </span>
                      <button 
                        onClick={() => setVerPasswordId(verPasswordId === p.id ? null : p.id)}
                        className="text-gray-500 hover:text-primary p-1"
                      >
                        {verPasswordId === p.id ? '🙈' : '👁️'}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      {p.cambioForzado ? (
                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                          ⚠️ Pendiente
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                          ✅ Activo
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center space-x-2">
                      <button 
                        onClick={() => abrirModal(p)} 
                        className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleEliminar(p.id, p.nombre)} 
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                        title="Eliminar"
                      >
                        ️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL - Formulario */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">
              {editandoId ? '✏️ Editar Usuario' : ' Nuevo Usuario'}
            </h3>
            
            <form onSubmit={handleGuardar} className="space-y-6">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input 
                  type="text" 
                  value={form.nombre} 
                  onChange={(e) => setForm({...form, nombre: e.target.value})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                  placeholder="Ej: Eduardo Ochoa"
                  required 
                />
              </div>

              {/* Cargo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo *
                </label>
                <select 
                  value={form.cargo} 
                  onChange={(e) => setForm({...form, cargo: e.target.value})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                >
                  {cargos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Categorías */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categorías que entrena
                </label>
                {categoriasDisponibles.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 mb-2">
                      ️ No hay categorías registradas en el sistema
                    </p>
                    <Link 
                      to="/categorias" 
                      onClick={() => setMostrarModal(false)}
                      className="text-sm font-medium text-yellow-900 underline hover:text-yellow-700"
                    >
                      Ir a crear categorías →
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                    {categoriasDisponibles.map(cat => (
                      <label key={cat} className="flex items-center space-x-2 bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100">
                        <input 
                          type="checkbox" 
                          checked={form.categorias.includes(cat)}
                          onChange={() => toggleCategoria(cat)}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span className="text-sm">{cat}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña {editandoId ? '(dejar en blanco para mantener la actual)' : '*'}
                </label>
                <input 
                  type="text" 
                  value={form.password} 
                  onChange={(e) => setForm({...form, password: e.target.value})} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono" 
                  placeholder={editandoId ? "Mínimo 4 caracteres" : "Mínimo 4 caracteres"}
                  required={!editandoId}
                />
                {editandoId && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Si no cambias la contraseña, se mantendrá la actual
                  </p>
                )}
              </div>

              {/* Opción de forzar cambio */}
              <div className="flex items-center gap-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <input 
                  type="checkbox" 
                  id="cambioForzado"
                  checked={form.cambioForzado}
                  onChange={(e) => setForm({...form, cambioForzado: e.target.checked})}
                  className="rounded text-orange-500 focus:ring-orange-500"
                />
                <label htmlFor="cambioForzado" className="text-sm text-gray-700 cursor-pointer">
                  🔐 Obligar al usuario a cambiar la contraseña en el primer ingreso
                </label>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setMostrarModal(false)} 
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium"
                >
                  {editandoId ? '💾 Actualizar' : '✅ Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
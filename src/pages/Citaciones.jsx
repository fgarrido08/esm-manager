import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { obtenerCategorias } from '../firebase/categorias';
import { obtenerDeportistas } from '../firebase/deportistas';
import { ordenarCategorias } from '../utils/ordenarCategorias';

const obtenerNivelCategoria = (categoria) => {
  if (!categoria) return 99;
  const cat = categoria.toUpperCase();
  if (cat.includes('ADULTA')) return 0;
  if (cat.includes('SUB 23')) return 1;
  if (cat.includes('SUB 19')) return 2;
  if (cat.includes('SUB 17')) return 3;
  if (cat.includes('SUB 15')) return 4;
  if (cat.includes('SUB 13')) return 5;
  if (cat.includes('SUB 11')) return 6;
  if (cat.includes('SUB 10')) return 7;
  if (cat.includes('SUB 9')) return 8;
  if (cat.includes('ESCUELITA')) return 9;
  return 99;
};

const obtenerGenero = (categoria) => {
  if (!categoria) return 'MIXTO';
  const cat = categoria.toUpperCase();
  if (cat.includes('MASCULINA')) return 'MASCULINA';
  if (cat.includes('FEMENINA')) return 'FEMENINA';
  return 'MIXTO';
};

export default function Citaciones() {
  const [usuario, setUsuario] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [deportistas, setDeportistas] = useState([]);
  const [citaciones, setCitaciones] = useState([]);
  const [canchasDisponibles, setCanchasDisponibles] = useState([]);
  const [rivalesDisponibles, setRivalesDisponibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensajeCopiado, setMensajeCopiado] = useState('');

  const formularioVacio = {
    categoria: '',
    fechaPartido: '',
    horaPartido: '',
    cancha: '',
    canchaEsOtro: false,
    canchaPersonalizada: '',
    rival: '',
    rivalEsOtro: false,
    rivalPersonalizado: '',
    tipo: 'Local',
    convocatoria: '',
    observaciones: '',
    estado: 'pendiente',
    profesorNombre: '',
    profesorId: '',
    fechaCreacion: '',
    deportistasCitados: [],
    jugadoresAdicionales: ''
  };
  const [form, setForm] = useState(formularioVacio);

  useEffect(() => {
    const datosUsuario = localStorage.getItem('usuarioActivo');
    if (datosUsuario) setUsuario(JSON.parse(datosUsuario));
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [cats, deps, canchasSnap, rivalesSnap] = await Promise.all([
        obtenerCategorias(),
        obtenerDeportistas(),
        getDocs(collection(db, 'canchas')),
        getDocs(collection(db, 'rivales'))
      ]);
      setCategorias(ordenarCategorias(cats.map(c => c.nombre)));
      setCanchasDisponibles(canchasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRivalesDisponibles(rivalesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const depsConNivel = deps.map(d => ({
        ...d,
        nivelCategoria: obtenerNivelCategoria(d.categoria),
        generoCategoria: obtenerGenero(d.categoria)
      }));
      setDeportistas(depsConNivel);

      const snapshot = await getDocs(collection(db, 'citaciones'));
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      lista.sort((a, b) => new Date(a.fechaPartido) - new Date(b.fechaPartido));
      setCitaciones(lista);
    } catch (error) {
      console.error("Error cargando citaciones:", error);
    }
    setCargando(false);
  };

  const getDeportistasDisponibles = () => {
    if (!form.categoria) return [];
    const nivelSeleccionado = obtenerNivelCategoria(form.categoria);
    const generoSeleccionado = obtenerGenero(form.categoria);
    
    return deportistas
      .filter(d => {
        const nivelDep = d.nivelCategoria;
        const generoDep = d.generoCategoria;
        const coincideNivel = nivelDep >= nivelSeleccionado;
        let coincideGenero = false;
        if (generoSeleccionado === 'MASCULINA') {
          coincideGenero = generoDep === 'MASCULINA' || generoDep === 'MIXTO';
        } else if (generoSeleccionado === 'FEMENINA') {
          coincideGenero = generoDep === 'FEMENINA' || generoDep === 'MIXTO';
        } else {
          coincideGenero = generoDep === 'MIXTO';
        }
        return coincideNivel && coincideGenero;
      })
      .sort((a, b) => {
        if (a.nivelCategoria !== b.nivelCategoria) return a.nivelCategoria - b.nivelCategoria;
        const nombreA = `${a.apellidoPaterno || ''} ${a.primerNombre || ''}`.toLowerCase();
        const nombreB = `${b.apellidoPaterno || ''} ${b.primerNombre || ''}`.toLowerCase();
        return nombreA.localeCompare(nombreB);
      });
  };

  const toggleDeportista = (deportistaId) => {
    const actuales = form.deportistasCitados;
    if (actuales.includes(deportistaId)) {
      setForm({ ...form, deportistasCitados: actuales.filter(id => id !== deportistaId) });
    } else {
      setForm({ ...form, deportistasCitados: [...actuales, deportistaId] });
    }
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    if (!form.categoria || !form.fechaPartido || !form.horaPartido) {
      return alert("Completa los campos obligatorios: Categoría, Fecha y Hora");
    }
    const canchaFinal = form.canchaEsOtro ? form.canchaPersonalizada : form.cancha;
    if (!canchaFinal) return alert("Selecciona o escribe una cancha");
    if (form.deportistasCitados.length === 0 && !form.jugadoresAdicionales.trim()) {
      return alert("Selecciona al menos un deportista o agrega jugadores adicionales");
    }

    try {
      const nuevaCitacion = {
        ...form,
        canchaFinal: canchaFinal,
        rivalFinal: form.rivalEsOtro ? form.rivalPersonalizado : form.rival,
        profesorNombre: usuario?.nombre || 'Desconocido',
        profesorId: usuario?.id || '',
        fechaCreacion: new Date().toISOString(),
        estado: 'pendiente'
      };
      await addDoc(collection(db, 'citaciones'), nuevaCitacion);
      alert(`✅ Citación creada con ${form.deportistasCitados.length} deportistas.`);
      setForm(formularioVacio);
      setMostrarForm(false);
      await cargarDatos();
    } catch (error) {
      alert("❌ Error al crear: " + error.message);
    }
  };

  const handleAprobar = async (id) => {
    try {
      await updateDoc(doc(db, 'citaciones', id), { estado: 'aprobada' });
      await cargarDatos();
    } catch (error) {
      alert("Error al aprobar: " + error.message);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Eliminar esta citación?")) return;
    try {
      await deleteDoc(doc(db, 'citaciones', id));
      await cargarDatos();
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    }
  };

  const generarMensajeWhatsApp = (c) => {
    const fechaFormateada = c.fechaPartido 
      ? new Date(c.fechaPartido + 'T12:00:00').toLocaleDateString('es-CL', { 
          weekday: 'long', day: 'numeric', month: 'long' 
        }) 
      : '';
    const canchaMostrar = c.canchaFinal || c.cancha || '';
    const rivalMostrar = c.rivalFinal || c.rival || 'Por confirmar';
    
    const nombresDeportistas = c.deportistasCitados
      .map(id => {
        const dep = deportistas.find(d => d.id === id);
        return dep ? `${dep.primerNombre || ''} ${dep.apellidoPaterno || ''}`.trim() : null;
      })
      .filter(n => n)
      .sort((a, b) => a.localeCompare(b));

    let adicionales = [];
    if (c.jugadoresAdicionales && c.jugadoresAdicionales.trim()) {
      adicionales = c.jugadoresAdicionales.split(',').map(n => n.trim()).filter(n => n);
    }

    const listaCompleta = [...nombresDeportistas, ...adicionales];

    let mensaje = ` *CITACIÓN ${c.categoria.toUpperCase()}* 💛\n\n📅 *Fecha:* ${fechaFormateada}\n⏰ *Hora del partido:* ${c.horaPartido} hrs\n📍 *Cancha:* ${canchaMostrar}\n🆚 *Rival:* ${rivalMostrar}\n🏠 *Tipo:* ${c.tipo}\n\n⏱️ *Convocatoria:* ${c.convocatoria || '30 minutos antes'} hrs\n\n📋 *DEPORTISTAS CITADOS:*\n\n${listaCompleta.map((nombre, i) => `  ${i + 1}. ${nombre}`).join('\n')}`;

    if (c.observaciones) {
      mensaje += `\n\n📝 *Observaciones:* ${c.observaciones}\n`;
    }
    mensaje += `\n¡Los esperamos! 💛`;

    navigator.clipboard.writeText(mensaje).then(() => {
      setMensajeCopiado(c.id);
      setTimeout(() => setMensajeCopiado(''), 2000);
    });
  };

  const formatearFecha = (f) => {
    if (!f) return '';
    const fecha = new Date(f + 'T12:00:00');
    return fecha.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (cargando) return <div className="p-8 text-center">Cargando citaciones...</div>;

  const isAdmin = usuario?.rol === 'admin';
  const citacionesFiltradas = isAdmin ? citaciones : citaciones.filter(c => c.profesorId === usuario?.id);
  const pendientes = citacionesFiltradas.filter(c => c.estado === 'pendiente').length;
  const aprobadas = citacionesFiltradas.filter(c => c.estado === 'aprobada').length;

  const deportistasDisponibles = getDeportistasDisponibles();
  const generoSeleccionado = obtenerGenero(form.categoria);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800"> Citaciones a Partidos</h2>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'Gestiona las citaciones enviadas por los profesores' : 'Envía la citación del sábado (ideal el día jueves)'}
          </p>
        </div>
        <button 
          onClick={() => setMostrarForm(true)}
          className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-blue-800 font-medium flex items-center gap-2"
        >
          ➕ Nueva Citación
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm">Total Citaciones</p>
          <p className="text-2xl font-bold text-blue-600">{citacionesFiltradas.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-orange-500">
          <p className="text-gray-500 text-sm">Pendientes</p>
          <p className="text-2xl font-bold text-orange-600">{pendientes}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
          <p className="text-gray-500 text-sm">Aprobadas</p>
          <p className="text-2xl font-bold text-green-600">{aprobadas}</p>
        </div>
      </div>

      {citacionesFiltradas.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-lg text-gray-500">No hay citaciones registradas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {citacionesFiltradas.map(c => {
            const canchaMostrar = c.canchaFinal || c.cancha || '';
            const rivalMostrar = c.rivalFinal || c.rival || 'Por confirmar';
            return (
              <div key={c.id} className={`bg-white rounded-lg shadow-md overflow-hidden border-l-4 ${c.estado === 'aprobada' ? 'border-green-500' : 'border-orange-500'}`}>
                <div className="p-6">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">{c.categoria}</h3>
                        {c.estado === 'aprobada' ? (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">✅ Aprobada</span>
                        ) : (
                          <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">⏳ Pendiente</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Por <b>{c.profesorNombre}</b> · {formatearFecha(c.fechaCreacion?.split('T')[0])}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                        <div><p className="text-gray-500 text-xs"> Fecha</p><p className="font-semibold">{formatearFecha(c.fechaPartido)}</p></div>
                        <div><p className="text-gray-500 text-xs">⏰ Hora</p><p className="font-semibold">{c.horaPartido} hrs</p></div>
                        <div><p className="text-gray-500 text-xs"> Cancha</p><p className="font-semibold">{canchaMostrar}</p></div>
                        <div><p className="text-gray-500 text-xs">🆚 Rival</p><p className="font-semibold">{rivalMostrar}</p></div>
                      </div>
                      {c.deportistasCitados && c.deportistasCitados.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-3">
                          <p className="text-xs text-blue-800 font-medium mb-2">📋 Deportistas de la base de datos ({c.deportistasCitados.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {c.deportistasCitados.map(id => {
                              const dep = deportistas.find(d => d.id === id);
                              return dep ? (
                                <span key={id} className="bg-white text-blue-900 text-xs px-2 py-1 rounded border border-blue-200">
                                  {dep.primerNombre} {dep.apellidoPaterno}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                      {c.jugadoresAdicionales && c.jugadoresAdicionales.trim() && (
                        <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                          <p className="text-xs text-purple-800 font-medium mb-1">🎯 Jugadores adicionales:</p>
                          <div className="flex flex-wrap gap-1">
                            {c.jugadoresAdicionales.split(',').map((n, i) => n.trim()).filter(n => n).map((nombre, i) => (
                              <span key={i} className="bg-white text-purple-900 text-xs px-2 py-1 rounded border border-purple-200">
                                {nombre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {isAdmin && c.estado === 'pendiente' && (
                        <button onClick={() => handleAprobar(c.id)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
                          ✅ Aprobar
                        </button>
                      )}
                      <button onClick={() => generarMensajeWhatsApp(c)} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm font-medium">
                        {mensajeCopiado === c.id ? '✅ Copiado!' : '📋 Copiar WhatsApp'}
                      </button>
                      <button onClick={() => handleEliminar(c.id)} className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 text-sm font-medium">
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mostrarForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">📣 Nueva Citación</h3>
              <button onClick={() => setMostrarForm(false)} className="text-2xl text-gray-500 hover:text-gray-700"></button>
            </div>
            <form onSubmit={handleCrear} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                  <select value={form.categoria} onChange={(e) => setForm({...form, categoria: e.target.value, deportistasCitados: []})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" required>
                    <option value="">— Selecciona —</option>
                    {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  {form.categoria && (
                    <p className="text-xs text-blue-600 mt-1">
                      📌 Podrás citar deportistas de {form.categoria} y todas las categorías inferiores del mismo género ({generoSeleccionado === 'MASCULINA' ? 'masculino' : generoSeleccionado === 'FEMENINA' ? 'femenino' : 'mixto'})
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({...form, tipo: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none">
                    <option value="Local">🏠 Local</option>
                    <option value="Visitante">✈️ Visitante</option>
                    <option value="Neutral">️ Neutral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del partido *</label>
                  <input type="date" value={form.fechaPartido} onChange={(e) => setForm({...form, fechaPartido: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora del partido *</label>
                  <input type="time" value={form.horaPartido} onChange={(e) => setForm({...form, horaPartido: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">📍 Cancha *</label>
                  <select 
                    value={form.canchaEsOtro ? 'Otro' : form.cancha} 
                    onChange={(e) => {
                      if (e.target.value === 'Otro') {
                        setForm({...form, canchaEsOtro: true, canchaPersonalizada: '', cancha: ''});
                      } else {
                        setForm({...form, canchaEsOtro: false, cancha: e.target.value, canchaPersonalizada: ''});
                      }
                    }} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">— Selecciona cancha —</option>
                    {canchasDisponibles.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                    <option value="Otro">✏️ Otro (escribir dirección)</option>
                  </select>
                  {form.canchaEsOtro && (
                    <input 
                      type="text"
                      value={form.canchaPersonalizada}
                      onChange={(e) => setForm({...form, canchaPersonalizada: e.target.value})}
                      placeholder="Escribe la dirección de la cancha"
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg mt-2 focus:ring-2 focus:ring-primary outline-none"
                      required
                    />
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">🆚 Rival</label>
                  <select 
                    value={form.rivalEsOtro ? 'Otro' : form.rival} 
                    onChange={(e) => {
                      if (e.target.value === 'Otro') {
                        setForm({...form, rivalEsOtro: true, rivalPersonalizado: '', rival: ''});
                      } else {
                        setForm({...form, rivalEsOtro: false, rival: e.target.value, rivalPersonalizado: ''});
                      }
                    }} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">— Selecciona rival —</option>
                    {rivalesDisponibles.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
                    <option value="Otro">✏️ Otro (escribir club)</option>
                  </select>
                  {form.rivalEsOtro && (
                    <input 
                      type="text"
                      value={form.rivalPersonalizado}
                      onChange={(e) => setForm({...form, rivalPersonalizado: e.target.value})}
                      placeholder="Escribe el nombre del club rival"
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg mt-2 focus:ring-2 focus:ring-primary outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">⏱️ Convocatoria</label>
                  <input type="time" value={form.convocatoria} onChange={(e) => setForm({...form, convocatoria: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              {form.categoria && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      📋 Selecciona deportistas citados * ({form.deportistasCitados.length} seleccionados)
                    </label>
                    <span className="text-xs text-gray-500">
                      Género: <b>{generoSeleccionado}</b>
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                    {deportistasDisponibles.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No hay deportistas disponibles</p>
                    ) : (
                      <div className="space-y-3">
                        {(() => {
                          const grupos = {};
                          deportistasDisponibles.forEach(dep => {
                            const cat = dep.categoria || 'Sin categoría';
                            if (!grupos[cat]) grupos[cat] = [];
                            grupos[cat].push(dep);
                          });
                          const categoriasOrdenadas = Object.keys(grupos).sort((a, b) => obtenerNivelCategoria(a) - obtenerNivelCategoria(b));
                          return categoriasOrdenadas.map(cat => {
                            const esCategoriaPrincipal = cat.toUpperCase() === form.categoria.toUpperCase();
                            return (
                              <div key={cat} className={esCategoriaPrincipal ? 'bg-blue-50 p-2 rounded-lg border border-blue-200' : 'bg-white p-2 rounded-lg border border-gray-200'}>
                                <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-2">
                                  {esCategoriaPrincipal && <span className="text-blue-600">⭐</span>}
                                  {cat} ({grupos[cat].length} deportistas)
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                  {grupos[cat].map(dep => {
                                    const seleccionado = form.deportistasCitados.includes(dep.id);
                                    return (
                                      <label key={dep.id} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${seleccionado ? 'bg-green-100 border border-green-300' : 'hover:bg-gray-100'}`}>
                                        <input 
                                          type="checkbox" 
                                          checked={seleccionado}
                                          onChange={() => toggleDeportista(dep.id)}
                                          className="rounded text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm text-gray-800">
                                          {dep.primerNombre} {dep.apellidoPaterno}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🎯 Jugadores adicionales (no registrados en el sistema)
                </label>
                <textarea 
                  value={form.jugadoresAdicionales} 
                  onChange={(e) => setForm({...form, jugadoresAdicionales: e.target.value})} 
                  rows="2" 
                  placeholder="Ej: Juan Pérez (refuerzo Club Llano), María González (viene de prueba)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">
                  Separa los nombres con coma. Aparecerán en la citación pero no se guardarán permanentemente.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={form.observaciones} onChange={(e) => setForm({...form, observaciones: e.target.value})} rows="2" placeholder="Ej: Traer protector bucal" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"></textarea>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setMostrarForm(false)} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 font-medium">Cancelar</button>
                <button type="submit" className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-blue-800 font-medium">📤 Enviar Citación</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
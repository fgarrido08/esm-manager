import { ordenarCategorias } from '../utils/ordenarCategorias';
import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { obtenerDeportistas } from '../firebase/deportistas';
import * as XLSX from 'xlsx';

const CONCEPTOS = {
  mensualidad: { nombre: 'Mensualidad', icono: '📅', color: 'blue' },
  licencia: { nombre: 'Licencia Federativa', icono: '🏅', color: 'purple' },
  torneo: { nombre: 'Inscripción Torneo', icono: '🏆', color: 'yellow' },
  equipacion: { nombre: 'Equipación', icono: '👕', color: 'green' },
  gom: { nombre: 'Arriendo GOM', icono: '🏋️', color: 'orange' },
  kiosco: { nombre: 'Kiosco', icono: '🛒', color: 'pink' },
  otro: { nombre: 'Otro', icono: '📝', color: 'gray' }
};

export default function Cobranzas() {
  // ✅ Función para obtener la fecha local de Chile
  const obtenerFechaLocal = () => {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  // ✅ TODOS LOS STATES AL PRINCIPIO
  const [usuario, setUsuario] = useState(null);
  const [deportistas, setDeportistas] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState('resumen');
  
  const [filtroDeportista, setFiltroDeportista] = useState('');
  const [filtroConcepto, setFiltroConcepto] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('pendientes');
  
  const [transaccionesSeleccionadas, setTransaccionesSeleccionadas] = useState([]);
  const [montoCorreccion, setMontoCorreccion] = useState('');
  const [fechaCorreccion, setFechaCorreccion] = useState('');
  const [estadoCorreccion, setEstadoCorreccion] = useState('');
  
  const [fechaCreacionDesde, setFechaCreacionDesde] = useState('');
  const [fechaCreacionHasta, setFechaCreacionHasta] = useState('');
  const [filtroDetalleBusqueda, setFiltroDetalleBusqueda] = useState('');
  
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [transaccionesAModificar, setTransaccionesAModificar] = useState([]);
  
  const [mostrarModalTransaccion, setMostrarModalTransaccion] = useState(false);
  const [transaccionEditando, setTransaccionEditando] = useState(null);
  
  const [mostrarModalCargo, setMostrarModalCargo] = useState(false);
  const [formCargo, setFormCargo] = useState({
    concepto: 'mensualidad',
    conceptoDetalle: '',
    monto: '',
    fechaVencimiento: '',
    observaciones: '',
    aplicarATodos: true,
    deportistasSeleccionados: []
  });

  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [transaccionPago, setTransaccionPago] = useState(null);
  const [formPago, setFormPago] = useState({
    monto: '',
    metodoPago: 'transferencia',
    fechaPago: obtenerFechaLocal(),
    observaciones: ''
  });

  const [mostrarModalGOM, setMostrarModalGOM] = useState(false);
  const [fechaGOMInicio, setFechaGOMInicio] = useState('');
  const [fechaGOMFin, setFechaGOMFin] = useState('');
  const [reporteGOM, setReporteGOM] = useState([]);
  const [generandoGOM, setGenerandoGOM] = useState(false);
  const [cargandoGOM, setCargandoGOM] = useState(false);
  
  const [deportistasYaCobrados, setDeportistasYaCobrados] = useState([]);
  const [reporteFinal, setReporteFinal] = useState([]);

  const [mostrarModalEliminarAsistencias, setMostrarModalEliminarAsistencias] = useState(false);
  const [fechaEliminarInicio, setFechaEliminarInicio] = useState('');
  const [fechaEliminarFin, setFechaEliminarFin] = useState('');
  const [actividadEliminar, setActividadEliminar] = useState('');
  const [asistenciasAEliminar, setAsistenciasAEliminar] = useState([]);
  const [buscandoAsistencias, setBuscandoAsistencias] = useState(false);
  const [eliminandoAsistencias, setEliminandoAsistencias] = useState(false);

  // ✅ STATES DE IMPORTACIÓN
  const [mostrarModalImportar, setMostrarModalImportar] = useState(false);
  const [archivoImportado, setArchivoImportado] = useState(null);
  const [datosImportados, setDatosImportados] = useState([]);
  const [resumenImportacion, setResumenImportacion] = useState(null);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    const datosUsuario = localStorage.getItem('usuarioActivo');
    if (datosUsuario) setUsuario(JSON.parse(datosUsuario));
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [deps, trans] = await Promise.all([
        obtenerDeportistas(),
        getDocs(collection(db, 'transacciones'))
      ]);
      setDeportistas(deps);
      setTransacciones(trans.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error cargando datos:", error);
    }
    setCargando(false);
  };

  const calcularResumen = () => {
    const resumenGeneral = { totalPendiente: 0, totalPagado: 0, deudores: 0 };
    const resumenPorCategoria = {};
    const resumenPorDeportista = {};

    deportistas.forEach(dep => {
      resumenPorDeportista[dep.id] = {
        deportista: dep,
        totalPendiente: 0,
        totalPagado: 0,
        transaccionesPendientes: [],
        transaccionesPagadas: []
      };
    });

    transacciones.forEach(t => {
      const cat = t.categoria || 'Sin Categoría';
      if (!resumenPorCategoria[cat]) {
        resumenPorCategoria[cat] = { pendiente: 0, pagado: 0, cantidadDeudores: new Set() };
      }

      if (resumenPorDeportista[t.deportistaId]) {
        if (t.estado === 'pagado') {
          resumenPorDeportista[t.deportistaId].totalPagado += t.monto || 0;
          resumenPorDeportista[t.deportistaId].transaccionesPagadas.push(t);
          resumenPorCategoria[cat].pagado += t.monto || 0;
          resumenGeneral.totalPagado += t.monto || 0;
        } else {
          resumenPorDeportista[t.deportistaId].totalPendiente += t.monto || 0;
          resumenPorDeportista[t.deportistaId].transaccionesPendientes.push(t);
          resumenPorCategoria[cat].pendiente += t.monto || 0;
          resumenPorCategoria[cat].cantidadDeudores.add(t.deportistaId);
          resumenGeneral.totalPendiente += t.monto || 0;
        }
      }
    });

    Object.keys(resumenPorCategoria).forEach(cat => {
      resumenPorCategoria[cat].cantidadDeudores = resumenPorCategoria[cat].cantidadDeudores.size;
    });

    resumenGeneral.deudores = Object.values(resumenPorDeportista).filter(r => r.totalPendiente > 0).length;
    return { resumenGeneral, resumenPorCategoria, resumenPorDeportista };
  };

  const { resumenGeneral, resumenPorCategoria, resumenPorDeportista } = calcularResumen();
  const categoriasUnicas = ordenarCategorias([...new Set(deportistas.map(d => d.categoria).filter(Boolean))]);
  
  const transaccionesFiltradas = transacciones.filter(t => {
    const coincideDeportista = !filtroDeportista || t.deportistaId === filtroDeportista;
    const coincideConcepto = filtroConcepto === 'todos' || t.concepto === filtroConcepto;
    const coincideCategoria = filtroCategoria === 'todas' || t.categoria === filtroCategoria;
    const coincideEstado = filtroEstado === 'todos' || 
      (filtroEstado === 'pendientes' && t.estado !== 'pagado') ||
      (filtroEstado === 'pagadas' && t.estado === 'pagado');
    return coincideDeportista && coincideConcepto && coincideCategoria && coincideEstado;
  });

  const transaccionesParaCorreccion = transacciones.filter(t => {
    if (filtroConcepto !== 'todos' && t.concepto !== filtroConcepto) return false;
    if (filtroCategoria !== 'todas' && t.categoria !== filtroCategoria) return false;
    if (filtroDetalleBusqueda && !t.conceptoDetalle.toLowerCase().includes(filtroDetalleBusqueda.toLowerCase())) return false;
    if (fechaCreacionDesde) {
      const fechaCreacion = t.fechaCreacion ? t.fechaCreacion.split('T')[0] : '';
      if (fechaCreacion < fechaCreacionDesde) return false;
    }
    if (fechaCreacionHasta) {
      const fechaCreacion = t.fechaCreacion ? t.fechaCreacion.split('T')[0] : '';
      if (fechaCreacion > fechaCreacionHasta) return false;
    }
    return true;
  });

  const formatearMonto = (monto) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(monto || 0);
  const formatearFecha = (f) => { if (!f) return ''; const fecha = new Date(f + 'T12:00:00'); return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }); };

  const generarReporteGOM = async () => {
    if (!fechaGOMInicio || !fechaGOMFin) return alert("Selecciona el rango de fechas");
    setGenerandoGOM(true);
    try {
      const snapshot = await getDocs(collection(db, 'asistencias'));
      const asistencias = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const asistenciasGOM = asistencias.filter(a => {
        const esGOM = a.actividad && a.actividad.toUpperCase().includes('GOM');
        return esGOM && a.fecha >= fechaGOMInicio && a.fecha <= fechaGOMFin;
      });

      const conteoPorDeportistaYHorario = {};
      asistenciasGOM.forEach(a => {
        if (a.registros) {
          const horario = a.horario || 'Sin Horario';
          a.registros.forEach(r => {
            if (r.estado === 'presente') {
              const clave = `${r.deportistaId}_${horario}`;
              if (!conteoPorDeportistaYHorario[clave]) {
                conteoPorDeportistaYHorario[clave] = {
                  deportistaId: r.deportistaId,
                  deportistaNombre: r.nombre,
                  categoria: a.categoria,
                  horario: horario,
                  fechasUnicas: new Set()
                };
              }
              conteoPorDeportistaYHorario[clave].fechasUnicas.add(a.fecha);
            }
          });
        }
      });

      const reporte = Object.values(conteoPorDeportistaYHorario).map(item => {
        const numDias = item.fechasUnicas.size;
        return {
          ...item,
          asistencias: numDias,
          fechas: Array.from(item.fechasUnicas),
          montoTotal: numDias * 2000,
          conceptoDetalle: `Arriendo GOM (${fechaGOMInicio} al ${fechaGOMFin}) - ${item.horario}`
        };
      }).sort((a, b) => {
        if (a.deportistaNombre !== b.deportistaNombre) return a.deportistaNombre.localeCompare(b.deportistaNombre);
        return a.horario.localeCompare(b.horario);
      });

      const transaccionesGOMExistentes = transacciones.filter(t => 
        t.concepto === 'gom' && t.deportistaId && t.conceptoDetalle &&
        t.conceptoDetalle.includes(fechaGOMInicio) && t.conceptoDetalle.includes(fechaGOMFin)
      );
      const clavesYaCobradas = new Set(
        transaccionesGOMExistentes.map(t => {
          const match = t.conceptoDetalle.match(/-\s*(\d{2}:\d{2}-\d{2}:\d{2})/);
          const horario = match ? match[1] : 'Sin Horario';
          return `${t.deportistaId}_${horario}`;
        })
      );

      const listaYaCobrados = reporte.filter(item => clavesYaCobradas.has(`${item.deportistaId}_${item.horario}`));
      const listaNuevos = reporte.filter(item => !clavesYaCobradas.has(`${item.deportistaId}_${item.horario}`));

      setDeportistasYaCobrados(listaYaCobrados);
      setReporteFinal(listaNuevos);
      setReporteGOM(reporte);
      
      if (reporte.length === 0) alert("No se encontraron asistencias GOM en ese rango.");
    } catch (error) {
      alert("❌ Error al generar reporte: " + error.message);
    }
    setGenerandoGOM(false);
  };

  const cargarCobrosGOM = async () => {
  if (reporteFinal.length === 0) return alert("No hay deportistas nuevos para cobrar.");
  const confirmacion = window.confirm(
    `⚠️ ¿Cargar ${reporteFinal.length} cobros GOM NUEVOS?\n\n` +
    `• Bloques nuevos: ${reporteFinal.length}\n` +
    `• Bloques ya cobrados (omitidos): ${deportistasYaCobrados.length}\n\n` +
    `Total: ${formatearMonto(reporteFinal.reduce((acc, item) => acc + item.montoTotal, 0))}`
  );
  if (!confirmacion) return;
  setCargandoGOM(true);
  try {
    const fechaHoy = obtenerFechaLocal();
    const batch = reporteFinal.map(item => {
      // Ordenar las fechas de los entrenamientos
      const fechasOrdenadas = [...item.fechas].sort();
      const fechaPrimerEntrenamiento = fechasOrdenadas[0];
      const fechaUltimoEntrenamiento = fechasOrdenadas[fechasOrdenadas.length - 1];
      
      // Crear descripción clara con ambas fechas
      const conceptoDetalle = `Arriendo GOM | Entrenamientos: ${formatearFecha(fechaPrimerEntrenamiento)} al ${formatearFecha(fechaUltimoEntrenamiento)} | Generado: ${fechaHoy} | ${item.horario}`;
      
      return addDoc(collection(db, 'transacciones'), {
        deportistaId: item.deportistaId,
        deportistaNombre: item.deportistaNombre,
        categoria: item.categoria,
        tipo: 'cargo',
        concepto: 'gom',
        conceptoDetalle: conceptoDetalle,
        monto: item.montoTotal,
        fechaVencimiento: fechaHoy,
        estado: 'pendiente',
        observaciones: `Fechas entrenamiento: ${item.fechas.join(', ')} | Horario: ${item.horario} | Generado por: ${usuario?.nombre || 'Admin'}`,
        fechaPrimerEntrenamiento: fechaPrimerEntrenamiento,
        fechaUltimoEntrenamiento: fechaUltimoEntrenamiento,
        fechaGeneracion: fechaHoy,
        fechaCreacion: new Date().toISOString(),
        creadoPor: usuario?.nombre || 'Admin'
      });
    });
    await Promise.all(batch);
    alert(`✅ ${reporteFinal.length} cobros GOM cargados exitosamente\n\n📅 Fecha de generación: ${fechaHoy}`);
    setMostrarModalGOM(false);
    setReporteGOM([]);
    setReporteFinal([]);
    setDeportistasYaCobrados([]);
    setFechaGOMInicio('');
    setFechaGOMFin('');
    await cargarDatos();
  } catch (error) {
    alert(" Error: " + error.message);
  }
  setCargandoGOM(false);
};

  const buscarAsistenciasAEliminar = async () => {
    if (!fechaEliminarInicio || !fechaEliminarFin) return alert("Selecciona el rango de fechas");
    setBuscandoAsistencias(true);
    try {
      const snapshot = await getDocs(collection(db, 'asistencias'));
      const asistencias = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const asistenciasFiltradas = asistencias.filter(a => {
        const coincideFecha = a.fecha >= fechaEliminarInicio && a.fecha <= fechaEliminarFin;
        const coincideActividad = !actividadEliminar || a.actividad === actividadEliminar;
        return coincideFecha && coincideActividad;
      });
      setAsistenciasAEliminar(asistenciasFiltradas);
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
    setBuscandoAsistencias(false);
  };

  const eliminarAsistencias = async () => {
    if (asistenciasAEliminar.length === 0) return alert("No hay asistencias para eliminar");
    const confirmacion = window.confirm(`⚠️ ¿Eliminar ${asistenciasAEliminar.length} registros? Esta acción no se puede deshacer.`);
    if (!confirmacion) return;
    setEliminandoAsistencias(true);
    try {
      await Promise.all(asistenciasAEliminar.map(a => deleteDoc(doc(db, 'asistencias', a.id))));
      alert(`🗑️ ${asistenciasAEliminar.length} asistencias eliminadas`);
      setMostrarModalEliminarAsistencias(false);
      setAsistenciasAEliminar([]);
      setFechaEliminarInicio('');
      setFechaEliminarFin('');
      setActividadEliminar('');
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
    setEliminandoAsistencias(false);
  };

  const handleExportarExcel = () => {
    const datosParaExcel = transaccionesFiltradas.map(t => ({
  'ID_Transaccion': t.id,
  'Fecha Generación': t.fechaGeneracion || '',
  'Fecha Entrenamiento': t.fechaPrimerEntrenamiento || '',
  'Deportista': t.deportistaNombre,
  'Categoría': t.categoria,
  'Concepto': t.conceptoDetalle,
  'Monto': t.monto,
  'Estado': t.estado,
  'Vencimiento': t.fechaVencimiento,
  'Fecha Pago': t.fechaPago || '',
  'Método Pago': t.metodoPago || '',
  'Observaciones': t.observacionesPago || t.observaciones || ''
}));

    const ws = XLSX.utils.json_to_sheet(datosParaExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cobranzas");
    
    ws['!cols'] = [
      { wch: 25 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, 
      { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, 
      { wch: 12 }, { wch: 15 }, { wch: 20 }
    ];

    XLSX.writeFile(wb, `Cobranzas_ESM_${obtenerFechaLocal()}.xlsx`);
  };

  const handleEliminarSeleccionadas = async () => {
    if (transaccionesSeleccionadas.length === 0) return;
    const confirmacion = window.confirm(`⚠️ ¿Eliminar ${transaccionesSeleccionadas.length} transacciones? No se puede deshacer.`);
    if (!confirmacion) return;
    try {
      await Promise.all(transaccionesSeleccionadas.map(id => deleteDoc(doc(db, 'transacciones', id))));
      alert(`🗑️ Eliminadas correctamente`);
      setTransaccionesSeleccionadas([]);
      await cargarDatos();
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
  };

  const prepararCorreccionMasiva = () => {
    if (transaccionesSeleccionadas.length === 0) return alert("Selecciona al menos una transacción");
    if (!montoCorreccion && !fechaCorreccion && !estadoCorreccion) return alert("Completa al menos un campo");
    setTransaccionesAModificar(transaccionesSeleccionadas.map(id => transacciones.find(t => t.id === id)).filter(Boolean));
    setMostrarConfirmacion(true);
  };

  const aplicarCorreccionMasiva = async () => {
    try {
      const batch = transaccionesSeleccionadas.map(id => {
        const t = transacciones.find(tr => tr.id === id);
        if (!t) return null;
        const actualizaciones = {};
        if (montoCorreccion) actualizaciones.monto = Number(montoCorreccion);
        if (fechaCorreccion) actualizaciones.fechaVencimiento = fechaCorreccion;
        if (estadoCorreccion) actualizaciones.estado = estadoCorreccion;
        actualizaciones.fechaCorreccion = new Date().toISOString();
        actualizaciones.corregidoPor = usuario?.nombre || 'Admin';
        return updateDoc(doc(db, 'transacciones', id), actualizaciones);
      }).filter(Boolean);
      await Promise.all(batch);
      alert(`✅ Corrección aplicada`);
      setTransaccionesSeleccionadas([]);
      setMontoCorreccion(''); setFechaCorreccion(''); setEstadoCorreccion('');
      setMostrarConfirmacion(false);
      await cargarDatos();
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
  };

  const handleCargarCargoMasivo = async () => {
    if (!formCargo.conceptoDetalle || !formCargo.monto) return alert("Completa concepto y monto");
    const deportistasAplicar = formCargo.aplicarATodos ? deportistas : deportistas.filter(d => formCargo.deportistasSeleccionados.includes(d.id));
    if (deportistasAplicar.length === 0) return alert("Selecciona al menos un deportista");
    try {
      await Promise.all(deportistasAplicar.map(dep => addDoc(collection(db, 'transacciones'), {
        deportistaId: dep.id,
        deportistaNombre: `${dep.primerNombre} ${dep.apellidoPaterno}`,
        categoria: dep.categoria,
        tipo: 'cargo',
        concepto: formCargo.concepto,
        conceptoDetalle: formCargo.conceptoDetalle,
        monto: Number(formCargo.monto),
        fechaVencimiento: formCargo.fechaVencimiento,
        estado: 'pendiente',
        observaciones: formCargo.observaciones,
        fechaCreacion: new Date().toISOString(),
        creadoPor: usuario?.nombre || 'Admin'
      })));
      alert(`✅ Cargo cargado para ${deportistasAplicar.length} deportistas`);
      setMostrarModalCargo(false);
      setFormCargo({ concepto: 'mensualidad', conceptoDetalle: '', monto: '', fechaVencimiento: '', observaciones: '', aplicarATodos: true, deportistasSeleccionados: [] });
      await cargarDatos();
    } catch (error) { alert("❌ Error: " + error.message); }
  };

  const handleRegistrarPago = async () => {
    if (!transaccionPago || !formPago.monto) return alert("Completa el monto");
    try {
      const montoPago = Number(formPago.monto);
      const nuevoEstado = montoPago >= (transaccionPago.monto || 0) ? 'pagado' : 'parcial';
      await updateDoc(doc(db, 'transacciones', transaccionPago.id), {
        estado: nuevoEstado, montoPagado: montoPago, metodoPago: formPago.metodoPago,
        fechaPago: formPago.fechaPago, observacionesPago: formPago.observaciones,
        fechaActualizacion: new Date().toISOString()
      });
      alert("✅ Pago registrado");
      setMostrarModalPago(false); setTransaccionPago(null);
      await cargarDatos();
    } catch (error) { alert("❌ Error: " + error.message); }
  };

  const generarMensajeWhatsApp = (depId) => {
    const depResumen = resumenPorDeportista[depId];
    if (!depResumen || depResumen.transaccionesPendientes.length === 0) return alert("No tiene deudas pendientes");
    const dep = depResumen.deportista;
    const nombreCompleto = `${dep.primerNombre} ${dep.apellidoPaterno}`.trim();
    let mensaje = `Hola, espero que estés muy bien. 💙💛\n\nTe escribimos de la administración de Estudiantil San Miguel para recordarte la regularización de tu cuenta.\n\n📋 Detalle:\n ${nombreCompleto}\n🏒 ${dep.categoria}\n\n⚠️ Cargos pendientes:\n`;
    depResumen.transaccionesPendientes.forEach(t => { mensaje += `• ${t.conceptoDetalle}: ${formatearMonto(t.monto)}\n`; });
    mensaje += `\n💰 Total: ${formatearMonto(depResumen.totalPendiente)}\n\n🏦 Datos transferencia:\n• Enrique Mardones\n• RUT: 10.970.570-5\n• Banco de Chile - Cta. Cte. 00-094-52690-06\n• Email: quiquemardonesa@gmail.com\n• Asunto: ${nombreCompleto}\n\n¡Gracias por tu apoyo! 🏒`;
    navigator.clipboard.writeText(mensaje).then(() => alert("✅ Mensaje copiado"));
  };

  // ✅ FUNCIONES DE IMPORTACIÓN
  const handleSeleccionarArchivo = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const datos = XLSX.utils.sheet_to_json(ws);

        if (datos.length === 0) {
          alert("⚠️ El archivo está vacío");
          return;
        }

        if (!datos[0].hasOwnProperty('ID_Transaccion')) {
          alert("⚠️ El archivo no tiene la columna 'ID_Transaccion'. Usa un Excel exportado desde el sistema.");
          return;
        }

        setArchivoImportado(archivo.name);
        setDatosImportados(datos);
        setResumenImportacion(null);
      } catch (error) {
        alert("❌ Error al leer el archivo: " + error.message);
      }
    };
    reader.readAsBinaryString(archivo);
  };

  const handleProcesarImportacion = async () => {
    if (datosImportados.length === 0) return;

    const confirmacion = window.confirm(
      `⚠️ ¿Procesar ${datosImportados.length} filas del Excel?\n\n` +
      `• Las filas con ID existente se ACTUALIZARÁN\n` +
      `• Las filas sin ID o con ID nuevo se CREARÁN como nuevas transacciones\n\n` +
      `Esta acción no se puede deshacer.`
    );
    if (!confirmacion) return;

    setImportando(true);
    setResumenImportacion({ actualizadas: 0, creadas: 0, errores: 0, detalles: [] });

    try {
      const resumen = { actualizadas: 0, creadas: 0, errores: 0, detalles: [] };

      for (const fila of datosImportados) {
        try {
          const idTransaccion = fila['ID_Transaccion'];
          const deportistaNombre = fila['Deportista'];
          const conceptoDetalle = fila['Concepto'];
          const monto = Number(fila['Monto']) || 0;
          const estado = fila['Estado'] || 'pendiente';
          const fechaVencimiento = fila['Vencimiento'] || '';
          const fechaPago = fila['Fecha Pago'] || '';
          const metodoPago = fila['Método Pago'] || '';
          const observaciones = fila['Observaciones'] || '';

          const deportista = deportistas.find(d => 
            `${d.primerNombre} ${d.apellidoPaterno}`.trim() === deportistaNombre
          );

          const datosTransaccion = {
            deportistaNombre,
            categoria: deportista?.categoria || 'Sin Categoría',
            conceptoDetalle,
            monto,
            estado,
            fechaVencimiento,
            fechaPago,
            metodoPago,
            observaciones,
            fechaActualizacion: new Date().toISOString()
          };

          if (deportista) {
            datosTransaccion.deportistaId = deportista.id;
          }

          if (idTransaccion && transacciones.find(t => t.id === idTransaccion)) {
            await updateDoc(doc(db, 'transacciones', idTransaccion), datosTransaccion);
            resumen.actualizadas++;
            resumen.detalles.push(`✅ Actualizada: ${deportistaNombre} - ${conceptoDetalle}`);
          } else {
            datosTransaccion.tipo = 'cargo';
            datosTransaccion.concepto = 'otro';
            datosTransaccion.fechaCreacion = new Date().toISOString();
            datosTransaccion.creadoPor = usuario?.nombre || 'Admin (Importación)';
            await addDoc(collection(db, 'transacciones'), datosTransaccion);
            resumen.creadas++;
            resumen.detalles.push(`➕ Creada: ${deportistaNombre} - ${conceptoDetalle}`);
          }
        } catch (error) {
          resumen.errores++;
          resumen.detalles.push(`❌ Error: ${fila['Deportista']} - ${error.message}`);
        }
      }

      setResumenImportacion(resumen);
      await cargarDatos();
      alert(`✅ Importación completada:\n• Actualizadas: ${resumen.actualizadas}\n• Creadas: ${resumen.creadas}\n• Errores: ${resumen.errores}`);
    } catch (error) {
      alert("❌ Error durante la importación: " + error.message);
    }

    setImportando(false);
  };

  const cerrarModalImportar = () => {
    setMostrarModalImportar(false);
    setArchivoImportado(null);
    setDatosImportados([]);
    setResumenImportacion(null);
  };

  if (cargando) return <div className="p-8 text-center">Cargando...</div>;
  const rankingMorosidad = Object.entries(resumenPorCategoria).sort((a, b) => b[1].pendiente - a[1].pendiente);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">💰 Módulo de Cobranza</h2>
          <p className="text-gray-600 mt-1">Sistema de transacciones y gestión de cobros</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setVista('resumen')} className={`px-4 py-2 rounded-lg font-medium ${vista === 'resumen' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}>📊 Resumen</button>
          <button onClick={() => setVista('transacciones')} className={`px-4 py-2 rounded-lg font-medium ${vista === 'transacciones' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}>📋 Transacciones</button>
          <button onClick={() => setMostrarModalCargo(true)} className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700">➕ Cargar Cargo</button>
          <button onClick={() => setMostrarModalGOM(true)} className="px-4 py-2 rounded-lg font-medium bg-orange-600 text-white hover:bg-orange-700">🏋️ Generar Cobro GOM</button>
          <button onClick={() => setMostrarModalEliminarAsistencias(true)} className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700">🗑️ Eliminar Asistencias</button>
          <button onClick={() => setMostrarModalImportar(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
            📥 Importar desde Excel
          </button>
        </div>
      </div>

      {vista === 'resumen' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-500">
              <p className="text-gray-500 text-sm">Total Pendiente</p>
              <p className="text-2xl font-bold text-red-600">{formatearMonto(resumenGeneral.totalPendiente)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500">
              <p className="text-gray-500 text-sm">Deportistas con Deuda</p>
              <p className="text-2xl font-bold text-blue-600">{resumenGeneral.deudores}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-green-500">
              <p className="text-gray-500 text-sm">Total Cobrado</p>
              <p className="text-2xl font-bold text-green-600">{formatearMonto(resumenGeneral.totalPagado)}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Deportistas con Deuda Pendiente</h3>
              <button onClick={handleExportarExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2">📊 Exportar Todo a Excel</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-4 font-semibold text-gray-700">Deportista</th>
                    <th className="p-4 font-semibold text-gray-700">Categoría</th>
                    <th className="p-4 font-semibold text-gray-700 text-right">Monto Pendiente</th>
                    <th className="p-4 font-semibold text-gray-700 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.values(resumenPorDeportista).filter(r => r.totalPendiente > 0).sort((a, b) => b.totalPendiente - a.totalPendiente).map(r => (
                    <tr key={r.deportista.id} className="hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-800">{r.deportista.primerNombre} {r.deportista.apellidoPaterno}</td>
                      <td className="p-4 text-sm text-gray-600">{r.deportista.categoria}</td>
                      <td className="p-4 text-right font-bold text-red-600">{formatearMonto(r.totalPendiente)}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => generarMensajeWhatsApp(r.deportista.id)} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-200">📱 WhatsApp</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {vista === 'transacciones' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-md flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-3 py-2 border rounded-lg">
                <option value="pendientes">⏳ Pendientes</option>
                <option value="pagadas">✅ Pagadas</option>
                <option value="todos">📋 Todas</option>
              </select>
              <select value={filtroConcepto} onChange={(e) => setFiltroConcepto(e.target.value)} className="px-3 py-2 border rounded-lg">
                <option value="todos">Todos los conceptos</option>
                {Object.entries(CONCEPTOS).map(([key, val]) => (<option key={key} value={key}>{val.icono} {val.nombre}</option>))}
              </select>
              <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="px-3 py-2 border rounded-lg">
                <option value="todas">Todas las categorías</option>
                {categoriasUnicas.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
            </div>
            <select value={filtroDeportista} onChange={(e) => setFiltroDeportista(e.target.value)} className="w-full md:w-64 px-3 py-2 border rounded-lg">
              <option value="">Todos los deportistas</option>
              {deportistas.map(dep => (<option key={dep.id} value={dep.id}>{dep.primerNombre} {dep.apellidoPaterno}</option>))}
            </select>
          </div>
          <div className="flex justify-end mt-2">
  <button 
    onClick={handleExportarExcel} 
    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
  >
    📊 Exportar Todo a Excel
  </button>
</div>
          {transaccionesParaCorreccion.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
              <h3 className="text-lg font-bold text-yellow-900 mb-2">⚠️ Acciones Masivas</h3>
              <div className="bg-white p-3 rounded-lg border border-yellow-300 mb-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input type="text" value={filtroDetalleBusqueda} onChange={(e) => { setFiltroDetalleBusqueda(e.target.value); setTransaccionesSeleccionadas([]); }} placeholder="🔍 Buscar en detalle" className="px-3 py-2 border rounded-lg text-sm" />
                  <input type="date" value={fechaCreacionDesde} onChange={(e) => { setFechaCreacionDesde(e.target.value); setTransaccionesSeleccionadas([]); }} className="px-3 py-2 border rounded-lg text-sm" />
                  <input type="date" value={fechaCreacionHasta} onChange={(e) => { setFechaCreacionHasta(e.target.value); setTransaccionesSeleccionadas([]); }} className="px-3 py-2 border rounded-lg text-sm" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={transaccionesSeleccionadas.length === transaccionesParaCorreccion.length && transaccionesParaCorreccion.length > 0} onChange={(e) => setTransaccionesSeleccionadas(e.target.checked ? transaccionesParaCorreccion.map(t => t.id) : [])} className="rounded text-yellow-600" />
                  <span className="text-yellow-900 font-medium">Seleccionar todas ({transaccionesParaCorreccion.length})</span>
                </label>
              </div>
              
              {transaccionesSeleccionadas.length > 0 && (
                <div className="bg-white p-3 rounded-lg border border-yellow-300 flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1 w-full"><label className="block text-xs font-medium mb-1">Nuevo monto</label><input type="number" value={montoCorreccion} onChange={(e) => setMontoCorreccion(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div className="flex-1 w-full"><label className="block text-xs font-medium mb-1">Nueva fecha</label><input type="date" value={fechaCorreccion} onChange={(e) => setFechaCorreccion(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
                  <div className="flex-1 w-full"><label className="block text-xs font-medium mb-1">Nuevo estado</label><select value={estadoCorreccion} onChange={(e) => setEstadoCorreccion(e.target.value)} className="w-full px-3 py-2 border rounded-lg"><option value="">Sin cambios</option><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option></select></div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={prepararCorreccionMasiva} className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 flex-1">🔄 Corregir</button>
                    <button onClick={handleEliminarSeleccionadas} className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 flex-1">🗑️ Borrar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-4 font-semibold text-gray-700">Deportista</th>
                    <th className="p-4 font-semibold text-gray-700">Concepto</th>
                    <th className="p-4 font-semibold text-gray-700 text-right">Monto</th>
                    <th className="p-4 font-semibold text-gray-700 text-center">Estado</th>
                    <th className="p-4 font-semibold text-gray-700 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transaccionesFiltradas.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-gray-500">No hay transacciones que coincidan con los filtros</td></tr>
                  ) : (
                    transaccionesFiltradas.map(t => (
                      <tr key={t.id} className={`hover:bg-gray-50 ${transaccionesSeleccionadas.includes(t.id) ? 'bg-yellow-50' : ''}`}>
                        <td className="p-4 font-medium text-gray-800">
                          <div className="flex items-center">
                            <input type="checkbox" checked={transaccionesSeleccionadas.includes(t.id)} onChange={(e) => {
                              if (e.target.checked) setTransaccionesSeleccionadas([...transaccionesSeleccionadas, t.id]);
                              else setTransaccionesSeleccionadas(transaccionesSeleccionadas.filter(id => id !== t.id));
                            }} className="mr-2 rounded text-blue-600" />
                            {t.deportistaNombre}
                          </div>
                        </td>
                        <td className="p-4">
                        <div className="text-sm font-medium text-gray-800">{t.conceptoDetalle}</div>
                         {t.fechaGeneracion && t.fechaPrimerEntrenamiento && (
                        <div className="text-xs text-gray-500 mt-1">
                         Entrenamiento: {formatearFecha(t.fechaPrimerEntrenamiento)} | 💰 Generado: {formatearFecha(t.fechaGeneracion)}
                        </div>
                         )}
                           </td>
                        <td className="p-4 text-right font-bold">{formatearMonto(t.monto)}</td>
                        <td className="p-4 text-center">
                          {t.estado === 'pagado' ? <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">✅ Pagado</span> :
                           t.estado === 'parcial' ? <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">⚠️ Parcial</span> :
                           <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">⏳ Pendiente</span>}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            {t.estado !== 'pagado' && (
                              <button onClick={() => { setTransaccionPago(t); setFormPago({...formPago, monto: t.monto}); setMostrarModalPago(true); }} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-200">💵 Pagar</button>
                            )}
                            <button onClick={() => { setTransaccionEditando(t); setMostrarModalTransaccion(true); }} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-200">✏️ Editar</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {mostrarModalGOM && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">🏋️ Generador de Cobro GOM</h3>
              <button onClick={() => setMostrarModalGOM(false)} className="text-2xl text-gray-500">✕</button>
            </div>
            <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 mb-4">
              <p className="text-sm text-orange-900">💡 El sistema distingue bloques horarios distintos el mismo día. Las asistencias antiguas sin horario se agrupan como "Sin Horario".</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio *</label>
                <input type="date" value={fechaGOMInicio} onChange={(e) => setFechaGOMInicio(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin *</label>
                <input type="date" value={fechaGOMFin} onChange={(e) => setFechaGOMFin(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>
            <button onClick={generarReporteGOM} disabled={generandoGOM || !fechaGOMInicio || !fechaGOMFin} className={`w-full py-3 rounded-lg font-bold text-lg mb-4 ${generandoGOM || !fechaGOMInicio || !fechaGOMFin ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
              {generandoGOM ? '⏳ Generando...' : '🔍 Generar Reporte GOM'}
            </button>

            {reporteGOM.length > 0 && (
              <>
                {deportistasYaCobrados.length > 0 && (
                  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-900 font-bold mb-2">⚠️ {deportistasYaCobrados.length} bloque(s) ya cobrado(s):</p>
                    <ul className="text-sm text-yellow-800 list-disc list-inside max-h-32 overflow-y-auto">
                      {deportistasYaCobrados.map((item, idx) => (
                        <li key={idx}>{item.deportistaNombre} ({item.categoria}) - <b>{item.horario}</b> - {formatearMonto(item.montoTotal)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {reporteFinal.length > 0 ? (
                  <>
                    <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4">
                      <p className="text-sm text-blue-900 font-medium mb-2">📊 Resumen:</p>
                      <p className="text-sm text-blue-800">• Filas a cobrar: <b className="text-green-700">{reporteFinal.length}</b></p>
                      <p className="text-sm text-blue-800">• Total: <b className="text-green-700">{formatearMonto(reporteFinal.reduce((acc, item) => acc + item.montoTotal, 0))}</b></p>
                    </div>
                    <div className="overflow-x-auto mb-4 max-h-96">
                      <table className="w-full text-left">
                        <thead className="bg-gray-100 border-b sticky top-0">
                          <tr>
                            <th className="p-3 font-semibold text-gray-700">Deportista</th>
                            <th className="p-3 font-semibold text-gray-700">Categoría</th>
                            <th className="p-3 font-semibold text-gray-700 text-center">Horario</th>
                            <th className="p-3 font-semibold text-gray-700 text-center">Días</th>
                            <th className="p-3 font-semibold text-gray-700 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {reporteFinal.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="p-3 font-medium text-gray-800">{item.deportistaNombre}</td>
                              <td className="p-3 text-sm text-gray-600">{item.categoria}</td>
                              <td className="p-3 text-center">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.horario === 'Sin Horario' ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-800'}`}>{item.horario}</span>
                              </td>
                              <td className="p-3 text-center"><span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">{item.asistencias}</span></td>
                              <td className="p-3 text-right font-bold text-orange-600">{formatearMonto(item.montoTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <button onClick={cargarCobrosGOM} disabled={cargandoGOM} className={`w-full py-3 rounded-lg font-bold text-lg ${cargandoGOM ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                      {cargandoGOM ? '⏳ Cargando...' : `✅ Cargar ${reporteFinal.length} Cobros GOM Nuevos`}
                    </button>
                  </>
                ) : (
                  <div className="bg-green-50 border border-green-300 rounded-lg p-6 text-center">
                    <p className="text-green-900 font-bold text-lg mb-2">✅ ¡Todo al día!</p>
                    <p className="text-green-800">Todos los bloques horarios ya tienen su cobro registrado.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {mostrarModalEliminarAsistencias && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">🗑️ Eliminar Asistencias</h3>
              <button onClick={() => setMostrarModalEliminarAsistencias(false)} className="text-2xl text-gray-500">✕</button>
            </div>
            <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-900">⚠️ Esta herramienta te permite eliminar registros de asistencia. Úsala con cuidado.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio *</label>
                <input type="date" value={fechaEliminarInicio} onChange={(e) => setFechaEliminarInicio(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin *</label>
                <input type="date" value={fechaEliminarFin} onChange={(e) => setFechaEliminarFin(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actividad (opcional)</label>
                <select value={actividadEliminar} onChange={(e) => setActividadEliminar(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">Todas las actividades</option>
                  <option value="Hockey Patines">🏒 Hockey Patines</option>
                  <option value="Preparación Física">🏃 Preparación Física</option>
                  <option value="Preparación Arqueros">🧤 Preparación Arqueros</option>
                  <option value="Entrenamiento GOM">🏋️ Entrenamiento GOM</option>
                </select>
              </div>
            </div>
            <button onClick={buscarAsistenciasAEliminar} disabled={buscandoAsistencias || !fechaEliminarInicio || !fechaEliminarFin} className={`w-full py-3 rounded-lg font-bold text-lg mb-4 ${buscandoAsistencias || !fechaEliminarInicio || !fechaEliminarFin ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>
              {buscandoAsistencias ? '⏳ Buscando...' : '🔍 Buscar Asistencias'}
            </button>
            {asistenciasAEliminar.length > 0 && (
              <>
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-900 font-medium">⚠️ Se encontraron <b>{asistenciasAEliminar.length} registros</b> que serán eliminados:</p>
                </div>
                <div className="overflow-x-auto mb-4 max-h-96">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b sticky top-0">
                      <tr>
                        <th className="p-3 font-semibold text-gray-700">Fecha</th>
                        <th className="p-3 font-semibold text-gray-700">Categoría</th>
                        <th className="p-3 font-semibold text-gray-700">Actividad</th>
                        <th className="p-3 font-semibold text-gray-700 text-center">Deportistas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {asistenciasAEliminar.map((a, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="p-3 text-sm">{formatearFecha(a.fecha)}</td>
                          <td className="p-3 text-sm text-gray-600">{a.categoria}</td>
                          <td className="p-3 text-sm">{a.actividad}</td>
                          <td className="p-3 text-center"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{a.registros?.length || 0} deportistas</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={eliminarAsistencias} disabled={eliminandoAsistencias} className={`w-full py-3 rounded-lg font-bold text-lg ${eliminandoAsistencias ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                  {eliminandoAsistencias ? '⏳ Eliminando...' : '🗑️ Confirmar Eliminación'}
                </button>
              </>
            )}
            {asistenciasAEliminar.length === 0 && fechaEliminarInicio && fechaEliminarFin && !buscandoAsistencias && (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-center">
                <p className="text-gray-600">No se encontraron asistencias en ese rango de fechas</p>
              </div>
            )}
          </div>
        </div>
      )}

      {mostrarConfirmacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <h3 className="text-2xl font-bold text-yellow-800 mb-4">⚠️ Confirmar Corrección</h3>
            <p className="mb-4">Se modificarán {transaccionesAModificar.length} transacciones.</p>
            <div className="flex gap-3">
              <button onClick={() => setMostrarConfirmacion(false)} className="flex-1 bg-gray-200 py-3 rounded-lg">Cancelar</button>
              <button onClick={aplicarCorreccionMasiva} className="flex-1 bg-yellow-600 text-white py-3 rounded-lg">✅ Aplicar</button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalCargo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">➕ Cargar Cargo Masivo</h3>
              <button onClick={() => setMostrarModalCargo(false)} className="text-2xl">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Concepto</label>
                <select value={formCargo.concepto} onChange={(e) => setFormCargo({...formCargo, concepto: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                  {Object.entries(CONCEPTOS).map(([key, val]) => (<option key={key} value={key}>{val.icono} {val.nombre}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Detalle *</label>
                <input type="text" value={formCargo.conceptoDetalle} onChange={(e) => setFormCargo({...formCargo, conceptoDetalle: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Monto *</label><input type="number" value={formCargo.monto} onChange={(e) => setFormCargo({...formCargo, monto: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Vencimiento</label><input type="date" value={formCargo.fechaVencimiento} onChange={(e) => setFormCargo({...formCargo, fechaVencimiento: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formCargo.aplicarATodos} onChange={(e) => setFormCargo({...formCargo, aplicarATodos: e.target.checked})} className="rounded" />
                <span className="text-sm font-medium">Aplicar a todos los deportistas</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setMostrarModalCargo(false)} className="flex-1 bg-gray-200 py-3 rounded-lg">Cancelar</button>
              <button onClick={handleCargarCargoMasivo} className="flex-1 bg-primary text-white py-3 rounded-lg">💾 Cargar</button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalPago && transaccionPago && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">💵 Registrar Pago</h3>
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm">Deportista: <b>{transaccionPago.deportistaNombre}</b></p>
              <p className="text-sm">Monto adeudado: <b className="text-red-600">{formatearMonto(transaccionPago.monto)}</b></p>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Monto a pagar *</label><input type="number" value={formPago.monto} onChange={(e) => setFormPago({...formPago, monto: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Método</label>
                <select value={formPago.metodoPago} onChange={(e) => setFormPago({...formPago, metodoPago: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Fecha</label><input type="date" value={formPago.fechaPago} onChange={(e) => setFormPago({...formPago, fechaPago: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setMostrarModalPago(false)} className="flex-1 bg-gray-200 py-3 rounded-lg">Cancelar</button>
              <button onClick={handleRegistrarPago} className="flex-1 bg-green-600 text-white py-3 rounded-lg">✅ Registrar</button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalTransaccion && transaccionEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">✏️ Editar Transacción</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Concepto</label><input type="text" value={transaccionEditando.conceptoDetalle} onChange={(e) => setTransaccionEditando({...transaccionEditando, conceptoDetalle: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Monto</label><input type="number" value={transaccionEditando.monto} onChange={(e) => setTransaccionEditando({...transaccionEditando, monto: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Estado</label>
                <select value={transaccionEditando.estado} onChange={(e) => setTransaccionEditando({...transaccionEditando, estado: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                  <option value="pendiente">Pendiente</option>
                  <option value="pagado">Pagado</option>
                  <option value="parcial">Parcial</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setMostrarModalTransaccion(false)} className="flex-1 bg-gray-200 py-3 rounded-lg">Cancelar</button>
              <button onClick={() => { updateDoc(doc(db, 'transacciones', transaccionEditando.id), transaccionEditando).then(() => { setMostrarModalTransaccion(false); cargarDatos(); }); }} className="flex-1 bg-primary text-white py-3 rounded-lg">💾 Guardar</button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalImportar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">📥 Importar Cobranzas desde Excel</h3>
              <button onClick={cerrarModalImportar} className="text-2xl text-gray-500">✕</button>
            </div>

            <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900 font-medium mb-2">📋 Instrucciones:</p>
              <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                <li>Exporta las cobranzas actuales con el botón "📊 Exportar Todo a Excel".</li>
                <li>Revisa y corrige los datos en Excel (estados, montos, fechas, etc.).</li>
                <li><b>NO borres la columna "ID_Transaccion"</b> (es la que permite identificar cada registro).</li>
                <li>Guarda el archivo y selecciónalo aquí.</li>
              </ol>
            </div>

            {!archivoImportado ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 mb-2 block">Seleccionar archivo Excel:</span>
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv" 
                    onChange={handleSeleccionarArchivo}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-300 rounded-lg p-3">
                  <p className="text-sm text-green-900">
                    ✅ Archivo cargado: <b>{archivoImportado}</b>
                  </p>
                  <p className="text-sm text-green-800 mt-1">
                    📊 Filas detectadas: <b>{datosImportados.length}</b>
                  </p>
                </div>

                {resumenImportacion && (
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-sm font-bold text-yellow-900 mb-2">📊 Resumen de la importación:</p>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>✅ Actualizadas: <b>{resumenImportacion.actualizadas}</b></li>
                      <li>➕ Creadas nuevas: <b>{resumenImportacion.creadas}</b></li>
                      <li>❌ Errores: <b>{resumenImportacion.errores}</b></li>
                    </ul>
                    <details className="mt-2">
                      <summary className="text-xs text-yellow-700 cursor-pointer">Ver detalles</summary>
                      <ul className="text-xs text-yellow-800 mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {resumenImportacion.detalles.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </details>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={cerrarModalImportar} className="flex-1 bg-gray-200 py-3 rounded-lg font-medium">
                    {resumenImportacion ? 'Cerrar' : 'Cancelar'}
                  </button>
                  {!resumenImportacion && (
                    <button 
                      onClick={handleProcesarImportacion} 
                      disabled={importando}
                      className={`flex-1 py-3 rounded-lg font-medium ${importando ? 'bg-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      {importando ? '⏳ Procesando...' : '🚀 Procesar Importación'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
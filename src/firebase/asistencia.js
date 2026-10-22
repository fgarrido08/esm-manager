import { 
  collection, addDoc, getDocs, query, where, doc, updateDoc 
} from "firebase/firestore";
import { db } from "./config";

// 👈 CAMBIO CLAVE: Ahora apunta a la colección correcta en PLURAL
const COLECCION = "asistencias";

// 1. Guardar asistencia (ahora guarda quién la tomó)
export const guardarAsistencia = async (fecha, categoria, actividad, registros, profesorNombre) => {
  const docRef = await addDoc(collection(db, COLECCION), {
    fecha,
    categoria,
    actividad,
    registros,
    profesorNombre: profesorNombre || 'Desconocido',
    fechaCreacion: new Date().toISOString()
  });
  return docRef.id;
};

// 2. Obtener asistencia por fecha, categoría y actividad
export const obtenerAsistenciaPorFecha = async (fecha, categoria, actividad) => {
  const q = query(
    collection(db, COLECCION),
    where("fecha", "==", fecha),
    where("categoria", "==", categoria),
    where("actividad", "==", actividad)
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

// 3. Actualizar asistencia existente
export const actualizarAsistencia = async (id, registros, profesorNombre) => {
  const docRef = doc(db, COLECCION, id);
  await updateDoc(docRef, {
    registros,
    profesorNombre: profesorNombre || 'Desconocido',
    fechaActualizacion: new Date().toISOString()
  });
};

// 4. Obtener TODAS las asistencias (para el historial)
export const obtenerTodasLasAsistencias = async () => {
  const querySnapshot = await getDocs(collection(db, COLECCION));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
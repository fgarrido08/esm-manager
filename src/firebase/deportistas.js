import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc,
  updateDoc 
} from "firebase/firestore";
import { db } from "./config";

// Nombre de la colección en la base de datos
const COLECCION = "deportistas";

// 1. Obtener todos los deportistas
export const obtenerDeportistas = async () => {
  const querySnapshot = await getDocs(collection(db, COLECCION));
  return querySnapshot.docs.map(doc => ({
    id: doc.id, // Guardamos el ID de Firebase para poder editar/borrar
    ...doc.data()
  }));
};

// 2. Agregar un nuevo deportista
export const agregarDeportista = async (deportista) => {
  await addDoc(collection(db, COLECCION), {
    ...deportista,
    fechaCreacion: new Date().toISOString()
  });
};

// 3. Eliminar un deportista
export const eliminarDeportista = async (id) => {
  await deleteDoc(doc(db, COLECCION, id));
};

// 4. Actualizar un deportista (lo usaremos después)
export const actualizarDeportista = async (id, datosActualizados) => {
  const docRef = doc(db, COLECCION, id);
  await updateDoc(docRef, datosActualizados);
};
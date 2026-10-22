import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc,
  updateDoc 
} from "firebase/firestore";
import { db } from "./config";

const COLECCION = "categorias";

// 1. Obtener todas las categorías
export const obtenerCategorias = async () => {
  const querySnapshot = await getDocs(collection(db, COLECCION));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// 2. Agregar una nueva categoría
export const agregarCategoria = async (nombre) => {
  await addDoc(collection(db, COLECCION), {
    nombre: nombre.toUpperCase(),
    fechaCreacion: new Date().toISOString()
  });
};

// 3. Actualizar una categoría
export const actualizarCategoria = async (id, nombre) => {
  const docRef = doc(db, COLECCION, id);
  await updateDoc(docRef, { nombre: nombre.toUpperCase() });
};

// 4. Eliminar una categoría
export const eliminarCategoria = async (id) => {
  await deleteDoc(doc(db, COLECCION, id));
};
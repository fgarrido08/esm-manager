import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc,
  updateDoc 
} from "firebase/firestore";
import { db } from "./config";

const COLECCION = "profesores";

// 1. Obtener todos los profesores
export const obtenerProfesores = async () => {
  const querySnapshot = await getDocs(collection(db, COLECCION));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// 2. Agregar un nuevo profesor
export const agregarProfesor = async (profesor) => {
  await addDoc(collection(db, COLECCION), {
    ...profesor,
    fechaCreacion: new Date().toISOString()
  });
};

// 3. Eliminar un profesor
export const eliminarProfesor = async (id) => {
  await deleteDoc(doc(db, COLECCION, id));
};

// 4. Actualizar un profesor (y su contraseña)
export const actualizarProfesor = async (id, datosActualizados) => {
  const docRef = doc(db, COLECCION, id);
  await updateDoc(docRef, datosActualizados);
};
// 5. Cambiar contraseña (y quitar el flag de cambio forzado)
export const cambiarPassword = async (id, nuevaPassword) => {
  const docRef = doc(db, COLECCION, id);
  await updateDoc(docRef, {
    password: nuevaPassword,
    cambioForzado: false 
  });
};
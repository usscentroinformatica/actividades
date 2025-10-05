import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';

export const obtenerActividades = async (nombreUsuario) => {
  try {
    const q = query(
      collection(db, 'actividades'),
      where('usuario', '==', nombreUsuario)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    return [];
  }
};

export const crearActividad = async (actividad, nombreUsuario) => {
  try {
    const actividadConUsuario = {
      ...actividad,
      usuario: nombreUsuario,
      creadoEn: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, 'actividades'), actividadConUsuario);
    return { id: docRef.id, ...actividadConUsuario };
  } catch (error) {
    console.error('Error al crear actividad:', error);
    throw error;
  }
};

export const actualizarActividad = async (id, actividad) => {
  try {
    const actividadRef = doc(db, 'actividades', id);
    await updateDoc(actividadRef, {
      ...actividad,
      actualizadoEn: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al actualizar actividad:', error);
    throw error;
  }
};

export const eliminarActividad = async (id) => {
  try {
    const actividadRef = doc(db, 'actividades', id);
    await deleteDoc(actividadRef);
  } catch (error) {
    console.error('Error al eliminar actividad:', error);
    throw error;
  }
};

// GUARDAR USUARIO EN LOCALSTORAGE
export const guardarUsuario = (nombre) => {
  const usuario = {
    nombre: nombre,
    fechaLogin: new Date().toISOString()
  };
  try {
    localStorage.setItem('calendarioUsuario', JSON.stringify(usuario));
  } catch (error) {
    console.error('Error al guardar usuario:', error);
  }
};

// OBTENER USUARIO DE LOCALSTORAGE
export const obtenerUsuario = () => {
  try {
    const usuarioGuardado = localStorage.getItem('calendarioUsuario');
    return usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return null;
  }
};

// CERRAR SESIÓN
export const cerrarSesion = () => {
  try {
    localStorage.removeItem('calendarioUsuario');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
};
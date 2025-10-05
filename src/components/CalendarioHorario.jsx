import { useState, useEffect } from 'react';
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, Trash2, Loader, CheckCircle2, StickyNote, CalendarDays } from 'lucide-react';
import { crearActividad, actualizarActividad, eliminarActividad } from '../services/activityService';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';

const CATEGORIAS = [
  { id: 'trabajo', nombre: 'Trabajo', color: 'bg-sky-500', gradient: 'from-sky-500 to-sky-600' },
  { id: 'personal', nombre: 'Personal', color: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600' },
  { id: 'salud', nombre: 'Salud', color: 'bg-indigo-500', gradient: 'from-indigo-500 to-indigo-600' },
  { id: 'estudio', nombre: 'Estudio', color: 'bg-cyan-500', gradient: 'from-cyan-500 to-cyan-600' },
  { id: 'reuniones', nombre: 'Reuniones', color: 'bg-slate-500', gradient: 'from-slate-500 to-slate-600' },
  { id: 'urgente', nombre: 'Urgente', color: 'bg-blue-600', gradient: 'from-blue-600 to-blue-700' },
  { id: 'otro', nombre: 'Otro', color: 'bg-gray-500', gradient: 'from-gray-500 to-gray-600' }
];

// AGREGA ESTA FUNCIÓN AQUÍ 👇
const obtenerCategoria = (categoriaId) => {
  return CATEGORIAS.find(c => c.id === categoriaId) || CATEGORIAS[0];
};

const HORAS = Array.from({ length: 17 }, (_, i) => i + 6);

export default function CalendarioHorario() {
  const [vista, setVista] = useState('semana');
  const [fechaActual, setFechaActual] = useState(new Date());
  const [actividades, setActividades] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [actividadEditando, setActividadEditando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [formData, setFormData] = useState({
  usuario: '',
  titulo: '',
  descripcion: '',
  fecha: '',
  horaInicio: '08:00',
  horaFin: '09:00',
  categoria: 'trabajo',
  completada: false
});

  useEffect(() => {
  const cargarActividadesFirebase = async () => {
    setCargando(true);
    try {
      // Cargar TODAS las actividades de Firebase (sin filtrar por usuario)
      const q = query(collection(db, 'actividades'));
      const snapshot = await getDocs(q);
      const acts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActividades(acts);
    } catch (error) {
      console.error('Error al cargar actividades:', error);
      setActividades([]);
    } finally {
      setCargando(false);
    }
  };

  cargarActividadesFirebase();
}, []); // Sin dependencia de usuario

  const obtenerDiasSemana = () => {
    const inicio = new Date(fechaActual);
    inicio.setDate(fechaActual.getDate() - fechaActual.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const dia = new Date(inicio);
      dia.setDate(inicio.getDate() + i);
      return dia;
    });
  };

  const calcularResumen = () => {
    const inicio = obtenerDiasSemana()[0];
    const fin = obtenerDiasSemana()[6];
    const actsSemana = actividades.filter(act => {
      const fecha = new Date(act.fecha);
      return fecha >= inicio && fecha <= fin;
    });
    return {
      total: actsSemana.length,
      completadas: actsSemana.filter(a => a.completada).length,
      pendientes: actsSemana.filter(a => !a.completada).length
    };
  };

  const actividadesHoy = () => {
    const hoy = new Date().toISOString().split('T')[0];
    return actividades.filter(act => act.fecha === hoy);
  };

  const actividadesUrgentes = () => {
    return actividades.filter(act => 
      act.categoria === 'urgente' && !act.completada
    ).slice(0, 3);
  };

  const proximosEventos = () => {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutosActual = ahora.getMinutes();
    const fechaHoyStr = ahora.toISOString().split('T')[0];

    return actividades
      .filter(act => {
        if (act.completada) return false;

        // Si la fecha es anterior a hoy, no la incluimos
        if (act.fecha < fechaHoyStr) return false;

        // Si es hoy, comparamos la hora
        if (act.fecha === fechaHoyStr) {
          const [horas, minutos] = act.horaInicio.split(':').map(Number);
          return horas > horaActual || 
                (horas === horaActual && minutos > minutosActual);
        }

        // Si es una fecha futura, la incluimos
        return true;
      })
      .sort((a, b) => {
        const fechaA = new Date(a.fecha);
        const fechaB = new Date(b.fecha);
        const [horasA, minutosA] = a.horaInicio.split(':').map(Number);
        const [horasB, minutosB] = b.horaInicio.split(':').map(Number);
        fechaA.setHours(horasA, minutosA, 0, 0);
        fechaB.setHours(horasB, minutosB, 0, 0);
        return fechaA - fechaB;
      })
      .slice(0, 5);
  };

  const navegarDia = (dir) => {
    const nueva = new Date(fechaActual);
    nueva.setDate(fechaActual.getDate() + dir);
    setFechaActual(nueva);
  };

  const navegarSemana = (dir) => {
    const nueva = new Date(fechaActual);
    nueva.setDate(fechaActual.getDate() + (dir * 7));
    setFechaActual(nueva);
  };

  const calcularPosicion = (horaInicio, horaFin) => {
    const [horaI, minI] = horaInicio.split(':').map(Number);
    const [horaF, minF] = horaFin.split(':').map(Number);
    const minutosInicio = (horaI * 60 + minI) - (6 * 60);
    const duracion = (horaF * 60 + minF) - (horaI * 60 + minI);
    return { top: (minutosInicio / 60) * 48, height: (duracion / 60) * 48 };
  };

  const actividadesPorFecha = (fecha) => {
  const fechaStr = fecha.toISOString().split('T')[0];
  return actividades.filter(act => act.fecha === fechaStr);
};

// Función para detectar si dos actividades se solapan
const seSuperponen = (act1, act2) => {
  const [h1i, m1i] = act1.horaInicio.split(':').map(Number);
  const [h1f, m1f] = act1.horaFin.split(':').map(Number);
  const [h2i, m2i] = act2.horaInicio.split(':').map(Number);
  const [h2f, m2f] = act2.horaFin.split(':').map(Number);
  
  const inicio1 = h1i * 60 + m1i;
  const fin1 = h1f * 60 + m1f;
  const inicio2 = h2i * 60 + m2i;
  const fin2 = h2f * 60 + m2f;
  
  return inicio1 < fin2 && inicio2 < fin1;
};

// Calcular columnas para actividades que se solapan
const calcularColumnas = (acts) => {
  const columnas = [];
  
  acts.forEach(act => {
    let columnaEncontrada = false;
    
    // Buscar una columna donde no haya conflicto
    for (let i = 0; i < columnas.length; i++) {
      const hayConflicto = columnas[i].some(a => seSuperponen(a, act));
      if (!hayConflicto) {
        columnas[i].push(act);
        columnaEncontrada = true;
        break;
      }
    }
    
    // Si no encontró columna, crear una nueva
    if (!columnaEncontrada) {
      columnas.push([act]);
    }
  });
  
  // Asignar índice de columna y total de columnas a cada actividad
  const resultado = {};
  columnas.forEach((col, colIndex) => {
    col.forEach(act => {
      resultado[act.id] = {
        columna: colIndex,
        totalColumnas: columnas.length
      };
    });
  });
  
  return resultado;
};

  const abrirModal = (actividad = null, fecha = null, hora = null) => {
  if (actividad) {
    setActividadEditando(actividad);
    setFormData(actividad);
  } else {
    setActividadEditando(null);
    const fechaStr = fecha ? fecha.toISOString().split('T')[0] : '';
    setFormData({
      usuario: '', // Campo vacío para que el usuario lo llene
      titulo: '',
      descripcion: '',
      fecha: fechaStr,
      horaInicio: hora || '08:00',
      horaFin: hora ? `${parseInt(hora.split(':')[0]) + 1}:00` : '09:00',
      categoria: 'trabajo',
      completada: false
    });
  }
  setMostrarModal(true);
};

  const toggleCompletada = async (id) => {
    const act = actividades.find(a => a.id === id);
    if (act) {
      const actualizada = { ...act, completada: !act.completada };
      await actualizarActividad(id, actualizada);
      setActividades(actividades.map(a => a.id === id ? actualizada : a));
    }
  };

  const guardarActividad = async () => {
  if (!formData.usuario || !formData.titulo || !formData.fecha) {
    alert('Por favor completa: Usuario, Título y Fecha');
    return;
  }
  try {
    if (actividadEditando) {
      await actualizarActividad(actividadEditando.id, formData);
      setActividades(actividades.map(act => 
        act.id === actividadEditando.id ? { ...formData, id: act.id } : act
      ));
    } else {
      const nueva = await crearActividad(formData, formData.usuario);
      setActividades([...actividades, nueva]);
    }
    setMostrarModal(false);
  } catch (error) {
    console.error('Error:', error);
    alert('Error al guardar. Intenta nuevamente.');
  }
};

  const eliminarActividadHandler = async (id) => {
    try {
      await eliminarActividad(id);
      setActividades(actividades.filter(act => act.id !== id));
      setMostrarModal(false);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar.');
    }
  };

  const diasSemana = obtenerDiasSemana();
  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const resumen = calcularResumen();
  const hoy = actividadesHoy();
  // eslint-disable-next-line no-unused-vars
  const urgentes = actividadesUrgentes();
  const proximos = proximosEventos();

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-gray-600 mx-auto mb-4" size={48} />
          <p className="text-gray-700 font-bold text-xl">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header con degradado */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-sky-600 to-blue-700 p-3 rounded-xl shadow-lg">
                <Calendar className="text-white" size={28} />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-700 to-blue-800 bg-clip-text text-transparent">
  Mi Calendario Personal
</h1>
<p className="text-sm text-gray-600">Gestiona todas las actividades 📅</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setVista('dia')}
                  className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                    vista === 'dia' ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-lg' : 'text-gray-600'
                  }`}
                >
                  Día
                </button>
                <button
                  onClick={() => setVista('semana')}
                  className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                    vista === 'semana' ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-lg' : 'text-gray-600'
                  }`}
                >
                  Semana
                </button>
              </div>
              
              <button
                onClick={() => abrirModal()}
                className="bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg text-sm font-medium"
              >
                <Plus size={18} />
                Nueva Nota
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Columna Principal - Calendario */}
          <div className="lg:col-span-2 space-y-4">
            {/* Navegación */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => vista === 'dia' ? navegarDia(-1) : navegarSemana(-1)}
                  className="p-2 hover:bg-purple-100 rounded-lg transition-all"
                >
                  <ChevronLeft size={20} className="text-sky-600" />
                </button>
                
                <h2 className="text-lg font-bold text-gray-800">
                  {vista === 'dia' 
                    ? `${nombresDias[fechaActual.getDay()]}, ${fechaActual.getDate()} ${nombresMeses[fechaActual.getMonth()]}`
                    : `${diasSemana[0].getDate()} - ${diasSemana[6].getDate()} ${nombresMeses[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`
                  }
                </h2>
                
                <button
                  onClick={() => vista === 'dia' ? navegarDia(1) : navegarSemana(1)}
                  className="p-2 hover:bg-purple-100 rounded-lg transition-all"
                >
                  <ChevronRight size={20} className="text-sky-600" />
                </button>
              </div>
            </div>

            {/* Calendario */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4">
              {vista === 'semana' ? (
                <div className="flex gap-1 overflow-x-auto">
                  <div className="w-12 flex-shrink-0">
                    <div className="h-10"></div>
                    {HORAS.map(h => (
                      <div key={h} className="h-12 flex items-start justify-end pr-1 text-xs text-gray-500 font-medium">
                        {h.toString().padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {diasSemana.map((dia, idx) => {
                    const esHoy = dia.toDateString() === new Date().toDateString();
                    return (
                      <div key={idx} className="flex-1 min-w-[100px] relative border-l border-gray-200">
                        <div className={`h-10 border-b border-gray-200 px-1 py-1 text-center ${
                          esHoy ? 'bg-gradient-to-r from-sky-100 to-blue-100' : ''
                        }`}>
                          <div className="text-xs text-gray-500">{nombresDias[dia.getDay()]}</div>
                          <div className={`text-sm font-bold ${esHoy ? 'text-sky-700' : 'text-gray-700'}`}>
                            {dia.getDate()}
                          </div>
                        </div>

                        <div className="relative">
                          {HORAS.map(h => (
                            <div 
                              key={h} 
                              className={`h-12 border-b border-gray-100 hover:bg-purple-50 cursor-pointer transition-colors ${
                                esHoy ? 'bg-purple-50/30' : ''
                              }`}
                              onClick={() => abrirModal(null, dia, `${h.toString().padStart(2, '0')}:00`)}
                            />
                          ))}

                          <div className="absolute top-0 left-0 right-0">
                            {(() => {
                              const actividades = actividadesPorFecha(dia);
                              const distribucion = calcularColumnas(actividades);
                              return actividades.map(act => {
                                const { top, height } = calcularPosicion(act.horaInicio, act.horaFin);
                                const cat = CATEGORIAS.find(c => c.id === act.categoria) || CATEGORIAS[0];
                                const { columna, totalColumnas } = distribucion[act.id] || { columna: 0, totalColumnas: 1 };
                                const width = `calc((100% - ${(totalColumnas + 1) * 4}px) / ${totalColumnas})`;
                                const left = `calc(${(100 / totalColumnas) * columna}% + ${4 * (columna + 1)}px)`;
                                
                                return (
                                  <div
                                    key={act.id}
                                    className={`absolute rounded-lg p-2 text-white shadow-lg cursor-pointer hover:scale-105 transition-all overflow-hidden backdrop-blur-sm ${
                                      act.completada 
                                        ? 'bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-300 text-green-700' 
                                        : `bg-gradient-to-r ${cat.gradient} border border-white/20`
                                    }`}
                                    style={{ 
                                      top: `${top}px`, 
                                      height: `${height}px`, 
                                      minHeight: '35px',
                                      left,
                                      width
                                    }}
                                    onClick={() => abrirModal(act)}
                                  >
                                    <div className="flex flex-col items-center justify-center h-full max-h-full overflow-y-auto p-0.5">
                                      <div className={`font-semibold text-xs leading-tight text-center w-full ${act.completada ? 'text-green-700' : 'text-white'}`}>{act.titulo}</div>
                                      <div className={`text-xs font-medium text-center w-full ${act.completada ? 'text-green-600' : 'text-white/90'}`}>{act.horaInicio.substring(0, 5)}</div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="w-14 flex-shrink-0">
                    <div className="h-8"></div>
                    {HORAS.map(h => (
                      <div key={h} className="h-12 flex items-start justify-end pr-1 text-xs text-gray-500 font-medium">
                        {h.toString().padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 relative border-l border-gray-200">
                    <div className="h-8 border-b border-gray-200 px-2 py-1">
                      <div className="text-sm font-semibold text-gray-700">
                        {nombresDias[fechaActual.getDay()]} {fechaActual.getDate()}
                      </div>
                    </div>

                    <div className="relative">
                      {HORAS.map(h => (
                        <div 
                          key={h} 
                          className="h-12 border-b border-gray-100 hover:bg-purple-50 cursor-pointer transition-colors"
                          onClick={() => abrirModal(null, fechaActual, `${h.toString().padStart(2, '0')}:00`)}
                        />
                      ))}

                      <div className="absolute top-0 left-0 right-0">
                        {actividadesPorFecha(fechaActual).map(act => {
                          const { top, height } = calcularPosicion(act.horaInicio, act.horaFin);
                          const cat = obtenerCategoria(act.categoria);
                          return (
                            <div
                              key={act.id}
                              className={`absolute left-1 right-1 rounded-lg p-2 shadow-lg cursor-pointer hover:scale-105 transition-all overflow-hidden ${
                                act.completada 
                                  ? 'bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-300 text-green-700' 
                                  : `bg-gradient-to-r ${cat.gradient} text-white`
                              }`}
                              style={{ top: `${top}px`, height: `${height}px`, minHeight: '40px' }}
                              onClick={() => abrirModal(act)}
                            >
                              <div className="flex flex-col items-center justify-center h-full max-h-full overflow-y-auto p-0.5">
                                <div className={`font-semibold text-xs text-center w-full ${act.completada ? 'text-green-700' : 'text-white'}`}>{act.titulo}</div>
                                <div className={`text-xs font-medium text-center w-full ${act.completada ? 'text-green-600' : 'text-white/90'}`}>
                                  {act.horaInicio.substring(0, 5)} - {act.horaFin.substring(0, 5)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Columna Lateral - Widgets */}
          <div className="space-y-4">
            {/* Resumen Semanal */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <CalendarDays size={18} className="text-sky-600" />
                Resumen Semanal
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gradient-to-br from-sky-100 to-sky-200 rounded-lg p-3 text-center border-2 border-sky-300">
                  <div className="text-2xl font-bold text-blue-700">{resumen.total}</div>
                  <div className="text-xs text-blue-600 font-medium">Total</div>
                </div>
                <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-3 text-center border-2 border-green-300">
                  <div className="text-2xl font-bold text-green-700">{resumen.completadas}</div>
                  <div className="text-xs text-green-600 font-medium">Hechas</div>
                </div>
                <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg p-3 text-center border-2 border-orange-300">
                  <div className="text-2xl font-bold text-orange-700">{resumen.pendientes}</div>
                  <div className="text-xs text-orange-600 font-medium">Pendientes</div>
                </div>
              </div>
              <div className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-500"
                  style={{ width: `${resumen.total ? (resumen.completadas / resumen.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-center text-xs text-gray-600 mt-2">
                {resumen.total ? Math.round((resumen.completadas / resumen.total) * 100) : 0}% Completado
              </p>
            </div>


            {/* Agenda de Hoy */}
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl shadow-lg p-4 border-2 border-sky-300">
              <h3 className="text-sm font-bold text-sky-700 mb-3 flex items-center gap-2">
                <Clock size={18} className="text-sky-600" />
                Agenda de Hoy
              </h3>
              <div className="space-y-2">
                {hoy.length > 0 ? hoy.map(act => {
                  const cat = CATEGORIAS.find(c => c.id === act.categoria);
                  return (
                    <div key={act.id} className={`bg-gradient-to-r from-slate-50 to-white rounded-lg p-2 border ${cat.color} shadow-md hover:shadow-lg transition-all`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate text-center">{act.titulo}</p>
                          <p className="text-xs text-gray-600 text-center">{act.horaInicio} - {act.horaFin}</p>
                        </div>
                        <button
                          onClick={() => toggleCompletada(act.id)}
                          className={`transition-colors flex-shrink-0 ${
                            act.completada ? 'text-green-500' : 'text-gray-400 hover:text-green-500'
                          }`}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto text-sky-300 mb-2" size={32} />
                    <p className="text-sm text-sky-600 italic">No hay eventos para hoy</p>
                  </div>
                )}
              </div>
            </div>

            {/* Próximos Eventos */}
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl shadow-lg p-4 border-2 border-blue-300">
              <h3 className="text-sm font-bold text-sky-700 mb-3 flex items-center gap-2">
                <StickyNote size={18} className="text-sky-600" />
                Próximos Eventos
              </h3>
              <div className="space-y-2">
                {proximos.length > 0 ? proximos.map(act => {
                  // eslint-disable-next-line no-unused-vars
                  const cat = CATEGORIAS.find(c => c.id === act.categoria);
                  return (
                    <div key={act.id} className={`bg-gradient-to-r from-sky-50 to-white rounded-lg p-2 border ${cat.color} shadow-md hover:shadow-lg transition-all`}>
                      <p className="text-sm font-semibold text-sky-900 truncate text-center">{act.titulo}</p>
                      <p className="text-xs text-sky-700/70 text-center">
                        {(() => {
                          const fecha = new Date(act.fecha + 'T00:00:00');
                          return fecha.toLocaleDateString('es-ES', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          });
                        })()} • {act.horaInicio}
                      </p>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-sky-600 text-center py-4 italic">Sin eventos próximos</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        {mostrarModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-sky-700 to-blue-800 bg-clip-text text-transparent flex items-center gap-2">
                <StickyNote size={24} className="text-purple-600" />
                {actividadEditando ? 'Editar Nota' : 'Nueva Nota'}
              </h3>
              
              <div className="space-y-3">
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">Usuario*</label>
    <input
      type="text"
      value={formData.usuario}
      onChange={(e) => setFormData({...formData, usuario: e.target.value})}
      className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
      placeholder="Tu nombre (ej: Miguel)"
    />
  </div>
  
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1">Título*</label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="¿Qué tienes que hacer?"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    rows="2"
                    placeholder="Detalles adicionales..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fecha*</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                    className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Inicio*</label>
                    <input
                      type="time"
                      value={formData.horaInicio}
                      onChange={(e) => setFormData({...formData, horaInicio: e.target.value})}
                      className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Fin*</label>
                    <input
                      type="time"
                      value={formData.horaFin}
                      onChange={(e) => setFormData({...formData, horaFin: e.target.value})}
                      className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Categoría</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIAS.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData({...formData, categoria: cat.id})}
                        className={`bg-gradient-to-r ${cat.gradient} ${
                          formData.categoria === cat.id ? 'ring-4 ring-offset-1 ring-purple-300 scale-105' : 'opacity-60'
                        } text-white px-2 py-2 rounded-lg transition-all text-xs font-bold shadow-md`}
                      >
                        {cat.nombre}
                      </button>
                    ))}
                  </div>
                </div>

                {actividadEditando && (
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                    <input
                      type="checkbox"
                      id="completada"
                      checked={formData.completada || false}
                      onChange={(e) => setFormData({...formData, completada: e.target.checked})}
                      className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    <label htmlFor="completada" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Marcar como completada
                    </label>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-5">
                {actividadEditando && (
                  <button
                    onClick={() => eliminarActividadHandler(actividadEditando.id)}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-lg"
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                )}
                
                <button
                  onClick={() => setMostrarModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2.5 rounded-lg transition-all text-sm font-bold"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={guardarActividad}
                  className="flex-1 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white px-3 py-2.5 rounded-lg transition-all text-sm font-bold shadow-lg"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, Trash2, LogOut, Loader, CheckCircle2, AlertCircle, StickyNote, CalendarDays } from 'lucide-react';
import { obtenerActividades, crearActividad, actualizarActividad, eliminarActividad } from '../services/activityService';

const CATEGORIAS = [
  { id: 'trabajo', nombre: 'Trabajo', color: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600' },
  { id: 'personal', nombre: 'Personal', color: 'bg-green-500', gradient: 'from-green-500 to-green-600' },
  { id: 'salud', nombre: 'Salud', color: 'bg-red-500', gradient: 'from-red-500 to-red-600' },
  { id: 'estudio', nombre: 'Estudio', color: 'bg-purple-500', gradient: 'from-purple-500 to-purple-600' },
  { id: 'reuniones', nombre: 'Reuniones', color: 'bg-orange-500', gradient: 'from-orange-500 to-orange-600' },
  { id: 'urgente', nombre: 'Urgente', color: 'bg-pink-500', gradient: 'from-pink-500 to-pink-600' }
];

const HORAS = Array.from({ length: 17 }, (_, i) => i + 6);

export default function CalendarioHorario({ usuario, onLogout }) {
  const [vista, setVista] = useState('semana');
  const [fechaActual, setFechaActual] = useState(new Date());
  const [actividades, setActividades] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [actividadEditando, setActividadEditando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [formData, setFormData] = useState({
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
        const acts = await obtenerActividades(usuario);
        setActividades(acts);
      } catch (error) {
        console.error('Error al cargar actividades:', error);
        setActividades([]);
      } finally {
        setCargando(false);
      }
    };

    cargarActividadesFirebase();
  }, [usuario]);

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
    const hoy = new Date();
    return actividades
      .filter(act => new Date(act.fecha) >= hoy && !act.completada)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(0, 3);
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
    return { top: (minutosInicio / 60) * 50, height: (duracion / 60) * 50 };
  };

  const actividadesPorFecha = (fecha) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    return actividades.filter(act => act.fecha === fechaStr);
  };

  const abrirModal = (actividad = null, fecha = null, hora = null) => {
    if (actividad) {
      setActividadEditando(actividad);
      setFormData(actividad);
    } else {
      setActividadEditando(null);
      const fechaStr = fecha ? fecha.toISOString().split('T')[0] : '';
      setFormData({
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
    if (!formData.titulo || !formData.fecha) return;
    try {
      if (actividadEditando) {
        await actualizarActividad(actividadEditando.id, formData);
        setActividades(actividades.map(act => 
          act.id === actividadEditando.id ? { ...formData, id: act.id, usuario } : act
        ));
      } else {
        const nueva = await crearActividad(formData, usuario);
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
  const urgentes = actividadesUrgentes();
  const proximos = proximosEventos();

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-white mx-auto mb-4" size={48} />
          <p className="text-white font-bold text-xl">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header con degradado */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl shadow-lg">
                <Calendar className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Mi Calendario Personal
                </h1>
                <p className="text-sm text-gray-600">Hola, {usuario} 👋</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setVista('dia')}
                  className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                    vista === 'dia' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-gray-600'
                  }`}
                >
                  Día
                </button>
                <button
                  onClick={() => setVista('semana')}
                  className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                    vista === 'semana' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-gray-600'
                  }`}
                >
                  Semana
                </button>
              </div>
              
              <button
                onClick={() => abrirModal()}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg text-sm font-medium"
              >
                <Plus size={18} />
                Nueva Nota
              </button>

              <button
                onClick={onLogout}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-xl transition-all"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
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
                  <ChevronLeft size={20} className="text-purple-600" />
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
                  <ChevronRight size={20} className="text-purple-600" />
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
                          esHoy ? 'bg-gradient-to-r from-purple-100 to-pink-100' : ''
                        }`}>
                          <div className="text-xs text-gray-500">{nombresDias[dia.getDay()]}</div>
                          <div className={`text-sm font-bold ${esHoy ? 'text-purple-600' : 'text-gray-700'}`}>
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
                            {actividadesPorFecha(dia).map(act => {
                              const { top, height } = calcularPosicion(act.horaInicio, act.horaFin);
                              const cat = CATEGORIAS.find(c => c.id === act.categoria) || CATEGORIAS[0];
                              return (
                                <div
                                  key={act.id}
                                  className={`absolute left-0.5 right-0.5 bg-gradient-to-r ${cat.gradient} rounded p-1 text-white shadow-md cursor-pointer hover:scale-105 transition-all overflow-hidden ${
                                    act.completada ? 'opacity-60' : ''
                                  }`}
                                  style={{ top: `${top}px`, height: `${height}px`, minHeight: '35px' }}
                                  onClick={() => abrirModal(act)}
                                >
                                  <div className="font-semibold text-xs leading-tight truncate">{act.titulo}</div>
                                  <div className="text-xs opacity-90">{act.horaInicio.substring(0, 5)}</div>
                                </div>
                              );
                            })}
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
                          const cat = CATEGORIAS.find(c => c.id === act.categoria);
                          return (
                            <div
                              key={act.id}
                              className={`absolute left-1 right-1 bg-gradient-to-r ${cat.gradient} rounded-lg p-2 text-white shadow-lg cursor-pointer hover:scale-105 transition-all overflow-hidden ${
                                act.completada ? 'opacity-60' : ''
                              }`}
                              style={{ top: `${top}px`, height: `${height}px`, minHeight: '40px' }}
                              onClick={() => abrirModal(act)}
                            >
                              <div className="font-semibold text-xs">{act.titulo}</div>
                              <div className="text-xs opacity-90">
                                {act.horaInicio.substring(0, 5)} - {act.horaFin.substring(0, 5)}
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
                <CalendarDays size={18} className="text-purple-600" />
                Resumen Semanal
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-3 text-center border-2 border-blue-300">
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
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${resumen.total ? (resumen.completadas / resumen.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-center text-xs text-gray-600 mt-2">
                {resumen.total ? Math.round((resumen.completadas / resumen.total) * 100) : 0}% Completado
              </p>
            </div>

            {/* Tareas Urgentes */}
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl shadow-lg p-4 border-2 border-red-200">
              <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                <AlertCircle size={18} />
                Tareas Urgentes
              </h3>
              <div className="space-y-2">
                {urgentes.length > 0 ? urgentes.map(act => (
                  <div key={act.id} className="bg-white rounded-lg p-2 border-l-4 border-red-500 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{act.titulo}</p>
                        <p className="text-xs text-gray-600">{new Date(act.fecha).toLocaleDateString('es-ES')}</p>
                      </div>
                      <button
                        onClick={() => toggleCompletada(act.id)}
                        className="text-gray-400 hover:text-green-500 transition-colors flex-shrink-0"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 text-center py-4">Sin tareas urgentes 🎉</p>
                )}
              </div>
            </div>

            {/* Agenda de Hoy */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-lg p-4 border-2 border-purple-200">
              <h3 className="text-sm font-bold text-purple-700 mb-3 flex items-center gap-2">
                <Clock size={18} />
                Agenda de Hoy
              </h3>
              <div className="space-y-2">
                {hoy.length > 0 ? hoy.map(act => {
                  const cat = CATEGORIAS.find(c => c.id === act.categoria);
                  return (
                    <div key={act.id} className={`bg-white rounded-lg p-2 border-l-4 ${cat.color} shadow-sm`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{act.titulo}</p>
                          <p className="text-xs text-gray-600">{act.horaInicio} - {act.horaFin}</p>
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
                    <Calendar className="mx-auto text-purple-300 mb-2" size={32} />
                    <p className="text-sm text-purple-600 italic">No hay eventos para hoy</p>
                  </div>
                )}
              </div>
            </div>

            {/* Próximos Eventos */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl shadow-lg p-4 border-2 border-yellow-200">
              <h3 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                <StickyNote size={18} />
                Próximos Eventos
              </h3>
              <div className="space-y-2">
                {proximos.length > 0 ? proximos.map(act => {
                  const cat = CATEGORIAS.find(c => c.id === act.categoria);
                  return (
                    <div key={act.id} className={`bg-white rounded-lg p-2 border-l-4 ${cat.color} shadow-sm`}>
                      <p className="text-sm font-semibold text-gray-800 truncate">{act.titulo}</p>
                      <p className="text-xs text-gray-600">{new Date(act.fecha).toLocaleDateString('es-ES')} • {act.horaInicio}</p>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-gray-500 text-center py-4">Sin eventos próximos</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        {mostrarModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                <StickyNote size={24} className="text-purple-600" />
                {actividadEditando ? 'Editar Nota' : 'Nueva Nota'}
              </h3>
              
              <div className="space-y-3">
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
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-3 py-2.5 rounded-lg transition-all text-sm font-bold shadow-lg"
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
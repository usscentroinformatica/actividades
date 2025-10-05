import { useState, useEffect } from 'react';
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, Trash2, LogOut, Loader } from 'lucide-react';
import { obtenerActividades, crearActividad, actualizarActividad, eliminarActividad } from '../services/activityService';

const CATEGORIAS = [
  { id: 'trabajo', nombre: 'Trabajo', color: 'bg-blue-500' },
  { id: 'personal', nombre: 'Personal', color: 'bg-green-500' },
  { id: 'salud', nombre: 'Salud', color: 'bg-red-500' },
  { id: 'estudio', nombre: 'Estudio', color: 'bg-purple-500' },
  { id: 'reuniones', nombre: 'Reuniones', color: 'bg-orange-500' },
  { id: 'otro', nombre: 'Otro', color: 'bg-gray-500' }
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
    categoria: 'trabajo'
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

  const navegarDia = (direccion) => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setDate(fechaActual.getDate() + direccion);
    setFechaActual(nuevaFecha);
  };

  const navegarSemana = (direccion) => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setDate(fechaActual.getDate() + (direccion * 7));
    setFechaActual(nuevaFecha);
  };

  const calcularPosicion = (horaInicio, horaFin) => {
    const [horaI, minI] = horaInicio.split(':').map(Number);
    const [horaF, minF] = horaFin.split(':').map(Number);
    
    const minutosInicio = (horaI * 60 + minI) - (6 * 60);
    const duracion = (horaF * 60 + minF) - (horaI * 60 + minI);
    
    const top = (minutosInicio / 60) * 50;
    const height = (duracion / 60) * 50;
    
    return { top, height };
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
        categoria: 'trabajo'
      });
    }
    setMostrarModal(true);
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
        const nuevaAct = await crearActividad(formData, usuario);
        setActividades([...actividades, nuevaAct]);
      }
      setMostrarModal(false);
    } catch (error) {
      console.error('Error al guardar actividad:', error);
      alert('Error al guardar la actividad. Intenta nuevamente.');
    }
  };

  const eliminarActividadHandler = async (id) => {
    try {
      await eliminarActividad(id);
      setActividades(actividades.filter(act => act.id !== id));
      setMostrarModal(false);
    } catch (error) {
      console.error('Error al eliminar actividad:', error);
      alert('Error al eliminar la actividad. Intenta nuevamente.');
    }
  };

  const diasSemana = obtenerDiasSemana();
  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-blue-500 mx-auto mb-4" size={40} />
          <p className="text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3">
      <div className="max-w-7xl mx-auto">
        {/* Header Compacto */}
        <div className="bg-white rounded-xl shadow-md p-3 mb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                <Calendar className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Hola, {usuario} 👋</h1>
                <p className="text-xs text-gray-500">Tu horario</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setVista('dia')}
                  className={`px-3 py-1.5 rounded-md transition-all text-sm font-medium ${
                    vista === 'dia' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                  }`}
                >
                  Día
                </button>
                <button
                  onClick={() => setVista('semana')}
                  className={`px-3 py-1.5 rounded-md transition-all text-sm font-medium ${
                    vista === 'semana' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                  }`}
                >
                  Semana
                </button>
              </div>
              
              <button
                onClick={() => abrirModal()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all text-sm"
              >
                <Plus size={16} />
                Nueva
              </button>

              <button
                onClick={onLogout}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-1.5 rounded-lg transition-all"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Navegación Compacta */}
        <div className="bg-white rounded-xl shadow-md p-3 mb-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => vista === 'dia' ? navegarDia(-1) : navegarSemana(-1)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            
            <h2 className="text-lg font-bold text-gray-800">
              {vista === 'dia' 
                ? `${nombresDias[fechaActual.getDay()]}, ${fechaActual.getDate()} ${nombresMeses[fechaActual.getMonth()].substring(0, 3)}`
                : `${diasSemana[0].getDate()} - ${diasSemana[6].getDate()} ${nombresMeses[fechaActual.getMonth()]}`
              }
            </h2>
            
            <button
              onClick={() => vista === 'dia' ? navegarDia(1) : navegarSemana(1)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Vista por Día */}
        {vista === 'dia' && (
          <div className="bg-white rounded-xl shadow-md p-3">
            <div className="flex gap-2">
              <div className="w-14 flex-shrink-0">
                <div className="h-8"></div>
                {HORAS.map(hora => (
                  <div key={hora} className="h-12 flex items-start justify-end pr-1 text-xs text-gray-500 font-medium">
                    {hora.toString().padStart(2, '0')}:00
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
                  {HORAS.map((hora) => (
                    <div 
                      key={hora} 
                      className="h-12 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => abrirModal(null, fechaActual, `${hora.toString().padStart(2, '0')}:00`)}
                    />
                  ))}

                  <div className="absolute top-0 left-0 right-0">
                    {actividadesPorFecha(fechaActual).map(act => {
                      const { top, height } = calcularPosicion(act.horaInicio, act.horaFin);
                      const cat = CATEGORIAS.find(c => c.id === act.categoria);
                      
                      return (
                        <div
                          key={act.id}
                          className={`absolute left-1 right-1 ${cat.color} bg-opacity-90 rounded-md p-2 text-white shadow-md cursor-pointer hover:scale-[1.02] transition-all overflow-hidden`}
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
          </div>
        )}

        {/* Vista Semanal */}
        {vista === 'semana' && (
          <div className="bg-white rounded-xl shadow-md p-3 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              <div className="w-12 flex-shrink-0">
                <div className="h-10"></div>
                {HORAS.map(hora => (
                  <div key={hora} className="h-12 flex items-start justify-end pr-1 text-xs text-gray-500 font-medium">
                    {hora.toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {diasSemana.map((dia, diaIdx) => {
                const esHoy = dia.toDateString() === new Date().toDateString();
                
                return (
                  <div key={diaIdx} className="flex-1 min-w-[100px] relative border-l border-gray-200">
                    <div className={`h-10 border-b border-gray-200 px-1 py-1 text-center ${
                      esHoy ? 'bg-blue-50' : ''
                    }`}>
                      <div className="text-xs text-gray-500">{nombresDias[dia.getDay()]}</div>
                      <div className={`text-sm font-bold ${
                        esHoy ? 'text-blue-600' : 'text-gray-700'
                      }`}>
                        {dia.getDate()}
                      </div>
                    </div>

                    <div className="relative">
                      {HORAS.map((hora) => (
                        <div 
                          key={hora} 
                          className={`h-12 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${
                            esHoy ? 'bg-blue-50 bg-opacity-30' : ''
                          }`}
                          onClick={() => abrirModal(null, dia, `${hora.toString().padStart(2, '0')}:00`)}
                        />
                      ))}

                      <div className="absolute top-0 left-0 right-0">
                        {actividadesPorFecha(dia).map(act => {
                          const { top, height } = calcularPosicion(act.horaInicio, act.horaFin);
                          const cat = CATEGORIAS.find(c => c.id === act.categoria);
                          
                          return (
                            <div
                              key={act.id}
                              className={`absolute left-0.5 right-0.5 ${cat.color} bg-opacity-90 rounded p-1 text-white shadow cursor-pointer hover:scale-[1.02] transition-all overflow-hidden`}
                              style={{ top: `${top}px`, height: `${height}px`, minHeight: '35px' }}
                              onClick={() => abrirModal(act)}
                            >
                              <div className="font-semibold text-xs leading-tight truncate">{act.titulo}</div>
                              <div className="text-xs opacity-90">
                                {act.horaInicio.substring(0, 5)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal */}
        {mostrarModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Clock className="text-blue-500" size={24} />
                {actividadEditando ? 'Editar Actividad' : 'Nueva Actividad'}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Título*</label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Ej: Reunión con el equipo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    rows="2"
                    placeholder="Detalles..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha*</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Hora Inicio*</label>
                    <input
                      type="time"
                      value={formData.horaInicio}
                      onChange={(e) => setFormData({...formData, horaInicio: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Hora Fin*</label>
                    <input
                      type="time"
                      value={formData.horaFin}
                      onChange={(e) => setFormData({...formData, horaFin: e.target.value})}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIAS.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData({...formData, categoria: cat.id})}
                        className={`${cat.color} ${
                          formData.categoria === cat.id ? 'ring-2 ring-offset-1 ring-gray-400' : 'opacity-60'
                        } text-white px-2 py-1.5 rounded-lg transition-all text-xs font-medium`}
                      >
                        {cat.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                {actividadEditando && (
                  <button
                    onClick={() => eliminarActividadHandler(actividadEditando.id)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1 text-sm font-medium"
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                )}
                
                <button
                  onClick={() => setMostrarModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg transition-all text-sm font-medium"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={guardarActividad}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-all text-sm font-medium"
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
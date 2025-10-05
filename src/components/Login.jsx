import { useState } from 'react';
import { Calendar, User, ArrowRight } from 'lucide-react';

export default function Login({ onLogin }) {
  const [nombre, setNombre] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nombre.trim()) {
      onLogin(nombre.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <Calendar className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Bienvenido a tu Calendario
          </h1>
          <p className="text-gray-500">
            Organiza tu tiempo de manera efectiva
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ¿Cómo te llamas?
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingresa tu nombre (ej: Miguel)"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-800"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!nombre.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Comenzar
            <ArrowRight size={20} />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Tus actividades se guardarán en Firebase 🔥
        </div>
      </div>
    </div>
  );
}
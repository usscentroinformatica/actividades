import { useState, useEffect } from 'react';
import Login from './components/Login';
import CalendarioHorario from './components/CalendarioHorario';
import { guardarUsuario, obtenerUsuario, cerrarSesion } from './services/activityService';

function App() {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const usuarioGuardado = obtenerUsuario();
    if (usuarioGuardado) {
      setUsuario(usuarioGuardado.nombre);
    }
  }, []);

  const handleLogin = (nombre) => {
    guardarUsuario(nombre);
    setUsuario(nombre);
  };

  const handleLogout = () => {
    cerrarSesion();
    setUsuario(null);
  };

  if (!usuario) {
    return <Login onLogin={handleLogin} />;
  }

  return <CalendarioHorario usuario={usuario} onLogout={handleLogout} />;
}

export default App;
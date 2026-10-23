import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ModeloProvider, useEstado } from './lib/modelo';
import { Calidad } from './pages/Calidad';
import { Cargas } from './pages/Cargas';
import { CuentaDetalle } from './pages/CuentaDetalle';
import { Cuentas } from './pages/Cuentas';
import { Metodologia } from './pages/Metodologia';
import { Personas } from './pages/Personas';
import { RolDetalle, Roles } from './pages/Roles';
import { Tablero } from './pages/Tablero';

function Rutas() {
  const { cargando } = useEstado();
  if (cargando) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cargando…</p>
      </div>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Tablero />} />
        <Route path="/cuentas" element={<Cuentas />} />
        <Route path="/cuentas/:bname" element={<CuentaDetalle />} />
        <Route path="/personas" element={<Personas />} />
        <Route path="/roles" element={<Roles />} />
        <Route path="/roles/:agr" element={<RolDetalle />} />
        <Route path="/calidad" element={<Calidad />} />
        <Route path="/cargas" element={<Cargas />} />
        <Route path="/metodologia" element={<Metodologia />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ModeloProvider>
      <HashRouter>
        <Rutas />
      </HashRouter>
    </ModeloProvider>
  );
}

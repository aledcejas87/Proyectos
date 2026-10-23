import { useState } from 'react';
import { Card, Encabezado, Texto2 } from '../components/ui';
import { borrarTodo, setAjuste } from '../db/db';
import { BITS_UFLAG, TIPOS_USUARIO } from '../lib/sap';
import { useEstado } from '../lib/modelo';
import { PARAMETROS_DEFAULT, type Parametros } from '../db/types';

const NIVELES = [
  ['1. Asignación', 'Usuario con roles/perfiles vigentes', 'Que existe una relación de asignación en las fuentes consultadas', 'Disponible (USR02 + AGR_USERS)'],
  ['2. Autorización configurada', 'Objetos, campos, valores y privilegios de los roles', 'Qué autorizaciones están configuradas', 'Pendiente (AGR_1251, AGR_1252)'],
  ['3. Capacidad efectiva', 'Posibilidad real de ejecutar una operación', 'Requiere autorizaciones aplicables, controles adicionales y vías alternativas', 'Pendiente'],
  ['4. Uso observado', 'Actividad registrada en un período', 'Depende de logs disponibles, cobertura y retención', 'Pendiente de investigar con IT/Seguridad'],
];

function Parametro({ etiqueta, valor, onChange, ayuda }: { etiqueta: string; valor: number; onChange: (n: number) => void; ayuda: string }) {
  return (
    <label className="text-sm">
      <span className="block font-medium">{etiqueta}</span>
      <input type="number" min={1} className="campo mt-1 w-28" value={valor} onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))} />
      <span className="mt-1 block text-xs" style={{ color: 'var(--muted)' }}>{ayuda}</span>
    </label>
  );
}

export function Metodologia() {
  const { modelo } = useEstado();
  const actuales = modelo?.parametros ?? PARAMETROS_DEFAULT;
  const [p, setP] = useState<Parametros>(actuales);
  const cambiar = (k: keyof Parametros) => (n: number) => {
    const nuevo = { ...p, [k]: n };
    setP(nuevo);
    setAjuste('parametros', nuevo);
  };

  return (
    <div className="space-y-4">
      <Encabezado titulo="Cómo leer los datos" subtitulo="Modelo actual ≠ modelo correcto. Modelo actual = línea base de control y contraste." />

      <Card titulo="Cuatro niveles que no se deben confundir">
        <div className="overflow-x-auto">
          <table className="tabla">
            <thead><tr><th>Nivel</th><th>Significado</th><th>Qué podemos afirmar</th><th>Estado en la app</th></tr></thead>
            <tbody>{NIVELES.map((n) => <tr key={n[0]}>{n.map((c, i) => <td key={i} className={i === 0 ? 'font-medium whitespace-nowrap' : ''}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <Texto2 className="mt-3">
          Una transacción en el menú de un rol no demuestra que el usuario pueda completarla, y que no aparezca no descarta
          otras vías. Muchos roles no equivale a conflicto confirmado, y ningún uso observado no equivale a permiso innecesario.
        </Texto2>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card titulo="Tipos de usuario (USTYP)">
          <table className="tabla">
            <tbody>
              {Object.entries(TIPOS_USUARIO).map(([k, v]) => (
                <tr key={k}><td className="mono">{k}</td><td>{v.etiqueta}</td><td style={{ color: 'var(--text-secondary)' }}>{v.humano ? 'Persona (diálogo)' : 'No diálogo: fuera de la población principal'}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card titulo="Indicador de bloqueo (UFLAG)">
          <Texto2 className="mb-2">Es un valor por bits: 0 = sin bloqueo; un valor puede combinar varios motivos (p. ej. 192 = 64 + 128).</Texto2>
          <table className="tabla">
            <tbody>
              {BITS_UFLAG.map((b) => <tr key={b.bit}><td className="mono num">{b.bit}</td><td>{b.etiqueta}</td></tr>)}
            </tbody>
          </table>
        </Card>
      </div>

      <Card titulo="Reglas de interpretación aplicadas (a validar con IT/Seguridad)">
        <ul className="list-disc space-y-1 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>Cuenta utilizable</strong>: UFLAG = 0 y la fecha de extracción está dentro de GLTGV–GLTGB (vacío o 31/12/9999 = sin límite).</li>
          <li><strong>Asignación vigente</strong>: la fecha de extracción está entre FROM_DAT y TO_DAT.</li>
          <li><strong>Último acceso</strong>: TRDAT/LTIME tal como los registra SAP. Vacío = sin registro (no necesariamente "nunca usó").</li>
          <li><strong>COL_FLAG / ORG_FLAG</strong>: se muestran tal cual. Su interpretación exacta (rol recibido vía compuesto, asignación indirecta) queda pendiente de validar.</li>
          <li><strong>Conciliación</strong>: coincidencia exacta entre BNAME y el usuario SAP de RR. HH., sin distinguir mayúsculas.</li>
        </ul>
      </Card>

      <Card titulo="Parámetros de las señales">
        <div className="grid gap-4 sm:grid-cols-3">
          <Parametro etiqueta="Días sin acceso" valor={p.diasSinAcceso} onChange={cambiar('diasSinAcceso')} ayuda="Umbral para 'sin acceso reciente'." />
          <Parametro etiqueta="Días para 'por vencer'" valor={p.diasPorVencer} onChange={cambiar('diasPorVencer')} ayuda="Ventana para asignaciones próximas a vencer." />
          <Parametro etiqueta="Roles vigentes 'altos'" valor={p.umbralRolesAltos} onChange={cambiar('umbralRolesAltos')} ayuda="Desde cuántos roles se marca la señal." />
        </div>
      </Card>

      <Card titulo="Datos y privacidad">
        <Texto2>
          La aplicación funciona sin servidor: los archivos se leen en el navegador y los datos se guardan en el almacenamiento
          local de este navegador (IndexedDB), en este equipo. No se envían a ningún lado. Quien tenga acceso a este usuario de
          Windows y navegador puede ver los datos, así que usala en un equipo corporativo con acceso controlado.
        </Texto2>
        <button
          className="boton boton-peligro mt-3"
          onClick={async () => {
            if (confirm('¿Borrar TODOS los snapshots y datos importados de este navegador? No se puede deshacer.')) {
              await borrarTodo();
              location.reload();
            }
          }}
        >
          Borrar todos los datos locales
        </button>
      </Card>
    </div>
  );
}

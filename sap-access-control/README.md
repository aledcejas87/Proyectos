# SAP Access Control | Scienza

> **Versión en uso: [`apps-script/`](apps-script/)** (un solo archivo HTML, publicable con Google Apps Script).
> Lo que sigue describe la versión React inicial, que queda como referencia.

Aplicación web de consulta y análisis para obtener una radiografía de los accesos **actuales** en SAP S/4HANA
productivo de Scienza Uruguay y Chile (etapa 1 del documento base: [`docs/Documento_Base.md`](docs/Documento_Base.md)).

> Modelo actual ≠ modelo correcto. Modelo actual = línea base de control y contraste.

## Cómo funciona

- **Sin servidor.** Los archivos exportados de SAP y RR. HH. se leen en el navegador y se guardan en el
  almacenamiento local (IndexedDB) de ese navegador. Nada se envía a ningún lado.
- **Snapshots fechados.** Cada extracción es una fotografía con fecha, sistema, mandante y notas. Todas las vigencias
  se evalúan contra la fecha de extracción, no contra "hoy". Cada carga registra archivo, SHA-256, filas leídas,
  aceptadas, rechazadas y duplicadas, advertencias y responsable.
- **Credenciales nunca se importan.** Columnas como `BCODE`, `PASSCODE` o `PWDSALTEDHASH` se descartan al leer.
- **Nivel 1: asignación.** Lo que muestra son relaciones registradas en las fuentes. No afirma capacidad efectiva,
  uso real ni conflictos SoD.

## Fuentes soportadas (primera iteración)

| Fuente | Campos | Formato |
|---|---|---|
| `USR02` | BNAME, USTYP, UFLAG, GLTGV, GLTGB, TRDAT, LTIME, CLASS | .xlsx, .csv, .txt (incluido "texto sin convertir" de SE16N) |
| `AGR_USERS` | UNAME, AGR_NAME, FROM_DAT, TO_DAT, COL_FLAG, ORG_FLAG | ídem |
| RR. HH. | legajo, nombre, usuario SAP, vigencia, área, cargo, responsable, país, países de operación, sociedad | ídem |

Los encabezados se reconocen por nombre técnico o por la etiqueta de SE16N (español, inglés, alemán) y el mapeo se
confirma siempre en pantalla antes de importar.

## Pantallas

- **Tablero**: indicadores, estado de cuentas, población por país y señales para revisar.
- **Cuentas SAP**: lista maestra (población objetivo / para revisar / técnicas / todas) con filtros y exportación CSV.
- **Ficha de cuenta**: datos de USR02, persona de RR. HH., roles con vigencias, señales y qué falta validar.
- **Personas**: vista por persona física y sus cuentas.
- **Roles** y **ficha de rol**: consulta inversa rol → cuentas.
- **Calidad y conciliación**: lo que no concilia, en vez de ocultarlo.
- **Cargas y snapshots**: importación, historial y datos de ejemplo ficticios.
- **Cómo leer los datos**: interpretaciones, reglas y parámetros.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm test         # pruebas unitarias
npm run build    # genera dist/ (estático, se puede abrir desde cualquier carpeta servida)
```

Stack: Vite + React + TypeScript + Tailwind + Dexie (IndexedDB), PapaParse y read-excel-file.

## Próximos pasos previstos

AGR_DEFINE / AGR_AGRS (roles compuestos), AGR_TCODES + TSTCT (transacciones), AGR_1251 / AGR_1252
(autorizaciones), fuentes Fiori, comparación entre snapshots, registro de hallazgos y excepciones.

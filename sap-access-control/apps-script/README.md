# SAP Access Control | Scienza — versión HTML / Apps Script

Un único archivo `Index.html` que se puede usar de dos maneras:

1. **Directo en el navegador**: doble clic en `Index.html` (necesita acceso a `cdnjs.cloudflare.com` para las
   librerías que leen CSV y Excel).
2. **Como aplicación web de Apps Script**: crear un proyecto en script.google.com, pegar `Codigo.gs` y crear un
   archivo HTML llamado `Index` con el contenido de `Index.html`. Implementar → Nueva implementación → Aplicación web.

Los archivos de SAP se procesan en memoria en el navegador y no se guardan en Google ni en ningún servidor.
Solo se recuerdan en el navegador las reglas y decisiones del universo (exportables a CSV/JSON).

## Flujo

1. **Cargar archivos**: `USR02` y `AGR_USERS` completos (sin filtrar por país). Opcionales: `AGR_1252`
   (niveles organizativos: sociedad, centro, org. de ventas) y una lista de referencia de usuarios UY/CL.
   Se revisa el mapeo de columnas antes de aceptar; las columnas de credenciales se descartan.
2. **Definir universo**: la app sugiere qué cuentas son de Uruguay/Chile cruzando pistas:
   - partes de los nombres de roles (p. ej. `ZUY`, `CL`, `ARG`) y patrones "contiene";
   - grupo de usuarios (`CLASS`);
   - sociedades/centros de `AGR_1252` asignadas a cada país;
   - lista de referencia.
   Sugerencia: solo pistas UY/CL → incluir; solo otros países → excluir; mixtas o sin pistas → revisar.
   Cuentas técnicas (B, C, L, S) → excluir (configurable). Se puede decidir cuenta por cuenta o en bloque;
   la decisión manual siempre gana. El universo se exporta a CSV y se vuelve a importar en la próxima extracción.
3. **Análisis**: indicadores, señales, cuentas y roles (consulta inversa) solo del universo, con exportación CSV.

## Tablas soportadas

Las tablas grandes se reducen al cargarlas: de AGR_1251 y AGR_TCODES se conservan solo los roles asignados a
usuarios (y se descartan las autorizaciones borradas), y de TSTCT solo las transacciones usadas. Por eso conviene
cargar todo junto con "Cargar varios archivos a la vez": la app procesa primero las tablas que filtran a las demás.
Con las 18 tablas de PRD la carga tarda alrededor de un minuto.

| Grupo | Tabla | Uso |
|---|---|---|
| Necesarias | `USR02`, `AGR_USERS` | Cuentas y asignaciones de roles |
| Pistas de país | `AGR_1252` | Sociedad / centro / org. de ventas de cada rol |
| | `USR05` | Parámetros organizativos del usuario (`BUK`, `VKO`, `WRK`, `CAC`…) |
| | Lista de referencia | Usuarios UY/CL de RR. HH. o lista propia |
| Estructura de roles | `AGR_DEFINE` | Catálogo de roles, descripción breve, rol padre (derivados), creación/modificación |
| | `AGR_AGRS` | Roles simples de cada rol compuesto (muestra "vía compuesto" en la ficha) |
| | `AGR_FLAGS` | Atributos `COLL_AGR` (compuesto) y `OBSOLETE` (obsoleto) |
| | `AGR_PROF` | Perfil generado por cada rol: separa con certeza perfiles de roles y perfiles manuales |
| | `AGR_TEXTS` | Descripciones que falten en AGR_DEFINE (prefiere español, luego inglés) |
| Transacciones y autorizaciones | `AGR_TCODES` | Transacciones del menú de cada rol |
| | `TSTCT` | Descripción de las transacciones (se prefiere español) |
| | `AGR_1251` | Objetos, campos y valores de autorización; admite varias partes (`_1`, `_2`, `_3`) que se suman |
| Fiori | `AGR_BUFFI` | Catálogos, grupos y servicios del menú de cada rol |
| | `AGR_HIER` | Títulos de los catálogos del menú (admite varias partes) |
| | `/UI2/PB_C_CHIP` | Contenido de los catálogos estándar: apps, objeto semántico y transacción / app UI5 destino |
| | `/UI2/PB_C_CHIPM` | Catálogos propios (Z): referencias a tiles estándar de PB_C_CHIP; se carga junto con PB_C_CHIP y se suma |
| Evidencia de uso (opcional) | `CDHDR`, `BKPF`, `MATDOC`/`MKPF`, `RBKP`, `EKKO`, `EBAN`, `VBAK`, `VBRK`, `LIKP`, `QAVE`, `LTAK`, `BALHDR`, `RSAU_BUF_DATA` | Quién creó o modificó documentos, con qué transacción y cuándo. Filtrar por fecha; el nombre del archivo debe contener el nombre de la tabla |
| | `USOBHASH` | Nombres de los servicios autorizados por `S_SERVICE` |
| Complementos | `UST04` | Perfiles asignados directamente (`SAP_ALL`, `SAP_NEW`, manuales) |
| | `USREFUS` | Usuarios de referencia (heredan permisos sin figurar en roles) y alias |
| | `USR21` + `ADRP` | Nombre de cada usuario |

`ADRC` no se usa: en Scienza todos los usuarios comparten la misma dirección de empresa, así que no indica país.

Las exportaciones de SE16N de PRD llegan con encabezados en español ("Usuarios", "Número de persona",
"ID parámetro Set/Get", "Perfil"…) en una hoja llamada `Data`; se reconocen automáticamente. Con la carga
múltiple, cada archivo se identifica por el nombre de la tabla en el nombre del archivo.

## Parametrización de países

La pestaña **Parametrización** (paso 2) define, una sola vez, a qué país corresponde cada dato de SAP que
puede indicar país: sociedades, organizaciones de ventas y compras, sociedad CO, centros, oficinas de
ventas (AGR_1252), parámetros de usuario (USR05), partes de nombres de roles y grupos de usuarios.

- **Solo las definiciones confirmadas** se usan para clasificar usuarios en "Definir universo".
- Cada dato muestra una **propuesta** con su origen, para confirmar más rápido. Los orígenes son las
  respuestas del responsable del 23/10/2026, un prefijo (`UY`, `CL`, `AR`, `SC` → AR, `CR` → fuera de
  alcance) o un supuesto (resto de los centros → AR). La propuesta nunca se aplica sola.
- Se confirma de a uno (revisión guiada o tabla) o en bloque, sobre los datos seleccionados.
  Cada definición guarda fecha y responsable.
- Si una carga trae un código nuevo, aparece como "sin confirmar".
- Se guarda en el navegador y se exporta/importa como JSON. Para que sea la base fija en cualquier
  computadora o en Apps Script, el JSON exportado se pega en la constante `PARAMETRIZACION_BASE`
  de `Index.html`.
- La opción "Modo provisorio" permite ver el universo usando también las propuestas sin confirmar.

Las tablas se cargan completas, tal como salen de SE16N: la app toma las columnas que necesita e ignora
el resto, incluidas las de contraseñas, que nunca se leen ni se guardan.

## Riesgos y SoD

La pestaña **Riesgos y SoD** (paso 5) evalúa reglas sobre las cuentas del universo:

- **Capacidades:** operaciones definidas por transacciones (alcanza una autorizada por S_TCODE) y condiciones
  sobre objetos de autorización (todas). Sintaxis de condición, una autorización por línea:
  `OBJETO CAMPO=v1,v2 CAMPO2=+` (`+` = cualquier valor no vacío; alternativas con `||`).
- **Reglas:** críticas (una capacidad) o SoD (dos capacidades), con severidad y estado propuesta/confirmada.
- **Hallazgos:** usuario × regla con la evidencia (roles que dan cada parte), estado (identificado, bajo
  análisis, corregido, mitigado, aceptado), nota, fecha y responsable. Exportables a CSV.
- La **propuesta de la consultoría por módulo** (BC, FI, CO, MM, SD, WM, PP, QM) se importa desde su archivo JSON
  con el botón "Importar" de la pestaña; incluye fundamento y confianza de cada definición, observaciones y
  preguntas para Scienza. **No se publica en este repositorio** porque describe hallazgos de seguridad.
  Sin ese archivo, la app usa una propuesta genérica de respaldo (14 capacidades, 13 reglas).
- Revisión guiada (primero capacidades, después reglas), filtro por área y excepciones formales
  (motivo, control mitigante, aprobador, vencimiento, evidencia) para hallazgos aceptados o mitigados.
  Todo es editable y se exporta/importa en JSON (`RIESGOS_BASE` para fijarlo como base).
- Es nivel 2 (autorización configurada): indica una capacidad probable, no una verificación en el sistema.
- **Uso observado** (si se cargan tablas de evidencia de uso): cada capacidad de un hallazgo se marca como usada
  si el usuario dejó documentos con una de sus transacciones (o en una tabla o clase de CDHDR asociada, por
  ejemplo EKKO → pedidos de compra). Un SoD con uso de ambas capacidades se marca como **conflicto ejercido**.
  No reemplaza a ST03N/STAD ni a SM20: muestra lo que dejó un documento; la falta de evidencia no prueba
  falta de uso (consultas, reportes y lo que no genera documentos no queda registrado).

## Historial, informe y respaldo

La pestaña **Historial e informe** (paso 6):

- **Fotos del historial:** guarda una foto compacta de cada extracción (universo, roles vigentes y hallazgos) y
  compara dos fotos, o una foto con la extracción cargada. Muestra cuentas que entran o salen del universo,
  roles agregados o quitados, bloqueos, y hallazgos nuevos o resueltos. Las diferencias se exportan a CSV.
- **Informe completo (Excel):** resumen, universo, todas las cuentas, asignaciones, roles, hallazgos, resultados
  por regla, reglas, capacidades, preguntas y parametrización. Contiene datos sensibles.
- **Respaldo completo (JSON):** parametrización, decisiones del universo, reglas, hallazgos, excepciones,
  preguntas e historial en un solo archivo, que se restaura en otra computadora o navegador. No incluye los
  archivos de SAP.

## Seguridad

El repositorio es **público**. Nunca subir extracciones reales, universos exportados ni configuraciones con
usuarios reales. El `.gitignore` de la raíz bloquea `.xlsx`, `.csv` y `.txt` por las dudas.

## Base de datos en Google Sheets (versión Apps Script)

Publicada en Apps Script, la aplicación guarda sus definiciones en una hoja de cálculo privada que
`Codigo.gs` crea la primera vez en el Drive de quien la implementa (el id queda en las propiedades del
script, `SPREADSHEET_ID`).

- Se guardan: parametrización de países, decisiones del universo, reglas y capacidades, estados de
  hallazgos y excepciones, historial de extracciones y logo. Cada cambio se guarda solo a los pocos
  segundos; el estado se ve en el encabezado (enlace a la hoja).
- **Las tablas de SAP no se guardan**: se procesan en el navegador y se cargan en cada sesión.
- La pestaña `_datos` es la base (JSON en bloques de 40.000 caracteres; no editar). `Universo`,
  `Parametrización`, `Reglas`, `Capacidades`, `Hallazgos tratados` e `Historial` son copias legibles que
  se regeneran en cada guardado.
- La primera vez, lo que estaba guardado en el navegador se sube a la hoja automáticamente.
- Si no se puede leer la hoja, la app muestra la última copia del navegador y no escribe en Sheets
  (para no pisar información más nueva) hasta que se reintente.
- Implementación: ejecutar como **Yo** y acceso **Solo yo** (`appsscript.json`), porque la hoja contiene
  datos de usuarios y hallazgos de seguridad.
- Apps Script interpreta `/*` como comienzo de comentario aun dentro del HTML: no usar esa secuencia
  fuera de comentarios reales (por ejemplo `accept="image/*"`).

## País de los datos organizativos y acceso a otros países

- Tablas opcionales recomendadas (grupo "Datos maestros"): `T001` (país de cada sociedad), `T001W` (país de cada
  centro), `TVKO` (org. de ventas → sociedad), `T024E` (org. de compras → sociedad), `TKA02` (sociedad CO →
  sociedades) y `TVKBZ` (oficina de ventas → org. de ventas). Con ellas la propuesta de país de cada valor sale
  del dato maestro de SAP ("Dato maestro de SAP") y tiene prioridad sobre prefijos y supuestos.
- **Acceso a datos de otros países** (Análisis, ficha de cuenta, Inicio, informe Excel y CSV): cruza el país de
  cada cuenta del universo con el país de las sociedades, centros y organizaciones de sus roles vigentes
  (AGR_1252). Los valores `*` se informan como "Todos". Usa la definición confirmada y, si no hay, el dato maestro.
- **Excepciones por rol**: en la ficha de un rol (o desde "Revisar roles uno por uno" en una parte del nombre) se
  puede fijar el país de un rol puntual; manda sobre el nombre y los niveles organizativos.


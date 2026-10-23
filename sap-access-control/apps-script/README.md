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
| | `AGR_TEXTS` (opcional) | Descripciones que falten en AGR_DEFINE |
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

## Seguridad

El repositorio es **público**. Nunca subir extracciones reales, universos exportados ni configuraciones con
usuarios reales. El `.gitignore` de la raíz bloquea `.xlsx`, `.csv` y `.txt` por las dudas.

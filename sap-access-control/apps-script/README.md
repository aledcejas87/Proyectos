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
| Complementos | `UST04` | Perfiles asignados directamente (`SAP_ALL`, `SAP_NEW`, manuales) |
| | `USR21` + `ADRP` | Nombre de cada usuario |

`ADRC` no se usa: en Scienza todos los usuarios comparten la misma dirección de empresa, así que no indica país.

Las exportaciones de SE16N de PRD llegan con encabezados en español ("Usuarios", "Número de persona",
"ID parámetro Set/Get", "Perfil"…) en una hoja llamada `Data`; se reconocen automáticamente. Con la carga
múltiple, cada archivo se identifica por el nombre de la tabla en el nombre del archivo.

## Configuración de Scienza (países)

Confirmada el 23/10/2026 y aplicada en cada carga (`CONFIG_SCIENZA` en `Index.html`):

| Códigos | País |
|---|---|
| Sociedades / org. de ventas, compras, CO con prefijo `UY…` | Uruguay |
| Prefijo `CL…` | Chile |
| Prefijo `SC…` (SC00, SC10–SC14, SC20) y `AR…` | Argentina |
| Prefijo `CR…` (CR00, CR02, CR10) | Otro país, fuera del alcance |
| `IN01`, `CA01`, `IE01`, `US01`, `GB01`, `0001`, `0000`, `SP01`, `SP02` | Estándar SAP sin uso (se ignoran) |
| Centros `AEUY`, `FL01`, `FT01`, `WTC1` | Uruguay |
| Centros `ACOP`, `CLUC`, `PI01`–`PI05`, `SC01` | Chile |
| Resto de los centros; oficinas de ventas `GPRE`, `GVEN`, `LICE`, `MAYO` | Argentina |

Si en una carga aparece un código organizativo nuevo sin país, la pantalla "Definir universo" lo pregunta
de a uno ("Pregunta pendiente"). Las respuestas y cualquier cambio manual quedan guardados en el navegador.

Las tablas se cargan completas, tal como salen de SE16N: la app toma las columnas que necesita e ignora
el resto, incluidas las de contraseñas, que nunca se leen ni se guardan.

## Seguridad

El repositorio es **público**. Nunca subir extracciones reales, universos exportados ni configuraciones con
usuarios reales. El `.gitignore` de la raíz bloquea `.xlsx`, `.csv` y `.txt` por las dudas.

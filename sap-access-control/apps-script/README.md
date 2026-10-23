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

## Seguridad

El repositorio es **público**. Nunca subir extracciones reales, universos exportados ni configuraciones con
usuarios reales. El `.gitignore` de la raíz bloquea `.xlsx`, `.csv` y `.txt` por las dudas.

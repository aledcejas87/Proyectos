/**
 * SAP Access Control | Scienza — publicación como aplicación web de Apps Script.
 *
 * Por ahora el servidor solo entrega la página: los archivos de SAP se
 * procesan en el navegador de quien la usa y no se guardan en Google.
 * Más adelante se pueden agregar funciones para guardar snapshots y
 * decisiones del universo en una hoja de cálculo con acceso restringido.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SAP Access Control | Scienza')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

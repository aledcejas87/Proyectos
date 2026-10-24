/**
 * SAP Access Control | Scienza — aplicación web de Apps Script.
 *
 * Los archivos de SAP se procesan en el navegador y NO se guardan en Google.
 * Lo que se guarda en una hoja de cálculo privada (en el Drive de quien
 * implementa la aplicación) es lo que se define en la aplicación:
 * parametrización de países, decisiones del universo, reglas de riesgo,
 * estados de hallazgos, excepciones, historial de extracciones y logo.
 *
 * - La hoja "_datos" es la base: una fila por bloque de cada clave (JSON).
 *   No se edita a mano.
 * - Las demás hojas (Universo, Parametrización, Reglas, Hallazgos, Historial)
 *   son una copia legible que se regenera en cada guardado.
 */

const PROP_ID = 'SPREADSHEET_ID';
const HOJA_DATOS = '_datos';
const TAM_BLOQUE = 40000; // una celda admite hasta 50.000 caracteres
const PREFIJO = 'J';      // evita que Sheets interprete un bloque que empieza con "=" como fórmula
const CLAVES = {
  conf: 'sapac.scienza.universo.v1',
  param: 'sapac.scienza.parametrizacion.v1',
  riesgos: 'sapac.scienza.riesgos.v1',
  historial: 'sapac.scienza.historial.v1',
  logo: 'sapac.scienza.logo.v1',
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SAP Access Control | Scienza')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Abre la base; la primera vez la crea y guarda su id en las propiedades del script. */
function base_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(PROP_ID);
  let ss;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) {
      throw new Error('No se pudo abrir la hoja de la base de datos (id ' + id + '). Si la borraste o la moviste, restaurala desde la papelera de Drive o borrá la propiedad ' + PROP_ID + ' del proyecto para crear una nueva.');
    }
  } else {
    ss = SpreadsheetApp.create('SAP Access Control Scienza - base de datos');
    props.setProperty(PROP_ID, ss.getId());
  }
  let sh = ss.getSheetByName(HOJA_DATOS);
  if (!sh) {
    sh = ss.insertSheet(HOJA_DATOS, 0);
    sh.getRange(1, 1, 1, 5).setValues([['clave', 'parte', 'contenido', 'actualizado', 'usuario']]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('C:C').setNumberFormat('@');
    const inicial = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
    if (inicial && ss.getSheets().length > 1) ss.deleteSheet(inicial);
  }
  return { ss: ss, sh: sh };
}

function leerFilas_(sh) {
  const n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, 5).getValues() : [];
}

/** Devuelve todo lo guardado: { datos: {clave: json}, actualizado: {clave: fecha}, url, nombre }. */
function cargarTodo() {
  const b = base_();
  const partes = {}, actualizado = {};
  leerFilas_(b.sh).forEach(function (f) {
    const clave = String(f[0]);
    if (!clave) return;
    (partes[clave] = partes[clave] || []).push([Number(f[1]), String(f[2]).slice(PREFIJO.length)]);
    actualizado[clave] = f[3] instanceof Date ? f[3].toISOString() : String(f[3]);
  });
  const datos = {};
  Object.keys(partes).forEach(function (k) {
    datos[k] = partes[k].sort(function (a, b) { return a[0] - b[0]; }).map(function (p) { return p[1]; }).join('');
  });
  return { datos: datos, actualizado: actualizado, url: b.ss.getUrl(), nombre: b.ss.getName() };
}

/** Reemplaza el valor de una clave (JSON en texto) y actualiza su copia legible. */
function guardarClave(clave, json) {
  if (Object.keys(CLAVES).map(function (k) { return CLAVES[k]; }).indexOf(clave) < 0) throw new Error('Clave no permitida: ' + clave);
  JSON.parse(json); // valida antes de escribir
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const b = base_();
    const ahora = new Date(), usuario = Session.getActiveUser().getEmail() || '';
    const resto = leerFilas_(b.sh).filter(function (f) { return String(f[0]) !== clave; });
    const nuevas = [];
    for (let i = 0, p = 0; i < json.length || p === 0; i += TAM_BLOQUE, p++) nuevas.push([clave, p, PREFIJO + json.slice(i, i + TAM_BLOQUE), ahora, usuario]);
    const filas = resto.concat(nuevas);
    const total = b.sh.getLastRow() - 1;
    // Primero se escribe y después se limpian las filas sobrantes: si algo falla, no se pierde lo anterior.
    b.sh.getRange(2, 3, filas.length, 1).setNumberFormat('@');
    b.sh.getRange(2, 1, filas.length, 5).setValues(filas);
    if (total > filas.length) b.sh.getRange(2 + filas.length, 1, total - filas.length, 5).clearContent();
    try { espejo_(b.ss, clave, JSON.parse(json)); } catch (e) { console.warn('Copia legible no actualizada: ' + e); }
    return { ok: true, actualizado: ahora.toISOString() };
  } finally {
    lock.releaseLock();
  }
}

// ----------------------------------------------------------- copia legible
function texto_(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s; // nunca como fórmula
}
function escribirHoja_(ss, nombre, encabezado, filas) {
  let sh = ss.getSheetByName(nombre);
  if (!sh) sh = ss.insertSheet(nombre);
  sh.clearContents();
  const datos = [encabezado].concat(filas).map(function (f) { return f.map(texto_); });
  sh.getRange(1, 1, datos.length, encabezado.length).setNumberFormat('@').setValues(datos);
  sh.getRange(1, 1, 1, encabezado.length).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.getRange(1, encabezado.length + 2).setValue('Copia de solo lectura: se regenera desde la aplicación. Los cambios hechos acá se pierden.');
}
function espejo_(ss, clave, v) {
  if (clave === CLAVES.conf) {
    const d = v.decisiones || {};
    escribirHoja_(ss, 'Universo', ['Usuario', 'Decisión', 'País', 'Fecha'],
      Object.keys(d).sort().map(function (u) { return [u, d[u].d || '', d[u].pais || '', d[u].fecha || '']; }));
  } else if (clave === CLAVES.param) {
    const d = v.definiciones || {};
    escribirHoja_(ss, 'Parametrización', ['Tipo', 'Campo', 'Valor', 'País', 'Confirmado el', 'Por'],
      Object.keys(d).sort().map(function (k) { const x = d[k]; return [x.tipo, x.campo, x.valor, x.pais, x.fecha, x.por]; }));
  } else if (clave === CLAVES.riesgos) {
    escribirHoja_(ss, 'Reglas', ['Id', 'Área', 'Nombre', 'Tipo', 'Capacidad A', 'Capacidad B', 'Severidad', 'Estado', 'Descripción'],
      (v.reglas || []).map(function (r) { return [r.id, r.area, r.nombre, r.tipo, r.a, r.b, r.severidad, r.estado || 'propuesta', r.desc]; }));
    escribirHoja_(ss, 'Capacidades', ['Id', 'Área', 'Nombre', 'Transacciones', 'Condiciones', 'Estado'],
      (v.capacidades || []).map(function (c) { return [c.id, c.area, c.nombre, (c.tx || []).join(', '), (c.obj || []).join(' ; '), c.estado || 'propuesta']; }));
    const h = v.hallazgos || {};
    escribirHoja_(ss, 'Hallazgos tratados', ['Regla', 'Usuario', 'Estado', 'Nota', 'Fecha', 'Por', 'Motivo excepción', 'Control mitigante', 'Aprobador', 'Aprobada el', 'Vence', 'Evidencia'],
      Object.keys(h).sort().map(function (k) {
        const x = h[k], e = x.excepcion || {}, p = k.split('|');
        return [p[0], p[1], x.estado, x.nota, x.fecha, x.por, e.motivo, e.control, e.aprobador, e.aprobado, e.vencimiento, e.evidencia];
      }));
  } else if (clave === CLAVES.historial) {
    escribirHoja_(ss, 'Historial', ['Id', 'Fecha de extracción', 'Guardada', 'Por', 'Cuentas USR02', 'Universo', 'UY', 'CL', 'Hallazgos', 'Severidad alta'],
      (v || []).map(function (f) { const r = f.resumen || {}; return [f.id, f.fechaExtraccion, f.guardado, f.por, r.cuentasUSR02, r.universo, r.uy, r.cl, r.hallazgos, r.alta]; }));
  }
}

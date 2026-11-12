/**
 * Bitácora diaria por audio
 * -------------------------
 * Un bot de Telegram recibe audios (o texto) con el relato del día, los transcribe,
 * Claude los ordena en temas y todo queda en esta planilla de Google Sheets:
 *
 *   Registros   -> cada audio/texto recibido, con transcripción, resumen y sensaciones
 *   Temas       -> el tablero de temas (uno por fila) con estado, minutos acumulados e historial
 *   Actividades -> cada mención de un tema en un registro (base para medir horas)
 *   Tablero     -> horas por tipo de trabajo y categoría (semana / mes / total)
 *
 * Configuración: ver README.md. Las claves van en Propiedades del script, nunca en el código.
 */

// ───────────────────────────── Configuración ─────────────────────────────

const HOJAS = {
  REGISTROS: 'Registros',
  TEMAS: 'Temas',
  ACTIVIDADES: 'Actividades',
  TABLERO: 'Tablero',
};

const COLS = {
  REGISTROS: ['ID', 'Fecha', 'Hora', 'Momento', 'Origen', 'Duración (s)', 'Transcripción', 'Resumen',
    'Sensaciones', 'Temas tocados', 'Estado procesamiento'],
  TEMAS: ['ID', 'Título', 'Categoría', 'Tipo de trabajo', 'Solicitante', 'Área', 'Estado', 'Prioridad',
    'Creado', 'Última actualización', 'Minutos acumulados', 'Próximo paso', 'Descripción', 'Historial'],
  ACTIVIDADES: ['Fecha', 'Hora', 'Registro ID', 'Tema ID', 'Título', 'Acción', 'Categoría', 'Tipo de trabajo',
    'Solicitante', 'Área', 'Minutos', 'Minutos estimados por IA', 'Detalle'],
};

const CATEGORIAS = ['Soporte / mesa de ayuda', 'Proyecto IT', 'Estrategia y planificación', 'Seguimiento',
  'Reunión', 'Incidente', 'Proveedores y compras', 'Seguridad', 'Administrativo', 'Otro'];
const TIPOS_TRABAJO = ['Operativo', 'Táctico', 'Estratégico'];
const ESTADOS = ['Abierto', 'En curso', 'Bloqueado', 'Resuelto'];
const ACCIONES = ['nuevo', 'avance', 'resuelto', 'bloqueado', 'mencion'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];

function prop_(clave, porDefecto) {
  const v = PropertiesService.getScriptProperties().getProperty(clave);
  return v === null || v === '' ? porDefecto : v;
}

function propObligatoria_(clave) {
  const v = prop_(clave, null);
  if (!v) throw new Error('Falta la propiedad del script "' + clave + '". Ver README.md.');
  return v;
}

function zona_() {
  return Session.getScriptTimeZone();
}

function libro_() {
  const id = prop_('SPREADSHEET_ID', null);
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function hoja_(nombre) {
  const h = libro_().getSheetByName(nombre);
  if (!h) throw new Error('No existe la hoja "' + nombre + '". Ejecutá configurar().');
  return h;
}

// ───────────────────────────── Instalación ─────────────────────────────

/**
 * Ejecutar UNA vez desde el editor (Ejecutar > configurar). Crea las hojas, el tablero,
 * los activadores (revisión de mensajes cada minuto y recordatorios) y desactiva el webhook.
 */
function configurar() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  if (!libro) throw new Error('Abrí el editor desde la planilla (Extensiones > Apps Script).');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', libro.getId());
  libro.setSpreadsheetTimeZone(zona_());

  crearHoja_(libro, HOJAS.REGISTROS, COLS.REGISTROS, [90, 95, 60, 90, 70, 80, 420, 320, 220, 160, 140]);
  crearHoja_(libro, HOJAS.TEMAS, COLS.TEMAS, [70, 260, 170, 100, 130, 110, 90, 80, 95, 110, 90, 260, 320, 420]);
  crearHoja_(libro, HOJAS.ACTIVIDADES, COLS.ACTIVIDADES, [95, 60, 90, 70, 240, 80, 170, 100, 130, 110, 70, 90, 380]);
  validaciones_(libro);
  crearTablero_(libro);
  const sobrante = libro.getSheetByName('Hoja 1') || libro.getSheetByName('Sheet1');
  if (sobrante && libro.getSheets().length > 1 && sobrante.getLastRow() === 0) libro.deleteSheet(sobrante);

  // Telegram: usamos getUpdates (consulta periódica), así que no debe haber webhook activo.
  tg_('deleteWebhook', { drop_pending_updates: false });

  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('revisarMensajes').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('recordatorioMediodia').timeBased().everyDays(1)
    .atHour(Number(prop_('RECORDATORIO_MEDIODIA_HORA', 13))).nearMinute(0).create();
  ScriptApp.newTrigger('recordatorioCierre').timeBased().everyDays(1)
    .atHour(Number(prop_('RECORDATORIO_CIERRE_HORA', 18))).nearMinute(30).create();
  ScriptApp.newTrigger('resumenSemanalAutomatico').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .atHour(17).create();

  const bot = tg_('getMe', {}).result;
  console.log('Listo. Abrí Telegram, buscá @' + bot.username + ' y mandale /start.');
}

function crearHoja_(libro, nombre, columnas, anchos) {
  let h = libro.getSheetByName(nombre);
  if (!h) h = libro.insertSheet(nombre);
  if (h.getLastRow() === 0) {
    h.getRange(1, 1, 1, columnas.length).setValues([columnas])
      .setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
    h.setFrozenRows(1);
    anchos.forEach(function (w, i) { h.setColumnWidth(i + 1, w); });
    h.getRange(2, 1, h.getMaxRows() - 1, columnas.length).setVerticalAlignment('top').setWrap(true);
  }
  return h;
}

function validaciones_(libro) {
  const temas = libro.getSheetByName(HOJAS.TEMAS);
  const regla = function (lista) {
    return SpreadsheetApp.newDataValidation().requireValueInList(lista, true).setAllowInvalid(true).build();
  };
  temas.getRange('C2:C').setDataValidation(regla(CATEGORIAS));
  temas.getRange('D2:D').setDataValidation(regla(TIPOS_TRABAJO));
  temas.getRange('G2:G').setDataValidation(regla(ESTADOS));
  temas.getRange('H2:H').setDataValidation(regla(PRIORIDADES));
  temas.getRange('I2:J').setNumberFormat('yyyy-mm-dd');
  libro.getSheetByName(HOJAS.REGISTROS).getRange('B2:B').setNumberFormat('yyyy-mm-dd');
  libro.getSheetByName(HOJAS.REGISTROS).getRange('C2:C').setNumberFormat('@'); // hora como texto
  libro.getSheetByName(HOJAS.ACTIVIDADES).getRange('A2:A').setNumberFormat('yyyy-mm-dd');
  libro.getSheetByName(HOJAS.ACTIVIDADES).getRange('B2:B').setNumberFormat('@');

  const rango = temas.getRange('A2:N');
  const color = function (texto, fondo) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$G2="' + texto + '"').setBackground(fondo).setRanges([rango]).build();
  };
  temas.setConditionalFormatRules([
    color('Resuelto', '#e6f4ea'), color('Bloqueado', '#fce8e6'), color('En curso', '#fef7e0'),
  ]);
}

/** Tablero con fórmulas (sintaxis en inglés y comas: es lo que espera setFormula en cualquier configuración regional). */
function crearTablero_(libro) {
  let t = libro.getSheetByName(HOJAS.TABLERO);
  if (t) libro.deleteSheet(t);
  t = libro.insertSheet(HOJAS.TABLERO, 0);
  const A = HOJAS.ACTIVIDADES;
  const inicioSemana = '(TODAY()-WEEKDAY(TODAY(),2)+1)';
  const inicioMes = 'DATE(YEAR(TODAY()),MONTH(TODAY()),1)';
  const horas = function (colFiltro, celda, desde) {
    const rangoFecha = desde ? ",'" + A + "'!A:A,\">=\"&" + desde : '';
    return "=SUMIFS('" + A + "'!K:K,'" + A + "'!" + colFiltro + ':' + colFiltro + ',' + celda + rangoFecha + ')/60';
  };

  t.getRange('A1').setValue('Bitácora diaria — en qué se van las horas').setFontSize(14).setFontWeight('bold');
  t.getRange('A2').setFormula('="Actualizado: "&TEXT(NOW(),"yyyy-mm-dd hh:mm")').setFontColor('#666666');

  // Bloque 1: tipo de trabajo
  t.getRange('A4:E4').setValues([['Tipo de trabajo', 'Horas semana', 'Horas mes', 'Horas total', '% del total']]);
  TIPOS_TRABAJO.forEach(function (tipo, i) {
    const f = 5 + i;
    t.getRange(f, 1).setValue(tipo);
    t.getRange(f, 2).setFormula(horas('H', 'A' + f, inicioSemana));
    t.getRange(f, 3).setFormula(horas('H', 'A' + f, inicioMes));
    t.getRange(f, 4).setFormula(horas('H', 'A' + f, null));
    t.getRange(f, 5).setFormula('=IFERROR(D' + f + '/SUM($D$5:$D$7),0)');
  });
  t.getRange('A8').setValue('Total');
  ['B', 'C', 'D'].forEach(function (c) { t.getRange(c + '8').setFormula('=SUM(' + c + '5:' + c + '7)'); });

  // Bloque 2: categoría
  t.getRange('A11:D11').setValues([['Categoría', 'Horas semana', 'Horas mes', 'Horas total']]);
  CATEGORIAS.forEach(function (cat, i) {
    const f = 12 + i;
    t.getRange(f, 1).setValue(cat);
    t.getRange(f, 2).setFormula(horas('G', 'A' + f, inicioSemana));
    t.getRange(f, 3).setFormula(horas('G', 'A' + f, inicioMes));
    t.getRange(f, 4).setFormula(horas('G', 'A' + f, null));
  });

  // Bloque 3: estado de los temas
  const T = HOJAS.TEMAS;
  t.getRange('G4:H4').setValues([['Temas', 'Cantidad']]);
  ESTADOS.forEach(function (estado, i) {
    t.getRange(5 + i, 7).setValue(estado);
    t.getRange(5 + i, 8).setFormula("=COUNTIF('" + T + "'!G:G,G" + (5 + i) + ')');
  });
  t.getRange('G10').setValue('Resueltos esta semana');
  t.getRange('H10').setFormula("=COUNTIFS('" + A + "'!F:F,\"resuelto\",'" + A + "'!A:A,\">=\"&" + inicioSemana + ')');

  // Bloque 4: quién pide más (operativo, mes en curso)
  t.getRange('G12').setValue('Quién genera más trabajo operativo (mes)');
  t.getRange('G13').setFormula(
    "=IFERROR(QUERY('" + A + "'!A2:K,\"select I, sum(K) where H = 'Operativo' and I <> '' and A >= date '\"&TEXT(" +
    inicioMes + ",\"yyyy-mm-dd\")&\"' group by I order by sum(K) desc limit 10 label I 'Solicitante', sum(K) 'Minutos'\",0),\"Sin datos\")");

  [t.getRange('A4:E4'), t.getRange('A11:D11'), t.getRange('G4:H4')].forEach(function (r) {
    r.setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  });
  t.getRange('A8:E8').setFontWeight('bold');
  t.getRange('B5:D8').setNumberFormat('0.0');
  t.getRange('B12:D21').setNumberFormat('0.0');
  t.getRange('E5:E7').setNumberFormat('0%');
  t.setColumnWidth(1, 210); t.setColumnWidth(7, 230);

  t.insertChart(t.newChart().asPieChart()
    .addRange(t.getRange('A5:A7')).addRange(t.getRange('B5:B7'))
    .setOption('title', 'Horas de la semana por tipo de trabajo')
    .setOption('pieHole', 0.4)
    .setPosition(24, 1, 0, 0).build());
}

// ───────────────────────────── Telegram ─────────────────────────────

function tg_(metodo, datos) {
  const token = propObligatoria_('TELEGRAM_TOKEN');
  const r = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + metodo, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(datos || {}),
    muteHttpExceptions: true,
  });
  const j = JSON.parse(r.getContentText());
  if (!j.ok) throw new Error('Telegram ' + metodo + ': ' + j.description);
  return j;
}

function enviar_(chatId, html) {
  const partes = [];
  let resto = html;
  while (resto.length > 3900) {
    let corte = resto.lastIndexOf('\n', 3900);
    if (corte < 1000) corte = 3900;
    partes.push(resto.slice(0, corte));
    resto = resto.slice(corte);
  }
  partes.push(resto);
  partes.forEach(function (p) {
    try {
      tg_('sendMessage', { chat_id: chatId, text: p, parse_mode: 'HTML', disable_web_page_preview: true });
    } catch (e) {
      // Si el HTML quedó mal formado por un corte, mandamos texto plano.
      tg_('sendMessage', { chat_id: chatId, text: p.replace(/<[^>]+>/g, '') });
    }
  });
}

function esc_(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function descargarArchivo_(fileId, nombre, mime) {
  const token = propObligatoria_('TELEGRAM_TOKEN');
  const info = tg_('getFile', { file_id: fileId }).result;
  const r = UrlFetchApp.fetch('https://api.telegram.org/file/bot' + token + '/' + info.file_path);
  const ext = (info.file_path.split('.').pop() || 'ogg').toLowerCase();
  const blob = r.getBlob();
  blob.setName(nombre || ('audio.' + (ext === 'oga' ? 'ogg' : ext)));
  blob.setContentType(mime || (ext === 'oga' || ext === 'ogg' ? 'audio/ogg' : blob.getContentType()));
  return blob;
}

/** Activador cada minuto: trae los mensajes nuevos del bot y los procesa. */
function revisarMensajes() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return; // otra ejecución sigue procesando
  try {
    const props = PropertiesService.getScriptProperties();
    const offset = Number(props.getProperty('TG_OFFSET') || 0);
    const updates = tg_('getUpdates', { offset: offset, limit: 3, timeout: 0, allowed_updates: ['message'] }).result;
    updates.forEach(function (upd) {
      // Avanzamos el offset antes de procesar: un mensaje que falla no se reintenta en bucle.
      // Lo ya transcripto queda guardado y se recupera con /reintentar.
      props.setProperty('TG_OFFSET', String(upd.update_id + 1));
      if (!upd.message) return;
      try {
        procesarMensaje_(upd.message);
      } catch (e) {
        console.error(e && e.stack ? e.stack : e);
        try { enviar_(upd.message.chat.id, '⚠️ No pude procesar ese mensaje: ' + esc_(e.message)); } catch (e2) { /* nada */ }
      }
    });
  } finally {
    lock.releaseLock();
  }
}

function autorizado_(msg) {
  const props = PropertiesService.getScriptProperties();
  const permitido = props.getProperty('ALLOWED_CHAT_ID');
  const chatId = String(msg.chat.id);
  if (permitido) return permitido === chatId;
  // Primer /start: el bot queda asociado a ese chat y a nadie más.
  if ((msg.text || '').trim().indexOf('/start') === 0) {
    props.setProperty('ALLOWED_CHAT_ID', chatId);
    return true;
  }
  return false;
}

function procesarMensaje_(msg) {
  if (!autorizado_(msg)) {
    tg_('sendMessage', { chat_id: msg.chat.id, text: 'Este bot es privado.' });
    return;
  }
  const chatId = msg.chat.id;
  const texto = (msg.text || '').trim();

  if (texto.indexOf('/') === 0) return comando_(chatId, texto);

  const audio = msg.voice || msg.audio || msg.video_note;
  if (audio) {
    tg_('sendChatAction', { chat_id: chatId, action: 'typing' });
    const blob = descargarArchivo_(audio.file_id, audio.file_name, audio.mime_type);
    const transcripcion = transcribir_(blob);
    return registrar_(chatId, transcripcion, 'audio', audio.duration || '', new Date(msg.date * 1000));
  }
  if (texto) {
    tg_('sendChatAction', { chat_id: chatId, action: 'typing' });
    return registrar_(chatId, texto, 'texto', '', new Date(msg.date * 1000));
  }
  enviar_(chatId, 'Mandame un audio o un texto contando cómo viene el día. /ayuda para ver los comandos.');
}

// ───────────────────────────── Transcripción ─────────────────────────────

/** Claude no recibe audio, así que la transcripción la hace Whisper (Groq, gratis) u OpenAI. */
function transcribir_(blob) {
  const proveedor = prop_('TRANSCRIPTION_PROVIDER', 'groq').toLowerCase();
  const url = proveedor === 'openai'
    ? 'https://api.openai.com/v1/audio/transcriptions'
    : 'https://api.groq.com/openai/v1/audio/transcriptions';
  const modelo = prop_('TRANSCRIPTION_MODEL', proveedor === 'openai' ? 'gpt-4o-transcribe' : 'whisper-large-v3');
  const r = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: { Authorization: 'Bearer ' + propObligatoria_('TRANSCRIPTION_API_KEY') },
    payload: { file: blob, model: modelo, language: 'es', response_format: 'json' },
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() !== 200) {
    throw new Error('Transcripción (' + proveedor + ') ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  }
  const t = (JSON.parse(r.getContentText()).text || '').trim();
  if (!t) throw new Error('La transcripción vino vacía. ¿El audio tenía voz?');
  return t;
}

// ───────────────────────────── Claude ─────────────────────────────

/**
 * Llamada a la Messages API por HTTP (Apps Script no tiene SDK oficial).
 * Con schema devuelve el objeto JSON ya validado por la API (structured outputs); sin schema, texto.
 */
function claude_(system, contenido, schema) {
  const body = {
    model: prop_('CLAUDE_MODEL', 'claude-opus-5-5'),
    max_tokens: 16000,
    system: system,
    messages: [{ role: 'user', content: contenido }],
    output_config: { effort: prop_('CLAUDE_EFFORT', 'medium') },
    // Si un clasificador de seguridad rechaza el pedido, la API lo reintenta en un modelo alternativo.
    fallbacks: 'default',
  };
  if (schema) body.output_config.format = { type: 'json_schema', schema: schema };

  let r;
  for (let intento = 0; intento < 4; intento++) {
    r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': propObligatoria_('ANTHROPIC_API_KEY'),
        'anthropic-version': '2026-10-21',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
    });
    const code = r.getResponseCode();
    if (code === 200) break;
    if (code === 429 || code === 529 || code >= 500) { Utilities.sleep(2000 * Math.pow(2, intento)); continue; }
    break; // 4xx: no tiene sentido reintentar
  }
  if (r.getResponseCode() !== 200) {
    throw new Error('Claude ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 300));
  }
  const res = JSON.parse(r.getContentText());
  if (res.stop_reason === 'refusal') throw new Error('Claude rechazó el pedido (' + JSON.stringify(res.stop_details) + ').');
  if (res.stop_reason === 'max_tokens') throw new Error('La respuesta de Claude quedó cortada (max_tokens).');
  const texto = res.content.filter(function (b) { return b.type === 'text'; })
    .map(function (b) { return b.text; }).join('');
  return schema ? JSON.parse(texto) : texto;
}

const SCHEMA_REGISTRO = {
  type: 'object',
  additionalProperties: false,
  required: ['resumen', 'sensaciones', 'items'],
  properties: {
    resumen: { type: 'string', description: 'Resumen del relato en 2 a 4 oraciones, en primera persona.' },
    sensaciones: { type: 'string', description: 'Cómo se sintió la persona (carga, frustración, logros). Vacío si no lo dijo.' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['tema_id', 'titulo', 'descripcion', 'detalle', 'categoria', 'tipo_trabajo', 'solicitante', 'area',
          'accion', 'estado', 'prioridad', 'minutos', 'minutos_estimados', 'proximo_paso'],
        properties: {
          tema_id: { type: 'string', description: 'ID de un tema existente (ej. T-0007) si el relato habla de ese tema; "" si es nuevo.' },
          titulo: { type: 'string', description: 'Título corto y concreto del tema (máx. 80 caracteres).' },
          descripcion: { type: 'string', description: 'Descripción general del tema, para alguien que no estuvo.' },
          detalle: { type: 'string', description: 'Qué pasó HOY con este tema según el relato.' },
          categoria: { type: 'string', enum: CATEGORIAS },
          tipo_trabajo: { type: 'string', enum: TIPOS_TRABAJO },
          solicitante: { type: 'string', description: 'Persona que lo pidió o con quien se trabajó. "" si no se sabe.' },
          area: { type: 'string', description: 'Área o sector involucrado. "" si no se sabe.' },
          accion: { type: 'string', enum: ACCIONES },
          estado: { type: 'string', enum: ESTADOS },
          prioridad: { type: 'string', enum: PRIORIDADES },
          minutos: { type: 'integer', description: 'Minutos dedicados hoy. 0 si solo se mencionó.' },
          minutos_estimados: { type: 'boolean', description: 'true si los minutos son una estimación tuya y no los dijo la persona.' },
          proximo_paso: { type: 'string', description: 'Próxima acción concreta, o "" si quedó resuelto.' },
        },
      },
    },
  },
};

function systemRegistro_() {
  const rol = prop_('CONTEXTO_PERSONAL',
    'Soy el responsable de tecnología de la compañía. Mi trabajo debería centrarse en la estrategia de ' +
    'tecnología, los proyectos de IT y su seguimiento, pero durante el día funciono como mesa de entrada de ' +
    'consultas y pedidos de mucha gente.');
  return [
    'Ordenás la bitácora de trabajo de una persona a partir de lo que cuenta en un audio transcripto.',
    'Contexto de la persona: ' + rol,
    '',
    'Separá el relato en temas (items). Un tema es un pedido, problema, proyecto, reunión o decisión concreta.',
    'No inventes temas ni datos: si algo no se dijo, dejá el campo vacío o usá la opción más neutra.',
    '',
    'tipo_trabajo:',
    '- Operativo: soporte puntual, consultas, accesos, equipos, "apagar incendios", el chiquitaje del día a día.',
    '- Táctico: seguimiento de proyectos, coordinación con proveedores o equipos, compras, implementación.',
    '- Estratégico: estrategia de tecnología, planificación, arquitectura, presupuesto, decisiones con la dirección.',
    '',
    'Temas existentes: si el relato se refiere a uno de los temas abiertos de la lista (aunque lo nombre distinto),',
    'usá su tema_id y su título, y poné en accion si hubo avance, se resolvió, se bloqueó o solo se mencionó.',
    'Si es algo nuevo, tema_id = "" y accion = "nuevo" (o "resuelto" si se abrió y cerró en el día).',
    'estado es el estado del tema DESPUÉS de lo que se cuenta.',
    '',
    'Minutos: usá lo que diga la persona ("me llevó media hora" = 30). Si no lo dice, estimá con criterio',
    '(una consulta rápida 10-15, un problema de equipo 30-60, una reunión lo que suele durar) y marcá',
    'minutos_estimados = true. Si un tema solo se nombró al pasar, minutos = 0 y accion = "mencion".',
    '',
    'Escribí en español rioplatense, claro y sin adornos.',
  ].join('\n');
}

// ───────────────────────────── Registro ─────────────────────────────

function registrar_(chatId, transcripcion, origen, duracion, cuando) {
  const tz = zona_();
  const fecha = fechaPura_(cuando);
  const hora = Utilities.formatDate(cuando, tz, 'HH:mm');
  const momento = Number(Utilities.formatDate(cuando, tz, 'H')) < 15 ? 'Mediodía' : 'Cierre del día';
  const regId = 'R-' + Utilities.formatDate(cuando, tz, 'yyMMdd-HHmmss');

  // Guardamos primero la transcripción: si falla Claude, no se pierde nada.
  const hR = hoja_(HOJAS.REGISTROS);
  hR.appendRow([regId, fecha, hora, momento, origen, duracion, transcripcion, '', '', '', 'pendiente']);
  const fila = hR.getLastRow();
  procesarRegistro_(chatId, fila);
}

function procesarRegistro_(chatId, fila) {
  const tz = zona_();
  const hR = hoja_(HOJAS.REGISTROS);
  const reg = hR.getRange(fila, 1, 1, COLS.REGISTROS.length).getValues()[0];
  const regId = reg[0], fecha = reg[1], hora = horaTxt_(reg[2]), momento = reg[3], transcripcion = reg[6];

  let res;
  try {
    const abiertos = leerTemas_().filter(function (t) { return t.estado !== 'Resuelto'; });
    const lista = abiertos.length
      ? abiertos.map(function (t) {
        return t.id + ' | ' + t.titulo + ' | ' + t.estado + ' | ' + (t.solicitante || '-') + ' | ' + (t.proximo || '-');
      }).join('\n')
      : '(no hay temas abiertos)';
    const contenido =
      'Fecha: ' + Utilities.formatDate(new Date(fecha), tz, 'EEEE yyyy-MM-dd') + ' ' + hora + ' (' + momento + ')\n\n' +
      'Temas abiertos (ID | título | estado | solicitante | próximo paso):\n' + lista + '\n\n' +
      'Relato transcripto:\n"""\n' + transcripcion + '\n"""';
    res = claude_(systemRegistro_(), contenido, SCHEMA_REGISTRO);
  } catch (e) {
    hR.getRange(fila, 11).setValue('error: ' + e.message.slice(0, 200));
    enviar_(chatId, '⚠️ Guardé la transcripción pero no pude ordenarla (' + esc_(e.message.slice(0, 200)) +
      ').\nCuando quieras, mandá /reintentar.');
    return;
  }

  const resultado = aplicarItems_(res.items, regId, fecha, hora);
  hR.getRange(fila, 8, 1, 4).setValues([[res.resumen, res.sensaciones,
    resultado.map(function (x) { return x.id; }).join(', '), 'ok']]);

  // Respuesta en Telegram
  const icono = { nuevo: '🆕', avance: '🔄', resuelto: '✅', bloqueado: '⛔', mencion: '💬' };
  let txt = '📝 <b>Registrado</b> (' + esc_(momento.toLowerCase()) + ')\n' + esc_(res.resumen) + '\n';
  if (resultado.length) {
    txt += '\n<b>Temas</b>\n' + resultado.map(function (x) {
      return (icono[x.accion] || '•') + ' <code>' + x.id + '</code> ' + esc_(x.titulo) +
        ' — ' + esc_(x.tipo) + (x.minutos ? ' · ' + x.minutos + ' min' + (x.estimado ? '*' : '') : '');
    }).join('\n') + '\n';
    if (resultado.some(function (x) { return x.estimado && x.minutos; })) txt += '<i>* minutos estimados</i>\n';
  }
  txt += '\n' + resumenHorasHtml_(fechaPura_(new Date()), fechaPura_(new Date()), 'Hoy');
  enviar_(chatId, txt);
}

/** Crea o actualiza temas y deja una fila en Actividades por cada item. */
function aplicarItems_(items, regId, fecha, hora) {
  const tz = zona_();
  const hT = hoja_(HOJAS.TEMAS);
  const hA = hoja_(HOJAS.ACTIVIDADES);
  const temas = leerTemas_();
  const porId = {};
  temas.forEach(function (t) { porId[t.id] = t; });
  const fechaTxt = Utilities.formatDate(new Date(fecha), tz, 'yyyy-MM-dd');
  const salida = [];
  const actividades = [];

  (items || []).forEach(function (it) {
    const minutos = Math.max(0, Math.round(Number(it.minutos) || 0));
    const linea = fechaTxt + ' [' + it.accion + '] ' + it.detalle;
    let t = it.tema_id ? porId[it.tema_id.trim()] : null;
    let id;
    if (t) {
      id = t.id;
      const historial = t.historial ? t.historial + '\n' + linea : linea;
      hT.getRange(t.fila, 7).setValue(it.estado);
      hT.getRange(t.fila, 10).setValue(fecha);
      hT.getRange(t.fila, 11).setValue((Number(t.minutos) || 0) + minutos);
      hT.getRange(t.fila, 12).setValue(it.estado === 'Resuelto' ? '' : it.proximo_paso);
      hT.getRange(t.fila, 14).setValue(historial);
      if (!t.solicitante && it.solicitante) hT.getRange(t.fila, 5).setValue(it.solicitante);
      if (!t.area && it.area) hT.getRange(t.fila, 6).setValue(it.area);
      t.estado = it.estado; t.minutos = (Number(t.minutos) || 0) + minutos; t.historial = historial;
    } else {
      id = siguienteIdTema_(temas);
      hT.appendRow([id, it.titulo, it.categoria, it.tipo_trabajo, it.solicitante, it.area, it.estado, it.prioridad,
        fecha, fecha, minutos, it.estado === 'Resuelto' ? '' : it.proximo_paso, it.descripcion, linea]);
      t = { id: id, titulo: it.titulo, estado: it.estado, fila: hT.getLastRow(), minutos: minutos, historial: linea };
      temas.push(t);
      porId[id] = t;
    }
    actividades.push([fecha, hora, regId, id, t.titulo || it.titulo, it.accion, it.categoria, it.tipo_trabajo,
      it.solicitante, it.area, minutos, it.minutos_estimados ? 'sí' : 'no', it.detalle]);
    salida.push({ id: id, titulo: t.titulo || it.titulo, accion: it.accion, tipo: it.tipo_trabajo, minutos: minutos,
      estimado: it.minutos_estimados });
  });

  if (actividades.length) {
    hA.getRange(hA.getLastRow() + 1, 1, actividades.length, actividades[0].length).setValues(actividades);
  }
  return salida;
}

function siguienteIdTema_(temas) {
  let max = 0;
  temas.forEach(function (t) {
    const n = Number(String(t.id).replace(/\D/g, ''));
    if (n > max) max = n;
  });
  return 'T-' + ('000' + (max + 1)).slice(-4);
}

function leerTemas_() {
  const h = hoja_(HOJAS.TEMAS);
  if (h.getLastRow() < 2) return [];
  return h.getRange(2, 1, h.getLastRow() - 1, COLS.TEMAS.length).getValues()
    .map(function (r, i) {
      return {
        fila: i + 2, id: r[0], titulo: r[1], categoria: r[2], tipo: r[3], solicitante: r[4], area: r[5],
        estado: r[6], prioridad: r[7], creado: r[8], actualizado: r[9], minutos: r[10], proximo: r[11],
        descripcion: r[12], historial: r[13],
      };
    })
    .filter(function (t) { return t.id; });
}

function leerActividades_(desde, hasta) {
  const h = hoja_(HOJAS.ACTIVIDADES);
  if (h.getLastRow() < 2) return [];
  const d = desde.getTime(), a = hasta.getTime();
  return h.getRange(2, 1, h.getLastRow() - 1, COLS.ACTIVIDADES.length).getValues()
    .filter(function (r) {
      if (!(r[0] instanceof Date)) return false;
      const f = fechaPura_(r[0]).getTime();
      return f >= d && f <= a;
    })
    .map(function (r) {
      return { fecha: r[0], temaId: r[3], titulo: r[4], accion: r[5], categoria: r[6], tipo: r[7],
        solicitante: r[8], area: r[9], minutos: Number(r[10]) || 0, detalle: r[12] };
    });
}

/** Fecha sin hora, en la zona horaria del script (que configurar() iguala a la de la planilla). */
function fechaPura_(d) {
  const p = Utilities.formatDate(d, zona_(), 'yyyy-MM-dd').split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

/** Sheets puede devolver la hora como Date si la columna no quedó en texto plano. */
function horaTxt_(v) {
  return v instanceof Date ? Utilities.formatDate(v, libro_().getSpreadsheetTimeZone(), 'HH:mm') : String(v);
}

function horasTxt_(min) {
  return (Math.round(min / 6) / 10).toString().replace('.', ',') + ' h';
}

function resumenHorasHtml_(desde, hasta, etiqueta) {
  const acts = leerActividades_(desde, hasta);
  const porTipo = {};
  let total = 0;
  acts.forEach(function (a) { porTipo[a.tipo] = (porTipo[a.tipo] || 0) + a.minutos; total += a.minutos; });
  if (!total) return '<b>' + etiqueta + ':</b> todavía sin horas registradas.';
  return '<b>' + etiqueta + ':</b> ' + horasTxt_(total) + ' en total\n' + TIPOS_TRABAJO.map(function (t) {
    const m = porTipo[t] || 0;
    return '  ' + t + ': ' + horasTxt_(m) + ' (' + Math.round(100 * m / total) + '%)';
  }).join('\n');
}

// ───────────────────────────── Comandos ─────────────────────────────

const AYUDA =
  '<b>Bitácora diaria</b>\n' +
  'Mandame un <b>audio</b> (o texto) al mediodía y al cierre contando qué temas surgieron, qué resolviste, ' +
  'quién te pidió qué, cuánto te llevó y cómo te sentiste. Yo lo ordeno en la planilla.\n\n' +
  '/hoy — lo registrado hoy\n' +
  '/semana — horas de la semana + resumen ejecutivo para tus jefes\n' +
  '/pendientes — temas abiertos\n' +
  '/cerrar T-0005 — marcar un tema como resuelto\n' +
  '/reintentar — reprocesar audios que fallaron\n' +
  '/ayuda — este mensaje';

function comando_(chatId, texto) {
  const partes = texto.split(/\s+/);
  const cmd = partes[0].toLowerCase().replace(/@.*$/, '');
  const hoy = fechaPura_(new Date());

  if (cmd === '/start' || cmd === '/ayuda' || cmd === '/help') return enviar_(chatId, AYUDA);

  if (cmd === '/hoy') {
    const acts = leerActividades_(hoy, hoy);
    if (!acts.length) return enviar_(chatId, 'Hoy todavía no registraste nada. Mandame un audio 🎙️');
    return enviar_(chatId, '<b>Hoy</b>\n' + acts.map(function (a) {
      return '• <code>' + a.temaId + '</code> ' + esc_(a.titulo) + ' — ' + esc_(a.accion) +
        (a.minutos ? ' · ' + a.minutos + ' min' : '');
    }).join('\n') + '\n\n' + resumenHorasHtml_(hoy, hoy, 'Total'));
  }

  if (cmd === '/pendientes') {
    const orden = { Alta: 0, Media: 1, Baja: 2 };
    const abiertos = leerTemas_().filter(function (t) { return t.estado !== 'Resuelto'; })
      .sort(function (a, b) { return (orden[a.prioridad] || 1) - (orden[b.prioridad] || 1); });
    if (!abiertos.length) return enviar_(chatId, 'No hay temas abiertos 🎉');
    return enviar_(chatId, '<b>Temas abiertos (' + abiertos.length + ')</b>\n' + abiertos.map(function (t) {
      return '• <code>' + t.id + '</code> ' + esc_(t.titulo) + ' [' + esc_(t.estado) + ', ' + esc_(t.prioridad) + ']' +
        (t.proximo ? '\n   ↳ ' + esc_(t.proximo) : '');
    }).join('\n'));
  }

  if (cmd === '/cerrar') {
    const id = (partes[1] || '').toUpperCase();
    const t = leerTemas_().filter(function (x) { return x.id === id; })[0];
    if (!t) return enviar_(chatId, 'No encontré el tema "' + esc_(id) + '". Usá /pendientes para ver los IDs.');
    const tz = zona_();
    const motivo = partes.slice(2).join(' ') || 'Cerrado manualmente';
    const linea = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd') + ' [resuelto] ' + motivo;
    const h = hoja_(HOJAS.TEMAS);
    h.getRange(t.fila, 7).setValue('Resuelto');
    h.getRange(t.fila, 10).setValue(hoy);
    h.getRange(t.fila, 12).setValue('');
    h.getRange(t.fila, 14).setValue(t.historial ? t.historial + '\n' + linea : linea);
    hoja_(HOJAS.ACTIVIDADES).appendRow([hoy, Utilities.formatDate(new Date(), tz, 'HH:mm'), 'manual', t.id, t.titulo,
      'resuelto', t.categoria, t.tipo, t.solicitante, t.area, 0, 'no', motivo]);
    return enviar_(chatId, '✅ <code>' + t.id + '</code> ' + esc_(t.titulo) + ' quedó resuelto.');
  }

  if (cmd === '/semana') {
    enviar_(chatId, '⏳ Armando el resumen de la semana…');
    return enviar_(chatId, resumenSemanal_());
  }

  if (cmd === '/reintentar') {
    const h = hoja_(HOJAS.REGISTROS);
    if (h.getLastRow() < 2) return enviar_(chatId, 'No hay registros.');
    const estados = h.getRange(2, 11, h.getLastRow() - 1, 1).getValues();
    const filas = [];
    estados.forEach(function (r, i) { if (String(r[0]).indexOf('ok') !== 0) filas.push(i + 2); });
    if (!filas.length) return enviar_(chatId, 'No hay registros pendientes de procesar 👍');
    filas.slice(0, 3).forEach(function (f) { procesarRegistro_(chatId, f); });
    if (filas.length > 3) enviar_(chatId, 'Quedan ' + (filas.length - 3) + ' más: mandá /reintentar otra vez.');
    return;
  }

  enviar_(chatId, 'No conozco ese comando.\n\n' + AYUDA);
}

/** Resumen de lunes a hoy: horas + texto ejecutivo escrito por Claude. */
function resumenSemanal_() {
  const hoy = fechaPura_(new Date());
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const acts = leerActividades_(lunes, hoy);
  if (!acts.length) return 'Esta semana todavía no hay actividades registradas.';

  const tz = zona_();
  const detalle = acts.map(function (a) {
    return Utilities.formatDate(a.fecha, tz, 'EEE dd') + ' | ' + a.temaId + ' | ' + a.titulo + ' | ' + a.tipo + ' | ' +
      a.categoria + ' | ' + (a.solicitante || '-') + ' | ' + a.accion + ' | ' + a.minutos + ' min | ' + a.detalle;
  }).join('\n');
  const abiertos = leerTemas_().filter(function (t) { return t.estado !== 'Resuelto'; })
    .map(function (t) { return t.id + ' | ' + t.titulo + ' | ' + t.estado + ' | ' + t.prioridad; }).join('\n');

  let ejecutivo = '';
  try {
    ejecutivo = claude_(
      'Escribís el resumen semanal de trabajo de un responsable de tecnología para presentarle a la dirección. ' +
      'Objetivo: que se entienda en qué se fueron las horas, cuánto se lo comió el trabajo operativo frente a ' +
      'los proyectos y la estrategia, qué se logró y qué queda pendiente. Usá solo los datos dados; no inventes. ' +
      'Español rioplatense, tono profesional y directo. Máximo 250 palabras. Texto plano con viñetas "•", sin ' +
      'markdown ni encabezados con #. Cerrá con 1 o 2 recomendaciones concretas para recuperar tiempo estratégico ' +
      '(por ejemplo, qué pedidos recurrentes conviene derivar o automatizar).',
      'Semana del ' + Utilities.formatDate(lunes, tz, 'yyyy-MM-dd') + ' al ' + Utilities.formatDate(hoy, tz, 'yyyy-MM-dd') +
      '\n\nActividades (fecha | tema | título | tipo | categoría | solicitante | acción | minutos | detalle):\n' + detalle +
      '\n\nTemas abiertos (ID | título | estado | prioridad):\n' + (abiertos || '(ninguno)'),
      null);
  } catch (e) {
    ejecutivo = '(No pude generar el texto ejecutivo: ' + e.message.slice(0, 150) + ')';
  }
  return '📊 ' + resumenHorasHtml_(lunes, hoy, 'Semana') + '\n\n' + esc_(ejecutivo);
}

// ───────────────────────────── Recordatorios ─────────────────────────────

function esDiaHabil_() {
  const d = new Date().getDay();
  return d >= 1 && d <= 5;
}

function recordatorioMediodia() {
  const chat = prop_('ALLOWED_CHAT_ID', null);
  if (!chat || !esDiaHabil_()) return;
  enviar_(chat, '🕐 ¿Cómo viene la mañana? Mandame un audio con los temas que surgieron y lo que resolviste.');
}

function recordatorioCierre() {
  const chat = prop_('ALLOWED_CHAT_ID', null);
  if (!chat || !esDiaHabil_()) return;
  const hoy = fechaPura_(new Date());
  enviar_(chat, '🌇 Cierre del día: ¿qué pasó a la tarde, qué quedó pendiente y cómo te sentiste?\n\n' +
    resumenHorasHtml_(hoy, hoy, 'Hasta ahora'));
}

function resumenSemanalAutomatico() {
  const chat = prop_('ALLOWED_CHAT_ID', null);
  if (!chat) return;
  enviar_(chat, resumenSemanal_());
}

// ───────────────────────────── Pruebas manuales ─────────────────────────────

/** Para probar sin Telegram: procesa un relato de ejemplo y lo deja en la planilla. */
function probarConTexto() {
  const chat = propObligatoria_('ALLOWED_CHAT_ID');
  registrar_(chat,
    'Mediodía. A la mañana me cayeron tres consultas de contabilidad por el acceso al sistema, me llevó como ' +
    'cuarenta minutos entre todo. Después estuve una hora en la reunión con el proveedor de la red nueva, quedaron ' +
    'en mandar la propuesta el viernes. Lo de la impresora de recepción ya lo resolví. Me siento un poco ' +
    'disperso, no pude avanzar nada con el plan de tecnología del año que viene.',
    'texto', '', new Date());
}

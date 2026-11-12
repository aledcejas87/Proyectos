# Bitácora diaria por audio

Mandás un **audio de Telegram** al mediodía y otro al cierre del día contando qué temas surgieron, qué resolviste,
quién te pidió qué y cómo te sentiste. El sistema lo transcribe, **Claude lo ordena en temas** y todo queda en una
**planilla de Google Sheets**: un tablero de temas con su estado y un tablero de horas por tipo de trabajo
(operativo, táctico, estratégico) para mostrarle a la dirección en qué se va el tiempo.

```
 🎙️ Audio en Telegram ──► Google Apps Script (corre gratis, dentro de la planilla, revisa cada minuto)
                              │
                              ├─► Whisper (Groq u OpenAI): audio → texto
                              ├─► Claude: texto → temas, estado, tipo de trabajo, minutos, sensaciones
                              └─► Google Sheets: Registros · Temas · Actividades · Tablero
                                        │
 📲 Respuesta en Telegram ◄─────────────┘  (qué registró y cómo vienen las horas del día)
```

## Por qué Telegram y no WhatsApp

WhatsApp solo permite bots mediante la API de WhatsApp Business de Meta: hace falta un número dedicado verificado,
una cuenta de Meta Business, un servidor con HTTPS y se paga por conversación. Telegram graba audios igual que
WhatsApp (mantener apretado el micrófono), los bots son gratis y se crean en dos minutos. Si más adelante la empresa
quiere WhatsApp, solo cambia la entrada: el resto (transcripción, Claude, planilla) se reutiliza.

## Qué queda en la planilla

| Hoja | Para qué sirve |
|---|---|
| **Tablero** | Horas de la semana, del mes y totales por tipo de trabajo y por categoría, % operativo vs. estratégico, temas por estado, quién genera más trabajo operativo, gráfico. Es la hoja para mostrar. |
| **Temas** | Un tema por fila (`T-0001`, `T-0002`…): título, categoría, tipo de trabajo, solicitante, área, estado, prioridad, minutos acumulados, próximo paso e historial fechado. Si en otro audio volvés a hablar de un tema abierto, Claude lo reconoce y lo actualiza en vez de duplicarlo. |
| **Actividades** | Cada vez que un tema aparece en un audio: fecha, acción (nuevo, avance, resuelto, bloqueado, mención), minutos y detalle. De acá salen las horas. |
| **Registros** | Cada audio o texto: transcripción completa, resumen y sensaciones del día. Nada se pierde: la transcripción se guarda antes de procesarla. |

Las planillas se pueden editar a mano (por ejemplo corregir minutos o el tipo de trabajo); el tablero se recalcula solo.

## Comandos del bot

| Comando | Qué hace |
|---|---|
| *(audio o texto)* | Registra el relato y responde con los temas detectados y las horas del día |
| `/hoy` | Lo registrado hoy y las horas por tipo |
| `/semana` | Horas de lunes a hoy + un resumen ejecutivo escrito por Claude, listo para reenviar a tus jefes |
| `/pendientes` | Temas abiertos ordenados por prioridad, con el próximo paso |
| `/cerrar T-0005 motivo` | Marca un tema como resuelto sin mandar un audio |
| `/reintentar` | Vuelve a procesar audios que fallaron (por ejemplo, si una API estaba caída) |

Además, de lunes a viernes el bot te **recuerda** a las 13:00 y a las 18:30 que mandes el audio, y los viernes a las
17:00 te manda solo el resumen semanal.

## Instalación (unos 20 minutos)

### 1. Crear el bot de Telegram
1. En Telegram, abrí **@BotFather** y mandá `/newbot`.
2. Elegí un nombre (por ejemplo "Mi bitácora") y un usuario que termine en `bot`.
3. BotFather te da un **token** del estilo `123456:ABC-...`. Guardalo.

### 2. Conseguir las claves de las APIs
- **Claude:** en [platform.claude.com](https://platform.claude.com) → *API keys* → crear una clave (`sk-ant-...`). Hay que cargar saldo.
- **Transcripción**, una de estas dos:
  - **Groq** (recomendado para empezar, tiene capa gratuita): [console.groq.com](https://console.groq.com) → *API Keys*.
  - **OpenAI**: [platform.openai.com](https://platform.openai.com) → *API keys*.

### 3. Crear la planilla y pegar el código
1. Creá una planilla nueva en Google Sheets (por ejemplo "Bitácora diaria").
2. Menú **Extensiones → Apps Script**.
3. Reemplazá el contenido de `Código.gs` por el de [`apps-script/Code.gs`](apps-script/Code.gs).
4. En **Configuración del proyecto** (ícono ⚙️) tildá *Mostrar el archivo de manifiesto "appsscript.json"* y
   reemplazá su contenido por el de [`apps-script/appsscript.json`](apps-script/appsscript.json).
   Si no estás en Argentina, cambiá `timeZone` (por ejemplo `America/Montevideo`, `America/Santiago`).

### 4. Cargar las claves (Propiedades del script)
En **Configuración del proyecto → Propiedades del script → Agregar propiedad**:

| Propiedad | Valor |
|---|---|
| `TELEGRAM_TOKEN` | El token de BotFather |
| `ANTHROPIC_API_KEY` | Tu clave de Claude |
| `TRANSCRIPTION_API_KEY` | La clave de Groq u OpenAI |
| `TRANSCRIPTION_PROVIDER` | `groq` u `openai` |

Opcionales:

| Propiedad | Para qué |
|---|---|
| `CONTEXTO_PERSONAL` | Una o dos oraciones sobre tu rol, la empresa, las áreas y los proyectos principales. Mejora mucho la clasificación. Ej.: *"Soy gerente de IT de una empresa de 300 personas con sedes en Montevideo y Santiago. Proyectos: migración a S/4HANA, renovación de red, ciberseguridad."* |
| `CLAUDE_EFFORT` | `low`, `medium` (por defecto) o `high`: cuánto razona Claude antes de ordenar el relato |
| `RECORDATORIO_MEDIODIA_HORA` / `RECORDATORIO_CIERRE_HORA` | Hora de los recordatorios (por defecto 13 y 18) |

Las claves quedan guardadas en tu cuenta de Google, no en el código ni en este repositorio.

### 5. Ejecutar la instalación
1. En el editor elegí la función **`configurar`** y tocá **Ejecutar**.
2. Google pide permisos (planilla, conexiones externas y activadores): aceptalos. Como el script es tuyo, puede
   aparecer "Google no verificó esta app" → *Configuración avanzada* → *Ir a (nombre del proyecto)*.
3. En el registro de ejecución aparece `Listo. Abrí Telegram, buscá @tu_bot y mandale /start.`

### 6. Activar el bot
Abrí tu bot en Telegram y mandá **`/start`**. El primer chat que manda `/start` queda como dueño: el bot ignora a
cualquier otra persona. Después mandá tu primer audio. La respuesta tarda hasta un minuto (el script revisa los
mensajes cada minuto) más lo que demore procesarlo.

> Para probar sin Telegram: ejecutá la función `probarConTexto` desde el editor (requiere haber hecho `/start` antes).

## Cómo hablarle al bot para sacarle provecho

No hace falta un formato, pero ayuda mencionar:
- **Quién** te pidió algo y de qué **área** ("Laura de Compras", "la gente de depósito").
- **Cuánto te llevó** ("como media hora", "toda la mañana"). Si no lo decís, Claude estima y lo marca con `*`.
- **Cómo quedó**: resuelto, en curso, esperando a alguien, bloqueado.
- **Qué sigue** ("el viernes llega la propuesta").
- **Cómo te sentiste**: queda en la columna *Sensaciones* y aparece en los resúmenes.

Ejemplo: *"Cierre del día. A la tarde me volvieron a pedir accesos de SAP para dos personas de Finanzas, otra media
hora. Avancé una hora con el plan de ciberseguridad, me falta el presupuesto. Lo de la red sigue esperando la
propuesta del proveedor. Me fui con la sensación de que el operativo me comió el día."*

## Costos estimados

| Concepto | Costo aproximado |
|---|---|
| Google Sheets + Apps Script | Gratis |
| Telegram | Gratis |
| Transcripción con Groq | Gratis dentro de su capa gratuita (de sobra para 2 audios por día) |
| Transcripción con OpenAI | ~USD 0,006 por minuto de audio |
| Claude (Opus 5.5) | ~USD 0,03 a 0,06 por audio → ~USD 2 a 3 por mes con 2 audios por día hábil y el resumen semanal |

## Privacidad

Lo que contás viaja a la API de transcripción elegida (Groq u OpenAI) y a la API de Claude (Anthropic), y queda en tu
Google Drive. Antes de usarlo con temas sensibles de la empresa, confirmá que esté alineado con la política de datos
de tu organización. Ninguna de esas APIs usa por defecto los datos enviados por API para entrenar modelos.

## Problemas frecuentes

- **El bot no responde:** en Apps Script → *Ejecuciones* revisá si `revisarMensajes` corre cada minuto y si da error.
  Un error típico es una propiedad mal escrita.
- **"Este bot es privado":** otra cuenta hizo `/start` primero. Borrá la propiedad `ALLOWED_CHAT_ID` y mandá `/start` de nuevo.
- **Un audio falló:** la transcripción quedó en *Registros* con estado `error`. Mandá `/reintentar`.
- **Cuota de Google:** las cuentas gratuitas de Gmail tienen 90 minutos diarios de ejecución en activadores. Revisar
  cada minuto usa unos 20-25. Si hiciera falta, en `configurar()` cambiá `everyMinutes(1)` por `everyMinutes(5)`.
- **Cambié algo en las hojas y se rompió el tablero:** ejecutá `configurar()` de nuevo; recrea el tablero y los
  activadores sin borrar tus datos.

## Ideas para más adelante

- Entrada por WhatsApp (API de WhatsApp Business o Twilio) reutilizando el mismo procesamiento.
- Informe mensual en Google Docs para el comité de dirección.
- Detectar pedidos recurrentes y sugerir qué documentar, automatizar o derivar a una mesa de ayuda.

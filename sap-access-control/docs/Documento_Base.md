# SAP Access Control — Scienza

## Documento base de alcance, decisiones y plan de trabajo

**Proyecto vinculado:** Reingeniería de Roles SAP — Sothis  
**Organización:** Scienza Uruguay y Scienza Chile  
**Fecha de consolidación:** 22 de octubre de 2026  
**Estado:** Documento de trabajo / definición funcional inicial  
**Alcance de este documento:** Recopilar lo explicado por el responsable del proyecto, las decisiones tomadas durante la conversación, las propuestas de diseño y los asuntos pendientes, para poder retomar el trabajo sin perder contexto.

> **Criterio de lectura:** Se distingue entre **Confirmado / acordado**, **Propuesto** y **Pendiente de validar**. Las ideas propuestas no deben interpretarse como funcionalidades construidas ni como decisiones cerradas.

---

## 1. Contexto del proyecto

Scienza está desarrollando un proyecto de **reingeniería de roles y autorizaciones en SAP S/4HANA productivo**, con apoyo de la consultora **Sothis**. El alcance considerado en esta conversación comprende **Uruguay y Chile**, que operan sobre el **mismo SAP productivo y mandante** (confirmado por el responsable del proyecto).

Sothis prevé efectuar relevamientos por cada área que utiliza SAP para identificar actividades y diseñar **“puestos de trabajo”**. Según lo explicado inicialmente por la consultora, cada puesto de trabajo puede contener **más de un rol SAP**. Aún no se dispone de una definición suficientemente clara y consensuada del concepto de puesto, de su granularidad o de cómo se gestionarán casos donde una persona cubre diversas funciones.

Se acordó con Sothis abordar el diseño de los **roles nuevos desde cero**, sin utilizar la estructura de roles actuales como referencia prescriptiva para el diseño. La razón es que el esquema heredado presenta solapamientos, asignaciones cruzadas y accesos potencialmente excesivos.

Al mismo tiempo, existe una inquietud legítima: **aunque los roles actuales no sean correctos desde una perspectiva de seguridad, sí han permitido que el negocio opere**. Por ello, su análisis es valioso como inventario y línea base de las capacidades hoy disponibles, sin asumir que todas sean necesarias o apropiadas.

## 2. Problema y motivación expresados

Actualmente existen usuarios con roles cruzados y permisos que podrían permitirles ejecutar funcionalidades fuera de las que deberían corresponder a sus responsabilidades. Es posible que algunos usuarios **ni siquiera conozcan** ciertos accesos que tienen asignados y que, por tanto, nunca los hayan utilizado.

Se desea:

- Conocer de forma completa y verificable **el universo actual de usuarios, roles, transacciones y autorizaciones**.
- Detectar acumulaciones de permisos y posibles riesgos de **segregación de funciones (SoD)**.
- Diferenciar entre tener un acceso asignado, poder realizar una operación y utilizarla efectivamente.
- Evitar perder capacidades operativas necesarias durante el rediseño, sin replicar automáticamente permisos indebidos.
- Identificar conflictos que deban resolverse y, cuando corresponda, **documentar excepciones aceptadas conscientemente**, con responsables y controles mitigantes.
- Contar con evidencia propia para supervisar el trabajo de Sothis, anticipar problemas y conducir con rigor las validaciones.
- Construir una base de información consultable y útil tanto para el trabajo inicial como para su posible evolución hacia una herramienta corporativa.

### Principio central acordado

**Modelo actual ≠ modelo correcto.**  
**Modelo actual = línea base de control y contraste.**  
**Modelo nuevo = diseño orientado a necesidades del negocio, mínimo privilegio y control SoD.**  
**Comparación entre ambos = herramienta para detectar omisiones, nuevos accesos, riesgos y decisiones pendientes.**

La línea base actual **no debe limitar** el diseño futuro a las transacciones existentes ni justificar accesos incorrectos por el solo hecho de haber existido. De igual modo, una capacidad actual no debe eliminarse sin comprobar si soporta una actividad real y necesaria.

---

## 3. Objetivo de la aplicación

**Nombre de trabajo propuesto:** `SAP Access Control | Scienza`.

### Objetivo inmediato — acordado

Crear una **aplicación web de consulta y análisis** que permita obtener una radiografía integral de los accesos existentes **hoy** en SAP productivo para empleados vigentes de Scienza Uruguay y Chile.

Esta es la prioridad. **No se comenzará construyendo el módulo futuro de puestos de trabajo** ni un flujo completo de aprobación de accesos. Primero es necesario determinar qué información real se puede extraer y con qué nivel de confiabilidad.

### Objetivos posteriores — previstos, pero no prioritarios hoy

1. Incorporar el modelo de puestos y nuevos roles generado con Sothis para contrastarlo con la situación actual.
2. Identificar accesos nuevos, capacidades potencialmente omitidas y riesgos existentes o emergentes.
3. Evolucionar hacia una herramienta corporativa de gobierno de accesos con revisiones, mitigaciones, aprobaciones y auditoría.

### Resultado que se busca al finalizar el proyecto de Sothis

Poder demostrar, con evidencia, que:

- Los procesos relevados están cubiertos.
- Los usuarios alcanzados tienen sus puestos y roles definidos.
- Los riesgos de SoD están identificados y tienen tratamiento explícito.
- Ninguna capacidad **operativa relevante y legítima** del modelo anterior desapareció de forma accidental.
- Los nuevos accesos que no existían antes pueden identificarse y justificarse.

---

## 4. Alcance y límites definidos

| Tema | Definición actual | Estado |
|---|---|---|
| Países | Uruguay y Chile | Confirmado |
| Sistema | SAP S/4HANA productivo | Confirmado |
| Instalación | Mismo SAP productivo y mandante para ambos países | Confirmado por el usuario |
| Experiencia de usuario | SAP GUI y SAP Fiori | Confirmado |
| Población objetivo inicial | Empleados vigentes de Uruguay y Chile | Confirmado |
| Cuentas técnicas, integraciones y proveedores | No forman parte de la población principal de la primera vista | Fuera del alcance inicial solicitado; conviene conservarlas separadas durante la conciliación para no confundir exclusión con inexistencia |
| Empleados que operan para ambos países | Existen; deben poder representarse expresamente | Confirmado |
| Datos organizativos | Se desea disponer de toda la estructura que sea posible | Confirmado como objetivo |
| Fuente de datos organizativos | Planilla o sistema de RR. HH. | Confirmado |
| Profundidad de permisos | Hasta objetos y valores de autorización, no solamente nombres de roles o transacciones | Confirmado |
| Datos de uso real | Interesan; aún no se conoce cómo obtenerlos | Pendiente de investigación |
| Primer método de alimentación | Exportaciones manuales Excel/CSV desde SAP | Confirmado |
| Infraestructura/alojamiento web | Sin decisión todavía | Pendiente |
| Usuarios futuros de la aplicación | Aspiración a una aplicación corporativa con distintos perfiles | Objetivo futuro confirmado; permisos exactos pendientes |
| Escritura o modificación en SAP | No se requiere para la primera etapa; la herramienta se propone de solo lectura | Propuesto |

**Importante:** el hecho de que el inventario principal esté limitado a empleados vigentes no significa que deban borrarse silenciosamente de una extracción las cuentas SAP no conciliadas con RR. HH. Es preferible separarlas en un conjunto de revisión, para asegurar que la población objetivo se haya identificado correctamente.

---

## 5. Requisitos funcionales de la primera etapa

### 5.1 Inventario de personas y cuentas

La solución debe distinguir entre **persona física** y **cuenta de SAP**.

Una persona puede operar para Uruguay, Chile o ambos; en el futuro también podría tener más de una cuenta según el diseño del sistema. No se debe asumir que el código SAP, el país y la identidad de la persona son una única dimensión.

**Información deseada por persona/cuenta:**

- Identificador de usuario SAP.
- Nombre y apellido; correo electrónico, cuando esté disponible y autorizado.
- Condición de empleado vigente obtenida de RR. HH.
- Área, cargo, responsable jerárquico y otros atributos organizativos disponibles.
- País de pertenencia y **países de operación** (no necesariamente iguales).
- Datos organizativos SAP pertinentes, por ejemplo sociedades, centros, depósitos y organizaciones de ventas, **solo cuando puedan inferirse de fuentes apropiadas**.
- Tipo, estado, validez y bloqueos de la cuenta SAP.
- Roles asignados y vigencias de asignación.
- Fecha de extracción y origen de los datos.

### 5.2 Inventario de roles

- Mostrar roles asignados a cada usuario.
- Diferenciar, cuando aplique, roles simples y compuestos.
- Permitir navegar desde un rol a todos los usuarios que lo reciben.
- Mostrar la cadena que explica la asignación: usuario → rol compuesto → rol simple, cuando exista.
- Mostrar vigencias, referencias y descripción del rol cuando se obtenga esa información.
- Detectar usuarios con alta cantidad de asignaciones **como señal para revisar**, no como prueba automática de riesgo.

### 5.3 Transacciones, aplicaciones y permisos

- Consulta **usuario → roles → transacciones**.
- Consulta inversa **transacción → roles → usuarios**.
- Consulta **usuario/rol → objetos de autorización → actividades y valores**.
- Navegación equivalente para **aplicaciones Fiori**, con sus catálogos y autorizaciones pertinentes, dentro del límite que permitan las extracciones.
- Distinguir la **transacción incluida en el menú** de la **autorización técnica** y del **acceso realmente ejecutable**.
- Permitir consultar permisos por alcance organizativo (sociedad, centro, organización de ventas, etc.) cuando el dato esté disponible.

### 5.4 Riesgos y conflictos de acceso

- Identificar potenciales permisos excesivos o críticos.
- Registrar conflictos de segregación de funciones (SoD).
- Permitir clasificar el estado de un conflicto como **identificado / bajo análisis / corregido / mitigado / aceptado** (taxonomía a precisar).
- Identificar permisos posiblemente innecesarios, particularmente si más adelante se dispone de datos de uso real.
- No equiparar **muchos roles** con **conflicto confirmado**.
- No equiparar **ningún uso observado** con **permiso innecesario**: los logs pueden ser incompletos y puede tratarse de operaciones esporádicas o de contingencia.

### 5.5 Gestión de excepciones

Cuando un conflicto deba mantenerse por razones operativas, registrar al menos:

- Riesgo o conflicto identificado.
- Usuario/rol/actividad afectados.
- Motivo de aceptación.
- Responsable/aprobador.
- Control mitigante asociado.
- Fecha de aprobación y fecha de próxima revisión o vencimiento.
- Evidencias y estado de seguimiento.

Este nivel de formalización **sí fue elegido explícitamente** por el usuario, aunque su implementación corresponde a una fase posterior o incremental.

### 5.6 Vistas de análisis

Dos formas de navegación fueron consideradas especialmente importantes:

1. **Ficha individual de usuario:** identidad, datos organizativos, países, roles, transacciones, autorizaciones, riesgos y, cuando exista, uso efectivo o histórico de actividad.
2. **Consulta inversa por transacción, rol u objeto de autorización:** quiénes tienen acceso, de dónde lo reciben, qué alcance organizativo poseen y qué alertas presenta esa configuración.

También se propuso una **pantalla inicial de indicadores** con usuarios, roles, transacciones/apps y hallazgos pendientes. Los números mostrados en la conversación anterior eran **ficticios e ilustrativos**, no datos de SAP.

### 5.7 Historial y trazabilidad

Cada carga de SAP debe poder conservarse como una **fotografía fechada** (*snapshot*), sin sobrescribir la anterior.

Debería registrarse:

- Momento de extracción y momento de importación.
- Sistema, mandante y fuente consultada.
- Archivo importado y, de ser viable, huella/checksum.
- Cantidad de filas leídas, aceptadas, rechazadas y duplicadas.
- Advertencias de calidad.
- Responsable de la carga.
- Versión de los datos utilizada en los reportes.

Esto permitirá comparar el estado de SAP entre distintas fechas y tener evidencia rastreable durante el proyecto.

---

## 6. Diferencias técnicas que debemos conservar

Una de las precauciones más relevantes del diseño es **no confundir cuatro conceptos**:

| Nivel | Significado | Qué podemos afirmar |
|---|---|---|
| 1. Asignación | Usuario con roles/perfiles vigentes | Que existe una relación de asignación en las fuentes consultadas |
| 2. Autorización configurada | Objetos, campos, valores y privilegios que derivan de la configuración | Qué autorizaciones están configuradas en roles y otros mecanismos analizados |
| 3. Capacidad efectiva | Posibilidad real de ejecutar una transacción u operación concreta | Requiere considerar autorizaciones aplicables, controles adicionales y posibles vías alternativas |
| 4. Uso observado | Actividad realmente registrada en un período | Depende de logs/estadísticas disponibles, cobertura, retención y accesos para consultarlos |

**Consecuencia:** una transacción que aparece en el menú de un rol no demuestra por sí sola que el usuario puede completarla. Y una transacción ausente del menú no descarta automáticamente todos los escenarios de ejecución por otras vías.

Para **SAP GUI**, habrá que comprender la relación entre transacciones y autorizaciones, incluido el control `S_TCODE` y las comprobaciones adicionales realizadas por las aplicaciones.

Para **Fiori**, habrá que incorporar catálogos/roles de lanzamiento, servicios, autorizaciones backend y otros componentes pertinentes según la configuración real del sistema. **Las transacciones clásicas no constituyen por sí solas un inventario completo de Fiori.**

**Uso real:** es una capacidad deseada, pero no está confirmada su extracción. Más adelante se investigará con IT/Seguridad qué estadísticas o registros están disponibles en SAP y si pueden obtenerse de forma autorizada, con suficiente cobertura temporal.

---

## 7. Módulos conceptuales de la aplicación

**Propuesta inicial de cinco módulos:**

| Módulo | Función |
|---|---|
| 01. Usuarios | Inventario de empleados/cuentas, condición de acceso, país y estructura organizativa |
| 02. Roles | Asignaciones vigentes/históricas, roles simples/compuestos y relaciones |
| 03. Permisos y autorizaciones | Transacciones, apps Fiori, objetos, actividades y valores organizativos |
| 04. Riesgos y conflictos | Alertas, potenciales excesos, reglas SoD, evaluación y excepciones |
| 05. Historial y evidencias | Importaciones, fotografías, diferencias y documentación |

### Pantallas candidatas (todavía no cerradas)

- Tablero de situación actual.
- Lista maestra de usuarios con filtros por país, área, estado y riesgo.
- Ficha de usuario con navegación por pestañas.
- Explorador de roles y jerarquía de roles compuestos.
- Buscador de transacciones y aplicaciones Fiori.
- Explorador de objetos y valores de autorización.
- Vista de relaciones cruzadas entre usuarios/roles/permisos.
- Registro de hallazgos y excepciones.
- Historial de cargas e indicadores de calidad de datos.

La interfaz aún no fue implementada. Su arquitectura técnica, tecnología, alojamiento y autenticación se definirán después de conocer los archivos reales y las restricciones corporativas.

---

## 8. Modelo conceptual de información (propuesta, no diseño físico definitivo)

Para evitar repetir datos y permitir consultas desde distintas perspectivas, se propuso pensar en estas entidades o conjuntos lógicos:

| Entidad | Propósito |
|---|---|
| **Persona** | Empleado y atributos suministrados por RR. HH. |
| **CuentaSAP** | Usuario técnico en SAP, estado, tipo y vigencia |
| **PersonaCuenta** | Vínculo validado entre persona y cuenta SAP |
| **PersonaPais / AlcancePais** | Diferenciar país de pertenencia y países donde opera |
| **UnidadOrganizativa** | Área, cargo, responsable y demás datos de RR. HH. |
| **RolSAP** | Catálogo y tipo de rol |
| **AsignacionRol** | Cuenta, rol, fechas de validez y origen |
| **RelacionRol** | Relaciones de roles compuestos con roles contenidos |
| **TransaccionSAP** | Código y descripción de transacción |
| **RolTransaccionMenu** | Transacciones incluidas en el menú del rol |
| **ObjetoAutorizacion / ValorAutorizacion** | Autorizaciones configuradas y sus valores |
| **RecursoFiori** | Apps, catálogos, servicios y relaciones relevantes |
| **ReglaRiesgoSoD** | Definición de incompatibilidades y criterios de criticidad |
| **Hallazgo / Excepcion** | Riesgos detectados, decisiones y mitigaciones |
| **Importacion / Snapshot** | Fuente, momento, control de calidad y versión de cada extracción |
| **Evidencia** | Referencia controlada a justificativos y documentación |

**Nota de arquitectura:** Las relaciones de seguridad SAP pueden ser más complejas que un simple esquema usuario–rol–transacción. Este modelo se deberá ajustar a las fuentes reales, en particular para perfiles generados, autorizaciones efectivas, roles derivados y Fiori.

---

## 9. Acceso actual a SAP y estrategia de alimentación

### Capacidades confirmadas

- Existe acceso al SAP productivo por **SE16N**.
- El usuario **ya pudo consultar tablas como `USR02` y `AGR_USERS`**.
- Existe acceso a **SUIM** y se ven los menús de informes, pero **todavía no se validó qué reportes pueden ejecutarse**.
- Se utilizan **SAP GUI y SAP Fiori**.
- El primer mecanismo de alimentación decidido será **exportar tablas o reportes de SAP a Excel/CSV e importarlos en la aplicación**.
- Se avanzará **paso a paso**, validando cada extracción antes de sumar nuevas fuentes.

### Información organizativa

Se espera obtenerla de una **planilla o sistema de Recursos Humanos**, no asumirla automáticamente desde SAP. Será necesario definir un identificador de conciliación y resolver casos como cambios de apellido, cuentas múltiples, usuarios sin correspondencia y personas que trabajan en dos países.

---

## 10. Plan concreto de extracción: primera iteración

Se acordó comenzar con **solo dos fuentes: `USR02` y `AGR_USERS`**, priorizando la comprensión de los datos reales antes de modelar toda la solución.

### Extracción 1: `USR02` — cuentas de usuario SAP

**Herramienta:** `SE16N` en productivo, consulta de solo lectura.  
**Método inicial:** obtener un conjunto que permita conciliar la población con RR. HH.; no filtrar prematuramente por país ni asumir que cuenta desbloqueada equivale a empleado vigente.

| Campo propuesto | Uso previsto |
|---|---|
| `BNAME` | Identificador de usuario SAP |
| `USTYP` | Tipo de usuario |
| `UFLAG` | Indicadores de bloqueo |
| `GLTGV` | Fecha de inicio de validez |
| `GLTGB` | Fecha final de validez |
| `TRDAT` | Fecha del último acceso registrado por el mecanismo correspondiente |
| `LTIME` | Hora asociada al último acceso |
| `CLASS` | Grupo de usuarios |

**Revisión de seguridad:** limitar la exportación a columnas necesarias. **No extraer** campos de credenciales, hashes o material de autenticación como `BCODE`, `PASSCODE` o `PWDSALTEDHASH`.

**A validar al procesar:** formato de fechas; interpretación de campos de bloqueo; vigencia de cuenta; comportamiento del dato de último inicio de sesión; exclusión lógica de cuentas no humanas del conjunto principal sin perderlas en la conciliación.

### Extracción 2: `AGR_USERS` — asignaciones de roles

**Herramienta:** `SE16N` en productivo.  
**Método inicial:** no excluir de antemano asignaciones caducadas, para permitir análisis de vigencia y trazabilidad.

| Campo propuesto | Uso previsto |
|---|---|
| `UNAME` | Usuario SAP |
| `AGR_NAME` | Nombre del rol asignado |
| `FROM_DAT` | Fecha de inicio de asignación |
| `TO_DAT` | Fecha de fin de asignación |
| `COL_FLAG` | Indicador relacionado con asignación vía rol compuesto; interpretación a validar |
| `ORG_FLAG` | Indicador de origen de asignación; interpretación a validar |

**Relación inicial:** `USR02.BNAME` ↔ `AGR_USERS.UNAME`.

### Resultados posibles tras estas dos extracciones

- Inventario inicial de cuentas SAP con tipo, vigencia y bloqueo.
- Conteo de roles asignados por cuenta.
- Roles compartidos entre usuarios.
- Asignaciones vencidas y próximas a vencer.
- Usuarios sin asignación visible y cuentas sin conciliación con RR. HH.
- Lista de cuentas de empleados vigentes con relación de roles para análisis posterior.

**Lo que todavía NO podremos concluir:** conflictos SoD confirmados, transacciones efectivamente ejecutables, cobertura completa Fiori o utilización histórica real.

### Entregable instrumental mencionado

Se preparó previamente un archivo Excel de trabajo llamado:

`Scienza_SAP_Kit_Extraccion_Inicial.xlsx`

La conversación lo presentó como plantilla para las extracciones, información de RR. HH., alcance por país, registro de carga y controles iniciales. Es un **apoyo para la carga**, no una extracción ya realizada ni la aplicación web terminada.

---

## 11. Extracciones siguientes — previstas, aún no ejecutadas

| Fuente | Uso previsto | Precaución |
|---|---|---|
| `AGR_DEFINE` | Datos definitorios de roles | Revisar campos y tipos disponibles en el sistema |
| `AGR_AGRS` | Jerarquías de roles compuestos | Resolver membresía y herencia sin duplicaciones |
| `AGR_TCODES` | Transacciones de menús de roles | No equivale a prueba de autorización efectiva |
| `AGR_1251` | Objetos, campos y valores de autorización por rol | Interpretar combinaciones de campos y niveles de autorización |
| `AGR_1252` | Información complementaria de valores organizativos | Validar versión, semántica y disponibilidad |
| `TSTC` / `TSTCT` | Catálogo de transacciones y textos descriptivos | Considerar idioma y transacciones técnicas |
| SUIM | Informes de usuarios, roles, transacciones y autorizaciones | Comprobar permisos reales para ejecutar reportes |
| Fuentes Fiori a determinar | Catálogos, apps, servicios y autorizaciones relacionadas | No asumir que SAP GUI cubre el universo Fiori |
| Fuentes de actividad a determinar | Estadísticas/logs de uso observado | Confirmar accesibilidad, retención, cobertura y finalidad autorizada |

No se ha confirmado aún la posibilidad de exportar todas estas fuentes ni la forma exacta en que el sistema de Scienza implementa roles y Fiori.

---

## 12. Etapas del proyecto de aplicación

### Etapa 1 — Radiografía de accesos actuales (**prioridad acordada**)

1. Confirmar fuentes disponibles y restricciones de lectura.
2. Extraer usuarios y asignaciones de roles.
3. Conciliar cuentas con empleados vigentes de RR. HH.
4. Identificar personas con operación en Uruguay, Chile o ambos.
5. Extraer estructura de roles simples y compuestos.
6. Incorporar transacciones de menú, objetos y valores de autorización.
7. Incorporar la dimensión Fiori con fuentes apropiadas.
8. Construir consultas directas e inversas, fichas e indicadores.
9. Añadir hallazgos preliminares y controles de calidad.
10. Registrar fotografías de datos para comparaciones futuras.

**Primer hito medible:** inventario de cuentas SAP validado y conciliado.  
**Segundo hito medible:** roles asignados por cuenta, con vigencias y relaciones conocidas.  
**Tercer hito medible:** mapa de transacciones/apps y autorizaciones, explicitando su grado de certeza.

### Etapa 2 — Contraste con el rediseño Sothis (**planificada, no iniciar aún**)

- Comprender y documentar la definición de “puesto de trabajo” que aplicará Sothis.
- Incorporar el modelo de puestos y roles propuestos.
- Asociar usuarios con puestos y funciones adicionales, si el diseño lo requiere.
- Identificar capacidades de la línea base no contempladas en el modelo futuro, **para validar si son necesarias**.
- Detectar accesos nuevos y exigir justificación cuando corresponda.
- Verificar cobertura de procesos relevantes, SoD y accesos por país/sociedad.
- Producir evidencias para validación funcional y técnica.

**Límite definido:** el usuario eligió que el relevamiento funcional proceso → actividad → transacción fuera realizado/documentado **por Sothis por separado**. No se construirá ese módulo como necesidad inmediata.

### Etapa 3 — Gobierno permanente (**visión de evolución**)

- Administración y aprobación de excepciones.
- Revisión periódica de accesos y mitigaciones.
- Perfiles de acceso dentro de la aplicación para distintos equipos.
- Seguimiento de cambios, evidencias y auditoría.
- Eventual automatización de extracciones, si resulta viable y autorizada.

---

## 13. Riesgos a controlar en la propia aplicación

### Riesgos funcionales

1. **Tomar asignación por acceso efectivo.** Evitar conclusiones definitivas basadas únicamente en menús.
2. **No contemplar Fiori.** SAP GUI y Fiori coexisten; el inventario debe reflejar ambos.
3. **Confundir país de empleo y país de operación.** Existen empleados que operan en Uruguay y Chile.
4. **Interpretar número de roles como riesgo comprobado.** Requiere reglas, contexto y análisis.
5. **Suponer que no hay uso porque no se encontraron logs.** Ausencia de evidencia no es evidencia de no uso.
6. **Usar roles viejos como modelo ideal.** Sirven como línea base, nunca como criterio único del rediseño.
7. **Ocultar cuentas no conciliadas con RR. HH.** Deben aparecer como excepciones de calidad de datos, aunque queden fuera de la vista principal de empleados.
8. **Eliminar una capacidad de negocio por considerarla innecesaria sin validación.** Necesidad y legitimidad deben evaluarse con referentes apropiados.

### Riesgos de seguridad e información

- Exportar más atributos personales o técnicos de los necesarios.
- Exponer información sensible de autorizaciones a personas sin necesidad de conocerla.
- Almacenar archivos de extracción sin cifrado, control de acceso o trazabilidad.
- Importar inadvertidamente campos de autenticación.
- Trabajar con snapshots no fechados y producir reportes engañosos.

**Controles propuestos:** acceso corporativo autenticado, permisos por perfil, cifrado según infraestructura elegida, mínimo privilegio para la propia aplicación, importaciones de solo lectura, registro de actividad administrativa y gestión segura de archivos originales. Las soluciones específicas quedan sujetas a la plataforma que se elija.

---

## 14. Respuestas a la primera ronda de definición (registro literal interpretado)

| Nº | Tema consultado | Respuesta seleccionada | Interpretación operativa |
|---|---|---|---|
| 1 | Objetivo principal | **A + B** | Documentar accesos actuales y controlar el trabajo de reingeniería con Sothis |
| 2 | Comparación antes/después | **Enfocarse primero en HOY** | La radiografía actual tiene prioridad sobre la comparación futura |
| 3 | Instancia/mandante | **A** | Uruguay y Chile comparten SAP productivo/mandante |
| 4 | Tipo de usuarios | **A** | Inicialmente solo usuarios humanos |
| 5 | Información organizativa | **C** | Toda la estructura posible; hay usuarios que operan en ambos países |
| 6 | Puesto de trabajo | **D** | Concepto aún no comprendido suficientemente |
| 7 | Más de un puesto por usuario | **D** | Debe discutirse con Sothis |
| 8 | Profundidad de permisos | **D** | Roles, transacciones, objetos y valores de autorización |
| 9 | Distinguir permiso de uso real | **D** | Interesa, pero se desconoce cómo conseguir esos datos |
| 10 | Transacción otorgada y no utilizada | **D** | Marcar como potencialmente innecesaria y alertar, sujeto a evidencia real |
| 11 | SoD | **C** | Registrar y clasificar conflictos corregidos, mitigados o aceptados |
| 12 | Excepciones SoD | **D** | Motivo, aprobador, mitigación y revisión/vencimiento |
| 13 | Ficha individual | **B** | Una pantalla principal será la ficha de usuario |
| 14 | Consulta inversa | **C** | Navegación por transacciones, roles y objetos de autorización |
| 15 | Registrar relevamientos Sothis | **C** | El relevamiento proceso/actividad lo documentará Sothis por separado |
| 16 | Capacidades actuales ausentes del modelo nuevo | **C** | Se marcó “No” en esa pregunta específica; requiere aclaración por la respuesta a la 20 |
| 17 | Transacciones nuevas en modelo futuro | **C** | Generar alerta y solicitar justificación |
| 18 | Carga inicial de datos | **A** | Importaciones manuales desde Excel/CSV exportados de SAP |
| 19 | Usuarios de la aplicación | **D** | Aspiración a aplicación corporativa con perfiles |
| 20 | Criterio de éxito con Sothis | **D** | Cobertura de procesos, usuarios asignados, riesgos identificados y no perder capacidades relevantes |

**Punto de tensión a aclarar más adelante:** la respuesta **16C** descarta explícitamente un control específico de capacidades actuales ausentes de los nuevos puestos; sin embargo, **20D** pide demostrar que no se pierdan capacidades operativas relevantes. La interpretación prudente es **no construir aún esa alerta automática**, pero conservar el objetivo de validación de cobertura para la etapa 2. No darlo por resuelto sin discutirlo.

---

## 15. Respuestas a la segunda ronda de diagnóstico SAP

| Nº | Pregunta | Respuesta | Consecuencia |
|---|---|---|---|
| 21 | SE16N sobre USR02/AGR_USERS | **A** | Ambas tablas ya pudieron consultarse |
| 22 | Informes en SUIM | **B** | Se ven menús; falta probar ejecución y alcance |
| 23 | Tipo de interfaz SAP | **B** | SAP GUI + Fiori; inventario debe cubrir ambas |
| 24 | Datos de RR. HH. | **B** | Planilla o sistema de RR. HH. |
| 25 | Población activa objetivo | **B** | Solo empleados vigentes de UY/CL |
| 26 | Prioridad de análisis | **D** | Usuarios, roles y permisos críticos; avanzar por extracción gradual |
| 27 | Alojamiento web | **D** | No decidir por ahora |

---

## 16. Decisiones, propuestas y dudas separadas

### Decisiones confirmadas

- Priorizar el conocimiento del estado **actual** de SAP.
- Incluir Uruguay y Chile y contemplar operación transfronteriza.
- Analizar tanto SAP GUI como Fiori.
- Comenzar por empleados vigentes, conciliados con RR. HH.
- Alcanzar objetos y valores de autorización, no detenerse en roles y transacciones.
- Cargar datos al principio mediante archivos Excel/CSV.
- Iniciar la extracción por `USR02` y `AGR_USERS`.
- Trabajar incrementalmente, verificando cada fuente.
- Diseñar consultas usuario → permisos y permisos → usuarios.
- Registrar SoD, mitigaciones y excepciones como objetivo funcional.

### Propuestas que todavía pueden cambiar

- Nombre `SAP Access Control | Scienza`.
- Diseño dividido en cinco módulos.
- Modelo de datos conceptual y pantallas sugeridas.
- Snapshots históricos en cada importación.
- Implementación exclusivamente de consulta, sin escribir cambios en SAP.
- Detalle de políticas de seguridad de la futura plataforma.
- Indicadores y señales automáticas para detectar posibles excesos.

### Pendientes prioritarios

1. Obtener la primera exportación real de `USR02` y verificar encabezados, formatos, campos y cantidades.
2. Obtener la exportación real de `AGR_USERS` y comprobar cardinalidad/asignaciones.
3. Definir reglas precisas para conciliar personas con usuarios SAP y determinar empleados vigentes.
4. Determinar qué campos de RR. HH. podrán compartirse/importarse y cómo identificar la operación UY/CL.
5. Comprobar qué consultas de SUIM funcionan con el perfil disponible.
6. Identificar las fuentes de Fiori realmente disponibles.
7. Definir criterios de medición del uso real sin asumir que existen logs accesibles.
8. Pedir a Sothis una explicación precisa de **puesto de trabajo**, su relación con roles y funciones adicionales.
9. Aclarar la tensión entre respuestas 16C y 20D cuando se inicie la etapa de comparación futura.
10. Decidir tecnología y alojamiento **solo después** de entender restricciones, datos y destinatarios.

---

## 17. Próximos pasos prácticos acordados

### Paso inmediato: `USR02`

1. Ingresar a `SE16N` en SAP productivo.
2. Consultar `USR02` en modo lectura.
3. Seleccionar únicamente los campos previstos en la sección 10, si están disponibles.
4. Exportar a Excel/CSV sin columnas de credenciales o hashes.
5. Comprobar cantidad de filas, nombres de campos y formatos de datos.
6. Conservar fecha, mandante y contexto de extracción.
7. Compartir una muestra anonimizada o el archivo completo **solo si las políticas internas de Scienza permiten hacerlo**.
8. Analizar consistencia de datos y definir las primeras reglas de la aplicación.

### Segundo paso: `AGR_USERS`

1. Repetir la exportación para las asignaciones de roles.
2. Mantener temporalmente las filas vigentes y caducadas.
3. Relacionar `BNAME` con `UNAME`.
4. Verificar cuentas sin roles y roles de cuentas no incluidas en la población objetivo.
5. Construir la primera versión del inventario cuentas ↔ roles.

### Primer resultado buscado

> Seleccionar un empleado vigente de Uruguay o Chile y obtener una ficha confiable de su cuenta SAP, estado y roles asignados, indicando qué información está validada y qué información aún falta extraer.

A partir de ese hito se ampliará el análisis hacia transacciones, autorizaciones, Fiori y posibles riesgos, **sin adelantar conclusiones**.

---

## 18. Frase guía para continuar el proyecto

**“Primero conocer con precisión lo que tenemos, después evaluar el riesgo y finalmente contrastarlo con lo que Sothis diseñe. El modelo heredado no define lo correcto, pero sí constituye evidencia de lo que hoy existe.”**

---

## 19. Estado de avance al cerrar esta conversación

- **Diseño funcional inicial:** conversado y documentado, todavía conceptual.
- **Dos rondas de preguntas:** respondidas y registradas en este documento.
- **Acceso a las primeras tablas SAP:** confirmado por el responsable del proyecto.
- **Primeras dos extracciones:** definidas, **sin datos reales analizados todavía**.
- **Plantilla Excel de apoyo:** mencionada/preparada anteriormente.
- **Aplicación web:** **no construida**.
- **Matriz SoD, cálculo de permisos efectivos y cobertura Fiori:** **no implementados ni validados**.
- **Alojamiento, tecnología y perfiles:** **pendientes**.

**Este documento puede utilizarse como contexto de arranque para nuevas conversaciones, para preparar un documento de requisitos funcionales más formal o para comenzar el diseño técnico una vez que se disponga de las primeras extracciones reales.**

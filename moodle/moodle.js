// Talks to a Moodle campus through its mobile web service. Pure logic, no framework: it needs `fetch` (browser, Node 18+).
// `crearMoodle({ campus })` gives you the functions for one campus. Rules enforced here, whatever the caller does:
//   - Read only by default: `llamar` throws before any request for a function outside LECTURA. Reads asked at the same
//     moment leave together in one request (JUNTAR, below), which only ever carries functions of LECTURA.
//   - The writes are apart and off: `inscribirse` enrols the student in a course, `subirArchivo`, `guardarEntrega` and
//     `enviarEntrega` hand in a task, `responderEnConversacion`, `mandarMensaje` and `marcarLeida` handle private
//     messages and `responderEnForo` answers a forum post. They work only through ESCRITURA, one attempt each, and only
//     if you create the client with `escritura: true`. Otherwise they throw before any request.
//   - The key never travels in a URL: it always goes in the request body.
//   - Files are only asked from the campus itself (same origin), and redirects are never followed with a key.

const LECTURA = new Set([
  'core_webservice_get_site_info',
  'core_enrol_get_users_courses',
  'core_course_get_enrolled_courses_by_timeline_classification',
  'core_calendar_get_action_events_by_timesort',
  'core_calendar_get_calendar_monthly_view',
  'core_course_get_contents',
  'message_popup_get_popup_notifications',
  // How many notifications are unread, for the bell. Marking one as read is left out on purpose.
  'message_popup_get_unread_popup_notification_count',
  // Finding a course to enrol in: the categories, the search, a category's courses and how each one takes students.
  'core_course_get_categories',
  'core_course_search_courses',
  'core_course_get_courses_by_field',
  'core_enrol_get_course_enrolment_methods',
  'enrol_self_get_instance_info',
  // A task of a course: its instructions, dates and rules, and where the student's submission is.
  'mod_assign_get_assignments',
  'mod_assign_get_submission_status',
  // A quiz of a course: its rules, the student's attempts and grade, the feedback for that grade, what it lets do and
  // the review of a finished attempt. Never one that starts, continues or logs an attempt (start_attempt, view_*).
  'mod_quiz_get_quizzes_by_courses',
  'mod_quiz_get_user_attempts',
  'mod_quiz_get_user_best_grade',
  'mod_quiz_get_quiz_feedback_for_grade',
  'mod_quiz_get_quiz_access_information',
  'mod_quiz_get_combined_review_options',
  'mod_quiz_get_attempt_review',
  // Private messages: how many conversations have unread ones, the conversations, the messages of one, and finding
  // someone to write to.
  'core_message_get_unread_conversations_count',
  'core_message_get_conversations',
  'core_message_get_conversation_messages',
  'core_message_message_search_users',
  // The forums of the courses, the discussions of one and the posts of one, to read them (Foros). Never one that
  // writes or logs a view (add_discussion, add_discussion_post, view_forum*).
  'mod_forum_get_forums_by_courses',
  'mod_forum_get_forum_discussions',
  'mod_forum_get_discussion_posts',
]);

// The only function that changes something in the campus, kept out of LECTURA so `llamar` never sends it.
const INSCRIBIR = 'enrol_self_enrol_user';
// Handing in a task: the files go up to a draft area of the student (upload.php, not a function of server.php), the
// submission is saved with them, and, when the task asks for it, sent to be graded.
const SUBIR = 'webservice/upload.php';
const GUARDAR_ENTREGA = 'mod_assign_save_submission';
const ENVIAR_ENTREGA = 'mod_assign_submit_for_grading';
// Private messages: answering in a conversation and writing to someone, after the screen asked, and marking a
// conversation as read when it is opened, like the campus does.
const RESPONDER = 'core_message_send_messages_to_conversation';
const MANDAR = 'core_message_send_instant_messages';
const MARCAR_LEIDA = 'core_message_mark_all_conversation_messages_as_read';
// Forums: an answer to a post of a discussion. Never a discussion of its own, an edit or a deletion.
const RESPONDER_EN_FORO = 'mod_forum_add_discussion_post';
const ESCRITURA = new Set([INSCRIBIR, SUBIR, GUARDAR_ENTREGA, ENVIAR_ENTREGA, RESPONDER, MANDAR, MARCAR_LEIDA, RESPONDER_EN_FORO]);

export class ErrorCampus extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.conocido = true;
    this.codigo = codigo;
  }
}

const SESION_VENCIDA = new Set(['invalidtoken', 'accessexception', 'sitepolicynotagreed', 'usernotfullysetup']);

function errorSegun(codigo) {
  if (codigo === 'invalidlogin') return new ErrorCampus('El usuario o la contraseña no coinciden.', codigo);
  if (codigo === 'enablewsdescription' || codigo === 'servicenotavailable') {
    return new ErrorCampus('El campus no permite este acceso ahora. Entrá desde su página.', codigo);
  }
  if (SESION_VENCIDA.has(codigo)) return new ErrorCampus('Tu sesión venció. Volvé a entrar.', 'sesion');
  return new ErrorCampus('El campus no pudo responder. Probá de nuevo en un rato.', codigo);
}

// `campus` keeps the campus's own code: «accessexception» is a dead key, but also a function its app access left closed.
function errorDeAcceso(codigo) {
  const error = errorSegun(codigo);
  error.campus = codigo;
  return error;
}

async function leerJson(respuesta) {
  if (!respuesta.ok) throw new ErrorCampus('El campus no pudo responder. Probá de nuevo en un rato.', `http_${respuesta.status}`);
  try {
    return await respuesta.json();
  } catch {
    throw new ErrorCampus('El campus no pudo responder. Probá de nuevo en un rato.', 'respuesta_invalida');
  }
}

// ---------- How long the campus gets ----------

/** A read the campus doesn't answer in this time fails like a fall of the network: what was kept shows instead. With a
 * bad signal the connection neither answers nor breaks, and the browser alone would wait minutes. */
export const TOPE_MS = 15_000;
const TARDO = 'El campus no contestó a tiempo. Probá de nuevo en un rato.';

// A signal that stops at the time limit, and also when `afuera` (the caller's) stops. `listo` ends the limit: for a
// file, once its headers arrived (a big one can take longer to come, and that is not a fall).
function conTope(afuera) {
  const propio = new AbortController();
  const reloj = setTimeout(() => propio.abort(new ErrorCampus(TARDO, 'tiempo')), TOPE_MS);
  let senal = propio.signal;
  if (afuera) {
    if (typeof AbortSignal.any === 'function') senal = AbortSignal.any([afuera, propio.signal]);
    else if (afuera.aborted) propio.abort(afuera.reason);
    else afuera.addEventListener('abort', () => propio.abort(afuera.reason), { once: true });
  }
  const motivo = (error) => (propio.signal.aborted && propio.signal.reason instanceof ErrorCampus && !afuera?.aborted ? propio.signal.reason : error);
  return { senal, listo: () => clearTimeout(reloj), motivo };
}

// ---------- Reads that leave together ----------

// The campus speaks HTTP/1.1: each request needs a connection of its own, the browser opens six at most and each new one
// costs two round trips. The reads asked in the same moment go in one request, through the function the campus app
// itself uses for that (Moodle 3.7+). It only ever carries functions of LECTURA, and only `leer` sends it: `llamar`
// never takes it. Moodle runs them one after another and stops at the first error: what it left unanswered goes again
// on its own. Measured against a real campus, nine first reads: 1.64 s apart and 0.93 s together with a
// bad signal, 0.39 s and 0.33 s on wifi.
const JUNTAR = 'tool_mobile_call_external_functions';
const SOLO_JUNTAR = new Set([JUNTAR]);
const POR_TANDA = 10;
// The heavy reads (a course's whole contents) leave in a batch of their own: Moodle answers a batch when its last read
// is done, and the light ones of the same moment would wait for them.
const PESADAS = new Set(['core_course_get_contents']);
// And at most four together: a batch shares one time limit (conTope), and a slow campus would let every course go at once.
const POR_TANDA_PESADA = 4;
const NOMBRE_DE_CAMPO = /^[a-z_]+(?:\[[a-z0-9_]+\])*$/i;
const PROHIBIDAS = new Set(['__proto__', 'constructor', 'prototype']);
/** Moodle's form names (`courseids[0]`) as the object its JSON arguments take ({ courseids: [..] }). */
export function anidar(parametros) {
  const raiz = {};
  for (const [nombre, valor] of Object.entries(parametros)) {
    if (!NOMBRE_DE_CAMPO.test(nombre)) throw new Error(`Campo raro: ${nombre}`);
    const partes = nombre.match(/[^[\]]+/g);
    if (partes.some((parte) => PROHIBIDAS.has(parte))) throw new Error(`Campo raro: ${nombre}`);
    let nodo = raiz;
    partes.forEach((parte, i) => {
      if (i === partes.length - 1) nodo[parte] = valor;
      else {
        if (!Object.hasOwn(nodo, parte)) nodo[parte] = /^\d+$/.test(partes[i + 1]) ? [] : {};
        nodo = nodo[parte];
      }
    });
  }
  return raiz;
}

function juntable(parametros) {
  try {
    anidar(parametros);
    return true;
  } catch {
    return false;
  }
}

// An error inside the batch, as the campus answers it to a request on its own.
function errorDeLaTanda(texto) {
  let e = null;
  try {
    e = JSON.parse(texto);
  } catch {
    // Not JSON: an unknown error.
  }
  return { exception: 'tanda', errorcode: typeof e?.errorcode === 'string' ? e.errorcode : 'desconocido' };
}

const CLAVE_MAL = new Set(['2', '3', '4']);

/** What the campus answered to an enrolment: true, or an error that says why in words. Its own messages are not shown:
 * one of them carries the first letter of the course key. */
export function leerInscripcion(datos) {
  if (datos?.status === true || datos?.status === 1) return true;
  const codigos = (datos?.warnings ?? []).map((w) => String(w?.warningcode));
  if (codigos.some((c) => CLAVE_MAL.has(c))) throw new ErrorCampus('La clave no es esa. Revisala y probá de nuevo.', 'clave_incorrecta');
  if (codigos.includes('1')) throw new ErrorCampus('La inscripción a esta materia está cerrada o llena.', 'inscripcion_cerrada');
  throw new ErrorCampus('No pudimos inscribirte. Probá de nuevo en un rato.', 'no_inscripto');
}

const numero = (n) => Number.isSafeInteger(n) && n > 0;

// Private messages. Each write sends its one function and nothing else, once: it never retries, so a slow answer
// cannot send a message twice.

/** The longest message the campus takes: core_message\api::MESSAGE_MAX_LENGTH, measured in bytes of UTF-8. */
export const LARGO_MAXIMO = 4096;
export const largoEnBytes = (texto) => new TextEncoder().encode(String(texto ?? '')).length;
const mensajeValido = (texto) => typeof texto === 'string' && texto.trim() !== '' && largoEnBytes(texto) <= LARGO_MAXIMO;
const NO_SALIO = 'No pudimos mandar el mensaje. Probá de nuevo.';

function errorDeMensaje(codigo) {
  if (codigo === 'errormessagetoolong') return new ErrorCampus('El mensaje es muy largo para el campus. Acortalo y probá de nuevo.', 'muy_largo');
  if (codigo === 'disabled') return new ErrorCampus('Los mensajes están apagados en el campus.', 'sin_mensajes');
  return errorDeAcceso(codigo);
}

/** What the campus answered to an answer in a conversation: the message as it keeps it, { id, useridfrom, text,
 * timecreated }, or an error in words. */
export function leerRespuesta(datos) {
  if (datos?.exception) throw errorDeMensaje(datos.errorcode);
  const mensaje = Array.isArray(datos) ? datos[0] : null;
  if (!numero(mensaje?.id)) throw new ErrorCampus('El campus no confirmó el mensaje.', 'sin_confirmar');
  return mensaje;
}

/** What the campus answered to a message to someone. It says no (blocked, only takes messages from contacts) with
 * msgid -1 and its own words, which are not shown. */
export function leerMandado(datos) {
  if (datos?.exception) throw errorDeMensaje(datos.errorcode);
  const r = Array.isArray(datos) ? datos[0] : null;
  if (!r || typeof r.msgid !== 'number') throw new ErrorCampus('El campus no confirmó el mensaje.', 'sin_confirmar');
  if (!numero(r.msgid)) throw new ErrorCampus('El campus no dejó mandarlo. Puede que esa persona no reciba mensajes tuyos.', 'rechazado');
  return { id: r.msgid, conversationid: r.conversationid, useridfrom: r.useridfrom, text: r.text, timecreated: r.timecreated };
}

// ---------- Handing in a task ----------

const MUY_GRANDE = 'El archivo pesa más de lo que acepta el campus.';
const GRANDE = new Set(['fileoversized', 'upload_error_ini_size', 'upload_error_form_size', 'userquotalimit', 'http_413']);

// What the campus says to a write about a task, in words. Its own messages are not shown: some are technical.
function errorDeEntrega(codigo) {
  if (GRANDE.has(codigo)) return new ErrorCampus(MUY_GRANDE, 'archivo_grande');
  if (codigo === 'filenameexist') return new ErrorCampus('Ya hay otro archivo con ese nombre.', 'archivo_repetido');
  if (codigo === 'virusfounduser' || codigo === 'virusfound') return new ErrorCampus('El campus rechazó el archivo.', 'archivo_rechazado');
  if (codigo === 'submissionslocked') return new ErrorCampus('Las entregas de esta tarea están bloqueadas en el campus.', 'bloqueada');
  if (codigo === 'nopermission' || codigo === 'nopermissions' || codigo === 'notingroup') return new ErrorCampus('El campus no te deja entregar esta tarea.', 'sin_permiso');
  return errorDeAcceso(codigo);
}

const sinEtiquetas = (texto) => String(texto ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

const tarea = (n) => Number.isSafeInteger(n) && n > 0;

// Forum answers. Sent once, never retried, like a message.

/** The longest answer taken here: the campus has no limit of its own for a post, this one keeps it a post. */
export const LARGO_FORO = 20_000;
const LARGO_ASUNTO = 255;
const escaparHtml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** What the student wrote, as the HTML of a post: everything escaped, a blank line starts a paragraph and a line break
 * stays one. Nothing of what was written becomes a tag. */
export function textoAHtml(texto) {
  return String(texto ?? '').replace(/\r\n?/g, '\n').trim().split(/\n\s*\n/)
    .map((parrafo) => parrafo.trim()).filter(Boolean)
    .map((parrafo) => `<p>${parrafo.split('\n').map(escaparHtml).join('<br>')}</p>`).join('');
}

function errorDeForo(codigo) {
  if (codigo === 'nopostforum' || codigo === 'cannotreply') return new ErrorCampus('El campus no te deja responder en esta discusión.', 'no_responde');
  if (codigo === 'discussionlocked') return new ErrorCampus('Esta discusión está cerrada.', 'cerrada');
  return errorDeAcceso(codigo);
}

/** What the campus answered to an answer in a forum: { id } of the new post, or an error in words. */
export function leerPublicado(datos) {
  if (datos?.exception) throw errorDeForo(datos.errorcode);
  if (!numero(datos?.postid)) throw new ErrorCampus('El campus no confirmó la respuesta.', 'sin_confirmar');
  return { id: datos.postid };
}


/** The campus as an origin («https://frro.cvg.utn.edu.ar»). Anything else (other scheme, a path) is refused, so a key can
 * never be sent to a different place by a typo. http is only taken for localhost, to try against a local Moodle. */
export function normalizarCampus(campus) {
  let url;
  try {
    url = new URL(String(campus ?? '').trim());
  } catch {
    throw new Error('El campus tiene que ser una dirección como https://campus.universidad.edu.ar');
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('El campus tiene que ir por https.');
  if (url.username || url.password || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new Error('El campus es solo el origen, sin ruta ni datos: https://campus.universidad.edu.ar');
  }
  return url.origin;
}

/** A client for one campus. `escritura` (false by default) turns on the functions that change something. */
export function crearMoodle({ campus: campusPedido, escritura = false } = {}) {
  const campus = normalizarCampus(campusPedido);
  const sinEscritura = () => {
    if (escritura !== true) throw new Error('La escritura está apagada: creá el cliente con crearMoodle({ campus, escritura: true }).');
  };

  /** Exchanges the password for a key. One attempt per call: it never retries, so a typo cannot add failed logins. */
  async function pedirClave(usuario, contrasena) {
    const tope = conTope();
    let datos;
    try {
      const respuesta = await fetch(`${campus}/login/token.php`, {
        method: 'POST',
        redirect: 'error',
        signal: tope.senal,
        body: new URLSearchParams({ username: usuario, password: contrasena, service: 'moodle_mobile_app' }),
      });
      datos = await leerJson(respuesta);
    } catch (error) {
      throw tope.motivo(error);
    } finally {
      tope.listo();
    }
    if (!datos.token) throw errorDeAcceso(datos.errorcode);
    return datos.token;
  }
  
  // One request to the web service, with the key in the body. Each caller says which list the function has to be in.
  // Only the reads get the time limit: a write stopped here may have happened in the campus anyway, and the student
  // trying again would send it twice.
  async function enviar(lista, token, funcion, parametros) {
    if (!lista.has(funcion)) throw new Error(`Función fuera de la lista: ${funcion}`);
    if (lista === ESCRITURA) sinEscritura();
    const tope = lista === ESCRITURA ? null : conTope();
    try {
      const respuesta = await fetch(`${campus}/webservice/rest/server.php`, {
        method: 'POST',
        redirect: 'error',
        ...(tope && { signal: tope.senal }),
        body: new URLSearchParams({ ...parametros, wstoken: token, wsfunction: funcion, moodlewsrestformat: 'json' }),
      });
      return await leerJson(respuesta);
    } catch (error) {
      throw tope ? tope.motivo(error) : error;
    } finally {
      tope?.listo();
    }
  }
  
  async function llamar(token, funcion, parametros = {}) {
    if (!LECTURA.has(funcion)) throw new Error(`Función fuera de la lista de lectura: ${funcion}`);
    const datos = await leer(token, funcion, parametros);
    if (datos?.exception) throw errorDeAcceso(datos.errorcode);
    return datos;
  }
  // Keys whose campus did not take a batch: their reads go one by one.
  const sinTandas = new Set();
  /** Whether this key's reads still leave together (none of its batches was refused). */
  const seJuntan = (token) => !sinTandas.has(token);
  const enEspera = new Map();
  function leer(token, funcion, parametros) {
    if (sinTandas.has(token) || !juntable(parametros)) return enviar(LECTURA, token, funcion, parametros);
    const grupo = PESADAS.has(funcion) ? 'pesadas' : 'livianas';
    return new Promise((ok, mal) => {
      let tanda = enEspera.get(grupo);
      if (tanda?.token !== token) {
        soltar(grupo);
        tanda = { token, pedidos: [] };
        enEspera.set(grupo, tanda);
        // What else is asked in this same moment (the screens' first requests come together) joins it.
        setTimeout(() => soltar(grupo, tanda), 0);
      }
      tanda.pedidos.push({ funcion, parametros, ok, mal });
      if (tanda.pedidos.length >= (grupo === 'pesadas' ? POR_TANDA_PESADA : POR_TANDA)) soltar(grupo);
    });
  }
  
  // The group's batch waiting, or only that one (`cual`) if it is still the one waiting.
  function soltar(grupo, cual) {
    const tanda = enEspera.get(grupo);
    if (!tanda || (cual && tanda !== cual)) return;
    enEspera.delete(grupo);
    if (!tanda.pedidos.length) return;
    if (tanda.pedidos.length === 1) deAUno(tanda.token, tanda.pedidos);
    else juntos(tanda.token, tanda.pedidos);
  }
  
  function deAUno(token, pedidos) {
    for (const p of pedidos) enviar(LECTURA, token, p.funcion, p.parametros).then(p.ok, p.mal);
  }
  async function juntos(token, pedidos) {
    const cuerpo = {};
    pedidos.forEach(({ funcion, parametros }, i) => {
      cuerpo[`requests[${i}][function]`] = funcion;
      cuerpo[`requests[${i}][arguments]`] = JSON.stringify(anidar(parametros));
    });
    let datos;
    try {
      if (!pedidos.every((p) => LECTURA.has(p.funcion))) throw new Error('Función fuera de la lista de lectura');
      datos = await enviar(SOLO_JUNTAR, token, JUNTAR, cuerpo);
    } catch (error) {
      for (const p of pedidos) p.mal(error);
      return;
    }
    const respuestas = Array.isArray(datos?.responses) ? datos.responses : null;
    // The campus did not take it (closed for this key, or the key is dead): each read on its own says why.
    if (!respuestas) {
      sinTandas.add(token);
      deAUno(token, pedidos);
      return;
    }
    pedidos.forEach((p, i) => {
      const r = respuestas[i];
      if (!r) return deAUno(token, [p]);
      if (r.error) return p.ok(errorDeLaTanda(r.exception));
      try {
        p.ok(r.data == null ? null : JSON.parse(r.data));
      } catch {
        p.mal(new ErrorCampus('El campus no pudo responder. Probá de nuevo en un rato.', 'respuesta_invalida'));
      }
    });
  }
  /** Enrols the student in a course through one of its self enrolments. The only write: it sends INSCRIBIR and nothing
   * else, with the course key in the body. One attempt per call, it never retries: a slow answer cannot enrol twice or
   * add failed key attempts. */
  async function inscribirse(token, cursoId, { instancia, clave = '' } = {}) {
    sinEscritura();
    if (!numero(cursoId) || !numero(instancia)) throw new ErrorCampus('No pudimos inscribirte. Probá de nuevo en un rato.', 'datos_invalidos');
    const datos = await enviar(ESCRITURA, token, INSCRIBIR, { courseid: String(cursoId), instanceid: String(instancia), password: String(clave) });
    if (datos?.exception) {
      // No self enrolment left in the course, or the course is out of sight.
      if (datos.errorcode === 'canntenrol') throw new ErrorCampus('Esta materia no deja inscribirse desde el campus. Pedíselo a quien la da.', 'sin_inscripcion');
      if (datos.errorcode === 'coursehidden') throw new ErrorCampus('Esta materia no está abierta en el campus.', 'oculta');
      throw errorDeAcceso(datos.errorcode);
    }
    return leerInscripcion(datos);
  }
  
  /** Answers in a conversation of the student: sends RESPONDER, with the text as the campus page sends it. */
  async function responderEnConversacion(token, conversacionId, texto) {
    sinEscritura();
    if (!numero(conversacionId) || !mensajeValido(texto)) throw new ErrorCampus(NO_SALIO, 'datos_invalidos');
    return leerRespuesta(await enviar(ESCRITURA, token, RESPONDER, { conversationid: String(conversacionId), 'messages[0][text]': texto }));
  }
  
  /** Writes to someone, with or without a conversation between the two (the campus opens one): sends MANDAR. */
  async function mandarMensaje(token, personaId, texto) {
    sinEscritura();
    if (!numero(personaId) || !mensajeValido(texto)) throw new ErrorCampus(NO_SALIO, 'datos_invalidos');
    return leerMandado(await enviar(ESCRITURA, token, MANDAR, { 'messages[0][touserid]': String(personaId), 'messages[0][text]': texto }));
  }
  
  /** Marks every message of a conversation as read for the student, what the campus does when it is opened there:
   * sends MARCAR_LEIDA. */
  async function marcarLeida(token, usuarioId, conversacionId) {
    sinEscritura();
    if (!numero(usuarioId) || !numero(conversacionId)) throw new ErrorCampus('No pudimos marcarla como leída.', 'datos_invalidos');
    const datos = await enviar(ESCRITURA, token, MARCAR_LEIDA, { userid: String(usuarioId), conversationid: String(conversacionId) });
    if (datos?.exception) throw errorDeMensaje(datos.errorcode);
    return true;
  }
  
  /** Whether an address is a campus file that pedirArchivo would ask for. */
  function esArchivoDelCampus(direccion) {
    try {
      const url = new URL(direccion);
      return url.origin === campus && url.pathname.startsWith('/webservice/pluginfile.php/');
    } catch {
      return false;
    }
  }
  
  /** Asks the campus for a file with the key in the body, and gives back the answer unread. `rango`: «bytes=a-b» or
   * «bytes=a-», for a part of it (the campus answers 206 with Content-Range, or 200 with the whole file).
   * `senal` stops it. Refuses any address outside the campus. */
  async function pedirArchivo(token, direccion, { rango = null, senal } = {}) {
    if (!esArchivoDelCampus(direccion)) throw new ErrorCampus('Ese archivo no está en el campus.', 'fuera_del_campus');
    const url = new URL(direccion);
    url.searchParams.delete('token');
    url.searchParams.delete('wstoken');
    const tope = conTope(senal);
    const opciones = { method: 'POST', redirect: 'error', body: new URLSearchParams({ token }), signal: tope.senal };
    if (rango) opciones.headers = { Range: rango };
    let respuesta;
    try {
      respuesta = await fetch(url, opciones);
    } catch (error) {
      throw tope.motivo(error);
    } finally {
      tope.listo();
    }
    if (!respuesta.ok) throw new ErrorCampus('No se pudo bajar el archivo. Probá de nuevo.', `http_${respuesta.status}`);
    if ((respuesta.headers.get('content-type') ?? '').includes('application/json')) {
      throw new ErrorCampus('No se pudo bajar el archivo. Probá de nuevo.', 'archivo_rechazado');
    }
    return respuesta;
  }
  
  /** Downloads a whole campus file with the key in the body. Refuses any address outside the campus. */
  async function bajarArchivo(token, direccion) {
    return (await pedirArchivo(token, direccion)).blob();
  }
  /** Uploads one file to the student's draft area and returns its number (`itemid`). `borrador` 0 starts a new one; the
   * rest of the files go to the same. Only to the campus, with the key in the body and no redirects. One attempt per
   * call, it never retries. */
  async function subirArchivo(token, archivo, { nombre, borrador = 0 } = {}) {
    sinEscritura();
    if (!ESCRITURA.has(SUBIR)) throw new Error(`Función fuera de la lista: ${SUBIR}`);
    if (!(archivo instanceof Blob) || !String(nombre ?? '').trim() || !Number.isSafeInteger(borrador) || borrador < 0) {
      throw new ErrorCampus('No pudimos subir el archivo. Probá de nuevo.', 'datos_invalidos');
    }
    const cuerpo = new FormData();
    cuerpo.append('token', token);
    cuerpo.append('filearea', 'draft');
    cuerpo.append('itemid', String(borrador));
    cuerpo.append('filepath', '/');
    cuerpo.append('file_1', archivo, String(nombre));
    const respuesta = await fetch(`${campus}/${SUBIR}`, { method: 'POST', redirect: 'error', body: cuerpo });
    if (respuesta.status === 413) throw errorDeEntrega('http_413');
    // A refusal of upload.php comes as JSON, sometimes with an error status: its code says why.
    const datos = await respuesta.json().catch(() => undefined);
    if (datos?.exception || datos?.errorcode) throw errorDeEntrega(datos.errorcode);
    if (!respuesta.ok) throw new ErrorCampus('El campus no pudo responder. Probá de nuevo en un rato.', `http_${respuesta.status}`);
    const subido = Array.isArray(datos) ? datos[0] : null;
    if (subido?.error || subido?.errortype) throw errorDeEntrega(subido.errortype);
    const itemid = Number(subido?.itemid);
    if (!Number.isSafeInteger(itemid) || itemid <= 0) throw new ErrorCampus('El campus no pudo responder. Probá de nuevo en un rato.', 'respuesta_invalida');
    return itemid;
  }
  /** Saves the submission of a task with what goes in it: `texto`, the HTML of the online text, and `borrador`, the draft
   * area with every file (subirArchivo). Each one only when the task takes it: a part left out stays as it was on the
   * campus. With drafts on it stays as a draft; without them, it is handed in. One attempt, it never retries. */
  async function guardarEntrega(token, tareaId, { texto, borrador } = {}) {
    sinEscritura();
    const conTexto = typeof texto === 'string';
    const conArchivos = Number.isSafeInteger(borrador) && borrador > 0;
    if (!tarea(tareaId) || (!conTexto && !conArchivos)) throw new ErrorCampus('No pudimos guardar la entrega. Probá de nuevo.', 'datos_invalidos');
    const parametros = { assignmentid: String(tareaId) };
    if (conTexto) {
      // No pictures inside the text: its draft area is none (0), as in the Moodle app.
      parametros['plugindata[onlinetext_editor][text]'] = texto;
      parametros['plugindata[onlinetext_editor][format]'] = '1';
      parametros['plugindata[onlinetext_editor][itemid]'] = '0';
    }
    if (conArchivos) parametros['plugindata[files_filemanager]'] = String(borrador);
    const datos = await enviar(ESCRITURA, token, GUARDAR_ENTREGA, parametros);
    if (datos?.exception) throw errorDeEntrega(datos.errorcode);
    const avisos = Array.isArray(datos) ? datos : (datos?.warnings ?? []);
    if (avisos.length) {
      // These notices are the campus's words for the student (the date passed, the word limit): they go as a detail.
      const error = new ErrorCampus('El campus no guardó la entrega.', 'no_guardada');
      error.detalle = avisos.map((a) => sinEtiquetas(a?.message)).filter(Boolean).join(' ');
      throw error;
    }
    return true;
  }
  
  /** Sends a saved submission to be graded, accepting the statement when the task asks for one. One attempt. */
  async function enviarEntrega(token, tareaId, { aceptar = false } = {}) {
    sinEscritura();
    if (!tarea(tareaId)) throw new ErrorCampus('No pudimos enviarla. Probá de nuevo.', 'datos_invalidos');
    const datos = await enviar(ESCRITURA, token, ENVIAR_ENTREGA, { assignmentid: String(tareaId), acceptsubmissionstatement: aceptar === true ? '1' : '0' });
    if (datos?.exception) throw errorDeEntrega(datos.errorcode);
    const avisos = Array.isArray(datos) ? datos : (datos?.warnings ?? []);
    // Its notice carries internal numbers: never shown.
    if (avisos.length) throw new ErrorCampus('El campus no la envió para calificar. Quedó guardada como borrador.', 'no_enviada');
    return true;
  }
  /** Answers a post of a discussion: sends RESPONDER_EN_FORO with the text as HTML and the subject the campus puts. */
  async function responderEnForo(token, postId, asunto, texto) {
    sinEscritura();
    const valido = typeof texto === 'string' && texto.trim() !== '' && texto.length <= LARGO_FORO;
    if (!numero(postId) || !valido || typeof asunto !== 'string' || !asunto.trim()) throw new ErrorCampus('No pudimos publicarla. Probá de nuevo.', 'datos_invalidos');
    return leerPublicado(await enviar(ESCRITURA, token, RESPONDER_EN_FORO, {
      postid: String(postId),
      subject: asunto.trim().slice(0, LARGO_ASUNTO),
      message: textoAHtml(texto),
      messageformat: '1',
    }));
  }


  return { campus, escritura: escritura === true, pedirClave, llamar, seJuntan, inscribirse, responderEnConversacion, mandarMensaje, marcarLeida, esArchivoDelCampus, pedirArchivo, bajarArchivo, subirArchivo, guardarEntrega, enviarEntrega, responderEnForo };
}

// The lists go out as views that can be read and never changed: adding a function to them from outside would turn
// a write on without `escritura: true`. Inside, the module uses only its own sets.
const soloVer = (lista) =>
  Object.freeze({ has: (f) => lista.has(f), get size() { return lista.size; }, [Symbol.iterator]: () => lista.values() });
const LECTURA_VISTA = soloVer(LECTURA);
const ESCRITURA_VISTA = soloVer(ESCRITURA);
export { ESCRITURA_VISTA as ESCRITURA, LECTURA_VISTA as LECTURA };

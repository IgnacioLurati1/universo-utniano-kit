import { afterEach, describe, expect, it, vi } from 'vitest';
import { anidar, TOPE_MS, crearMoodle, ErrorCampus, ESCRITURA, LARGO_MAXIMO, largoEnBytes, LECTURA, textoAHtml } from './moodle.js';

// The campus of the example: the tests only ever answer to a stubbed fetch, nothing leaves the machine.
const CAMPUS = 'https://frro.cvg.utn.edu.ar';
const { bajarArchivo, enviarEntrega, esArchivoDelCampus, guardarEntrega, inscribirse, llamar, mandarMensaje, marcarLeida, pedirArchivo, pedirClave, responderEnConversacion, responderEnForo, subirArchivo } = crearMoodle({ campus: CAMPUS, escritura: true });

const responder = (cuerpo, { status = 200, tipo = 'application/json' } = {}) =>
  vi.fn(async () => new Response(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo), { status, headers: { 'content-type': tipo } }));

afterEach(() => vi.unstubAllGlobals());

describe('llamar', () => {
  it('rejects anything outside the read list before any request', async () => {
    const pedido = responder({});
    vi.stubGlobal('fetch', pedido);
    for (const funcion of ['mod_assign_save_submission', 'core_message_send_instant_messages', 'core_user_update_users']) {
      await expect(llamar('k', funcion)).rejects.toThrow(/lista de lectura/);
    }
    expect(pedido).not.toHaveBeenCalled();
  });

  it('only lists functions that read', () => {
    // The course and people searches read too, but their names do not say so: they are let in by their exact names.
    const leeSinDecirlo = new Set(['core_course_search_courses', 'core_message_message_search_users']);
    for (const funcion of LECTURA) if (!leeSinDecirlo.has(funcion)) expect(funcion).toMatch(/_get_|_view_|site_info/);
  });

  it('never sends the enrolment, nor anything else that writes', async () => {
    const pedido = responder({ status: true, warnings: [] });
    vi.stubGlobal('fetch', pedido);
    for (const funcion of ['enrol_self_enrol_user', ...ESCRITURA]) await expect(llamar('k', funcion)).rejects.toThrow(/lista de lectura/);
    for (const funcion of ESCRITURA) expect(LECTURA.has(funcion)).toBe(false);
    expect(pedido).not.toHaveBeenCalled();
  });

  it('sends the key in the body and never in the URL', async () => {
    const pedido = responder({ ok: 1 });
    vi.stubGlobal('fetch', pedido);
    await llamar('secreta', 'core_webservice_get_site_info');
    const [url, opciones] = pedido.mock.calls[0];
    expect(String(url)).not.toContain('secreta');
    expect(opciones.method).toBe('POST');
    expect(opciones.body.get('wstoken')).toBe('secreta');
  });

  it('turns an expired key into a session error', async () => {
    vi.stubGlobal('fetch', responder({ exception: 'x', errorcode: 'invalidtoken', message: 'internal text' }));
    await expect(llamar('k', 'core_webservice_get_site_info')).rejects.toMatchObject({ codigo: 'sesion', message: 'Tu sesión venció. Volvé a entrar.' });
  });

  it('does not show the raw campus message', async () => {
    vi.stubGlobal('fetch', responder({ exception: 'x', errorcode: 'dbfail', message: 'SQL internal text' }));
    const error = await llamar('k', 'core_webservice_get_site_info').catch((e) => e);
    expect(error).toBeInstanceOf(ErrorCampus);
    expect(error.message).not.toContain('SQL');
  });

  it('reports a server failure without breaking on an HTML body', async () => {
    vi.stubGlobal('fetch', responder('<html>503</html>', { status: 503, tipo: 'text/html' }));
    await expect(llamar('k', 'core_webservice_get_site_info')).rejects.toMatchObject({ codigo: 'http_503' });
  });
});

describe('reads that leave together', () => {
  const JUNTAR = 'tool_mobile_call_external_functions';
  // The campus of the test: a batch gets one answer per read, in order, until the first error (as Moodle does).
  const campus = (responder) =>
    vi.fn(async (url, { body }) => {
      const f = body.get('wsfunction');
      if (f !== JUNTAR) return new Response(JSON.stringify(responder(f, Object.fromEntries(body))));
      const respuestas = [];
      for (let i = 0; body.has(`requests[${i}][function]`); i++) {
        const datos = responder(body.get(`requests[${i}][function]`), JSON.parse(body.get(`requests[${i}][arguments]`)));
        if (datos?.exception) {
          respuestas.push({ error: true, exception: JSON.stringify({ errorcode: datos.errorcode, message: 'interno' }) });
          break;
        }
        respuestas.push({ error: false, data: JSON.stringify(datos) });
      }
      return new Response(JSON.stringify({ responses: respuestas }));
    });
  const funcionesDe = (pedido) => pedido.mock.calls.map(([, { body }]) => body.get('wsfunction'));

  it('asked at the same moment, they go in one request, with the key in the body', async () => {
    const pedido = campus((f, a) => ({ f, a }));
    vi.stubGlobal('fetch', pedido);
    const [info, cursos, materia] = await Promise.all([
      llamar('k1', 'core_webservice_get_site_info'),
      llamar('k1', 'core_enrol_get_users_courses', { userid: 5 }),
      llamar('k1', 'mod_assign_get_assignments', { 'courseids[0]': '7' }),
    ]);
    expect(funcionesDe(pedido)).toEqual([JUNTAR]);
    const [url, { body }] = pedido.mock.calls[0];
    expect(String(url)).not.toContain('k1');
    expect(body.get('wstoken')).toBe('k1');
    expect(info).toEqual({ f: 'core_webservice_get_site_info', a: {} });
    expect(cursos).toEqual({ f: 'core_enrol_get_users_courses', a: { userid: 5 } });
    expect(materia).toEqual({ f: 'mod_assign_get_assignments', a: { courseids: ['7'] } });
  });

  it('a read alone goes on its own', async () => {
    const pedido = campus(() => ({ ok: 1 }));
    vi.stubGlobal('fetch', pedido);
    await llamar('k2', 'core_webservice_get_site_info');
    await llamar('k2', 'core_webservice_get_site_info');
    expect(funcionesDe(pedido)).toEqual(['core_webservice_get_site_info', 'core_webservice_get_site_info']);
  });

  it('an error is that read’s, and what the campus left unanswered goes again on its own', async () => {
    const pedido = campus((f, a) => (f === 'core_enrol_get_users_courses' && a.userid === 5 ? { exception: 'x', errorcode: 'dbfail' } : { f }));
    vi.stubGlobal('fetch', pedido);
    const [a, b, c] = await Promise.allSettled([
      llamar('k3', 'core_webservice_get_site_info'),
      llamar('k3', 'core_enrol_get_users_courses', { userid: 5 }),
      llamar('k3', 'core_enrol_get_users_courses', { userid: 7 }),
    ]);
    expect(a.value).toEqual({ f: 'core_webservice_get_site_info' });
    expect(b.reason).toMatchObject({ codigo: 'dbfail' });
    expect(b.reason.message).not.toContain('interno');
    expect(c.value).toEqual({ f: 'core_enrol_get_users_courses' });
    expect(funcionesDe(pedido)).toEqual([JUNTAR, 'core_enrol_get_users_courses']);
  });

  it('a campus that does not take batches gets each read on its own, from then on too', async () => {
    const pedido = vi.fn(async (url, { body }) => {
      const f = body.get('wsfunction');
      return new Response(JSON.stringify(f === JUNTAR ? { exception: 'x', errorcode: 'accessexception' } : { f }));
    });
    vi.stubGlobal('fetch', pedido);
    const dos = () => Promise.all([llamar('k4', 'core_webservice_get_site_info'), llamar('k4', 'core_enrol_get_users_courses', { userid: 7 })]);
    expect(await dos()).toEqual([{ f: 'core_webservice_get_site_info' }, { f: 'core_enrol_get_users_courses' }]);
    await dos();
    expect(funcionesDe(pedido)).toEqual([JUNTAR, 'core_webservice_get_site_info', 'core_enrol_get_users_courses', 'core_webservice_get_site_info', 'core_enrol_get_users_courses']);
  });

  it('a fall of the network fails every read of the batch', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const r = await Promise.allSettled([llamar('k5', 'core_webservice_get_site_info'), llamar('k5', 'core_enrol_get_users_courses', { userid: 7 })]);
    expect(r.map((x) => x.status)).toEqual(['rejected', 'rejected']);
  });

  it('the contents of the courses leave in a batch of their own, so the light reads do not wait for them', async () => {
    const pedido = campus((f) => ({ f }));
    vi.stubGlobal('fetch', pedido);
    await Promise.all([
      llamar('k7', 'core_course_get_contents', { courseid: 3 }),
      llamar('k7', 'core_webservice_get_site_info'),
      llamar('k7', 'core_course_get_contents', { courseid: 4 }),
      llamar('k7', 'core_enrol_get_users_courses', { userid: 7 }),
    ]);
    const tandas = pedido.mock.calls.map(([, { body }]) => [0, 1].map((i) => body.get(`requests[${i}][function]`)));
    expect(tandas).toEqual([
      ['core_course_get_contents', 'core_course_get_contents'],
      ['core_webservice_get_site_info', 'core_enrol_get_users_courses'],
    ]);
  });

  it('the contents go at most four in a batch', async () => {
    const pedido = campus((f) => ({ f }));
    vi.stubGlobal('fetch', pedido);
    await Promise.all([1, 2, 3, 4, 5, 6].map((id) => llamar('k8', 'core_course_get_contents', { courseid: id })));
    const cuantas = pedido.mock.calls.map(([, { body }]) => [...body.keys()].filter((k) => k.endsWith('[function]')).length);
    expect(cuantas).toEqual([4, 2]);
  });

  it('never carries a function outside the read list', async () => {
    const pedido = campus(() => ({}));
    vi.stubGlobal('fetch', pedido);
    const r = await Promise.allSettled([llamar('k6', 'core_webservice_get_site_info'), llamar('k6', 'mod_assign_save_submission'), llamar('k6', JUNTAR)]);
    expect(r.map((x) => x.status)).toEqual(['fulfilled', 'rejected', 'rejected']);
    expect(funcionesDe(pedido)).toEqual(['core_webservice_get_site_info']);
  });

  it('builds the arguments from the form names, and never from a dangerous one', () => {
    expect(anidar({ courseids: 1, 'options[0][name]': 'a', 'options[0][value]': 'b', 'x[y]': 2 })).toEqual({ courseids: 1, options: [{ name: 'a', value: 'b' }], x: { y: 2 } });
    for (const nombre of ['__proto__[x]', 'a[__proto__]', 'a[constructor]', 'a b', 'a[]']) expect(() => anidar({ [nombre]: 1 })).toThrow(/Campo raro/);
  });
});

describe('inscribirse', () => {
  const ok = () => responder({ status: true, warnings: [] });
  const aviso = (warningcode, message = 'campus text') => responder({ status: false, warnings: [{ item: 'instance', itemid: 7, warningcode, message }] });

  it('writes only through enrol_self_enrol_user, whatever else comes in', async () => {
    expect(ESCRITURA.has('enrol_self_enrol_user')).toBe(true);
    const pedido = ok();
    vi.stubGlobal('fetch', pedido);
    await inscribirse('k', 5, { instancia: 7, clave: 'x', wsfunction: 'core_user_update_users', courseid: 99, wstoken: 'otra' });
    const cuerpo = pedido.mock.calls[0][1].body;
    expect(Object.fromEntries(cuerpo)).toEqual({ courseid: '5', instanceid: '7', password: 'x', wstoken: 'k', wsfunction: 'enrol_self_enrol_user', moodlewsrestformat: 'json' });
  });

  it('sends the course key and the session key in the body, never in the URL', async () => {
    const pedido = ok();
    vi.stubGlobal('fetch', pedido);
    expect(await inscribirse('secreta', 5, { instancia: 7, clave: 'clave-del-curso' })).toBe(true);
    const [url, opciones] = pedido.mock.calls[0];
    expect(String(url)).toBe(`${CAMPUS}/webservice/rest/server.php`);
    expect(opciones.method).toBe('POST');
    expect(opciones.redirect).toBe('error');
    expect(opciones.body.get('password')).toBe('clave-del-curso');
    expect(opciones.body.get('wstoken')).toBe('secreta');
  });

  it('never retries, also when the connection or the campus fails', async () => {
    const cortado = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    vi.stubGlobal('fetch', cortado);
    await expect(inscribirse('k', 5, { instancia: 7 })).rejects.toThrow(TypeError);
    expect(cortado).toHaveBeenCalledTimes(1);
    const caido = responder('<html>503</html>', { status: 503, tipo: 'text/html' });
    vi.stubGlobal('fetch', caido);
    await expect(inscribirse('k', 5, { instancia: 7 })).rejects.toMatchObject({ codigo: 'http_503' });
    expect(caido).toHaveBeenCalledTimes(1);
  });

  it('refuses a course or an instance that is not a number, before any request', async () => {
    const pedido = ok();
    vi.stubGlobal('fetch', pedido);
    for (const [curso, instancia] of [['5', 7], [5, '7'], [0, 7], [5, undefined], [Number.NaN, 7], [5.5, 7]]) {
      await expect(inscribirse('k', curso, { instancia })).rejects.toBeInstanceOf(ErrorCampus);
    }
    expect(pedido).not.toHaveBeenCalled();
  });

  it('explains a wrong key without the campus message, which carries a hint of it', async () => {
    for (const codigo of ['2', '3', '4']) {
      vi.stubGlobal('fetch', aviso(codigo, 'La clave empieza con «q»'));
      const error = await inscribirse('k', 5, { instancia: 7, clave: 'mal' }).catch((e) => e);
      expect(error).toMatchObject({ codigo: 'clave_incorrecta', message: 'La clave no es esa. Revisala y probá de nuevo.' });
    }
  });

  it('says when the enrolment is closed or full', async () => {
    vi.stubGlobal('fetch', aviso('1'));
    await expect(inscribirse('k', 5, { instancia: 7 })).rejects.toMatchObject({ codigo: 'inscripcion_cerrada', message: 'La inscripción a esta materia está cerrada o llena.' });
    vi.stubGlobal('fetch', responder({ status: false, warnings: [] }));
    await expect(inscribirse('k', 5, { instancia: 7 })).rejects.toMatchObject({ codigo: 'no_inscripto' });
  });

  it('turns the campus exceptions into words', async () => {
    vi.stubGlobal('fetch', responder({ exception: 'moodle_exception', errorcode: 'canntenrol', message: 'internal' }));
    await expect(inscribirse('k', 5, { instancia: 7 })).rejects.toMatchObject({ codigo: 'sin_inscripcion' });
    vi.stubGlobal('fetch', responder({ exception: 'x', errorcode: 'invalidtoken', message: 'internal' }));
    await expect(inscribirse('k', 5, { instancia: 7 })).rejects.toMatchObject({ codigo: 'sesion' });
  });
});

describe('pedirClave', () => {
  it('asks once and explains a wrong password', async () => {
    const pedido = responder({ error: 'internal text', errorcode: 'invalidlogin' });
    vi.stubGlobal('fetch', pedido);
    await expect(pedirClave('u', 'p')).rejects.toThrow('El usuario o la contraseña no coinciden.');
    expect(pedido).toHaveBeenCalledTimes(1);
  });

  it('sends the password only to the campus, in the body', async () => {
    const pedido = responder({ token: 't', privatetoken: 'x' });
    vi.stubGlobal('fetch', pedido);
    expect(await pedirClave('u', 'p4ss')).toBe('t');
    const [url, opciones] = pedido.mock.calls[0];
    expect(String(url).startsWith(`${CAMPUS}/`)).toBe(true);
    expect(String(url)).not.toContain('p4ss');
    expect(opciones.body.get('password')).toBe('p4ss');
  });

  it('says so when the campus closes this access', async () => {
    vi.stubGlobal('fetch', responder({ error: 'x', errorcode: 'enablewsdescription' }));
    await expect(pedirClave('u', 'p')).rejects.toThrow(/no permite este acceso/);
  });
});

describe('bajarArchivo', () => {
  const direccion = `${CAMPUS}/webservice/pluginfile.php/1/mod_resource/content/1/a.pdf?forcedownload=1&token=vieja`;

  it('moves the key to the body and strips it from the URL', async () => {
    const pedido = responder('pdf', { tipo: 'application/pdf' });
    vi.stubGlobal('fetch', pedido);
    await bajarArchivo('secreta', direccion);
    const [url, opciones] = pedido.mock.calls[0];
    expect(String(url)).not.toMatch(/token|secreta|vieja/);
    expect(String(url)).toContain('forcedownload=1');
    expect(opciones.body.get('token')).toBe('secreta');
  });

  it('refuses to send the key anywhere else', async () => {
    const pedido = responder('x');
    vi.stubGlobal('fetch', pedido);
    for (const malo of ['https://evil.example/webservice/pluginfile.php/1/a.pdf', `${CAMPUS}/login/index.php`]) {
      await expect(bajarArchivo('secreta', malo)).rejects.toBeInstanceOf(ErrorCampus);
    }
    expect(pedido).not.toHaveBeenCalled();
  });

  it('treats a JSON answer as a failed download', async () => {
    vi.stubGlobal('fetch', responder({ error: 'x' }));
    await expect(bajarArchivo('k', direccion)).rejects.toMatchObject({ codigo: 'archivo_rechazado' });
  });

  it('asks for a part with Range, the key still only in the body', async () => {
    const pedido = vi.fn(async () => new Response('pd', { status: 206, headers: { 'content-type': 'application/pdf', 'content-range': 'bytes 0-1/9' } }));
    vi.stubGlobal('fetch', pedido);
    const corte = new AbortController();
    const respuesta = await pedirArchivo('secreta', direccion, { rango: 'bytes=0-1', senal: corte.signal });
    expect(respuesta.status).toBe(206);
    const [url, opciones] = pedido.mock.calls[0];
    expect(String(url)).not.toMatch(/token|secreta|vieja/);
    expect(opciones.headers).toEqual({ Range: 'bytes=0-1' });
    // The caller's signal still stops it (joined with the time limit).
    corte.abort();
    expect(opciones.signal.aborted).toBe(true);
    expect(opciones.body.get('token')).toBe('secreta');
    expect(JSON.stringify(opciones.headers)).not.toContain('secreta');
  });

  it('knows a campus file by its address', () => {
    expect(esArchivoDelCampus(direccion)).toBe(true);
    for (const otra of ['https://evil.example/webservice/pluginfile.php/1/a.pdf', `${CAMPUS}/pluginfile.php/1/a.pdf`, 'no es una dirección', undefined]) expect(esArchivoDelCampus(otra)).toBe(false);
  });

describe('lo que no se puede torcer', () => {
  it('los parámetros no pisan la función ni la clave', async () => {
    const pedido = vi.fn(async () => new Response('{}', { headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', pedido);
    await llamar('k', 'core_webservice_get_site_info', { wsfunction: 'mod_assign_submit_for_grading', wstoken: 'otra' });
    const cuerpo = pedido.mock.calls[0][1].body;
    expect(cuerpo.get('wsfunction')).toBe('core_webservice_get_site_info');
    expect(cuerpo.get('wstoken')).toBe('k');
  });

  it('un redirect nunca se sigue con la clave o la contraseña', async () => {
    const pedido = vi.fn(async () => new Response('{"token":"t"}', { headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', pedido);
    await llamar('k', 'core_webservice_get_site_info');
    await pedirClave('u', 'c');
    await bajarArchivo('k', `${CAMPUS}/webservice/pluginfile.php/1/a.pdf`).catch(() => {});
    expect(pedido.mock.calls.map(([, o]) => o.redirect)).toEqual(['error', 'error', 'error']);
  });
});
});

describe('notificaciones', () => {
  it('reads the count and the list for the bell, and llamar never marks one as read', async () => {
    expect(LECTURA.has('message_popup_get_popup_notifications')).toBe(true);
    expect(LECTURA.has('message_popup_get_unread_popup_notification_count')).toBe(true);
    const pedido = responder([]);
    vi.stubGlobal('fetch', pedido);
    for (const funcion of ['core_message_mark_notification_read', 'core_message_mark_all_notifications_as_read']) {
      expect(ESCRITURA.has(funcion)).toBe(false);
      await expect(llamar('k', funcion, { notificationid: 1 })).rejects.toThrow(/lista de lectura/);
    }
    expect(pedido).not.toHaveBeenCalled();
  });
});

describe('mensajes privados', () => {
  const ESCRIBEN = ['core_message_send_messages_to_conversation', 'core_message_send_instant_messages', 'core_message_mark_all_conversation_messages_as_read', 'mod_forum_add_discussion_post'];
  const cuerpoDe = (pedido) => Object.fromEntries(pedido.mock.calls[0][1].body);

  it('lists that cannot be changed from outside', () => {
    expect(LECTURA.add).toBeUndefined();
    expect(() => { LECTURA.has = () => true; }).toThrow();
    expect(LECTURA.has('core_message_send_instant_messages')).toBe(false);
  });

  it('reads through LECTURA and writes only through ESCRITURA, which llamar never sends', async () => {
    for (const funcion of ['core_message_get_unread_conversations_count', 'core_message_get_conversations', 'core_message_get_conversation_messages', 'core_message_message_search_users']) {
      expect(LECTURA.has(funcion)).toBe(true);
    }
    const pedido = responder([]);
    vi.stubGlobal('fetch', pedido);
    for (const funcion of ESCRIBEN) {
      expect(ESCRITURA.has(funcion)).toBe(true);
      expect(LECTURA.has(funcion)).toBe(false);
      await expect(llamar('k', funcion, { conversationid: 1 })).rejects.toThrow(/lista de lectura/);
    }
    expect(pedido).not.toHaveBeenCalled();
  });

  it('answers in a conversation with its one function, the text and the key in the body, once', async () => {
    const pedido = responder([{ id: 40, useridfrom: 5, text: '<p>hola</p>', timecreated: 100 }]);
    vi.stubGlobal('fetch', pedido);
    expect(await responderEnConversacion('secreta', 9, 'hola\nchau')).toEqual({ id: 40, useridfrom: 5, text: '<p>hola</p>', timecreated: 100 });
    expect(pedido).toHaveBeenCalledTimes(1);
    const [url, opciones] = pedido.mock.calls[0];
    expect(String(url)).toBe(`${CAMPUS}/webservice/rest/server.php`);
    expect(opciones.redirect).toBe('error');
    expect(cuerpoDe(pedido)).toEqual({ conversationid: '9', 'messages[0][text]': 'hola\nchau', wstoken: 'secreta', wsfunction: 'core_message_send_messages_to_conversation', moodlewsrestformat: 'json' });
  });

  it('writes to someone with its one function, once', async () => {
    const pedido = responder([{ msgid: 41, conversationid: 12, useridfrom: 5, text: 'hola', timecreated: 100 }]);
    vi.stubGlobal('fetch', pedido);
    expect(await mandarMensaje('k', 8, 'hola')).toMatchObject({ id: 41, conversationid: 12 });
    expect(cuerpoDe(pedido)).toEqual({ 'messages[0][touserid]': '8', 'messages[0][text]': 'hola', wstoken: 'k', wsfunction: 'core_message_send_instant_messages', moodlewsrestformat: 'json' });
  });

  it('marks a conversation as read with its one function, once', async () => {
    const pedido = responder(null);
    vi.stubGlobal('fetch', pedido);
    expect(await marcarLeida('k', 5, 9)).toBe(true);
    expect(cuerpoDe(pedido)).toEqual({ userid: '5', conversationid: '9', wstoken: 'k', wsfunction: 'core_message_mark_all_conversation_messages_as_read', moodlewsrestformat: 'json' });
  });

  it('answers a forum post with its one function, the text as escaped HTML, once', async () => {
    const pedido = responder({ postid: 77, warnings: [] });
    vi.stubGlobal('fetch', pedido);
    expect(await responderEnForo('k', 9, 'Re: Parcial', 'Sí <b>entra</b>\nla 3\n\nGracias & chau')).toEqual({ id: 77 });
    expect(pedido).toHaveBeenCalledTimes(1);
    expect(cuerpoDe(pedido)).toEqual({
      postid: '9', subject: 'Re: Parcial', message: '<p>Sí &lt;b&gt;entra&lt;/b&gt;<br>la 3</p><p>Gracias &amp; chau</p>', messageformat: '1',
      wstoken: 'k', wsfunction: 'mod_forum_add_discussion_post', moodlewsrestformat: 'json',
    });
  });

  it('a forum answer: refused before any request when empty, and said in words when the campus says no', async () => {
    const pedido = responder({ postid: 1 });
    vi.stubGlobal('fetch', pedido);
    for (const [id, asunto, texto] of [[9, 'Re: x', '  '], [9, '', 'hola'], ['9', 'Re: x', 'hola'], [9, 'Re: x', 'a'.repeat(20_001)]]) {
      await expect(responderEnForo('k', id, asunto, texto)).rejects.toMatchObject({ codigo: 'datos_invalidos' });
    }
    expect(pedido).not.toHaveBeenCalled();
    vi.stubGlobal('fetch', responder({ exception: 'moodle_exception', errorcode: 'nopostforum', message: 'interno' }));
    await expect(responderEnForo('k', 9, 'Re: x', 'hola')).rejects.toMatchObject({ codigo: 'no_responde' });
    vi.stubGlobal('fetch', responder({ warnings: [] }));
    await expect(responderEnForo('k', 9, 'Re: x', 'hola')).rejects.toMatchObject({ codigo: 'sin_confirmar' });
    const cortado = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    vi.stubGlobal('fetch', cortado);
    await expect(responderEnForo('k', 9, 'Re: x', 'hola')).rejects.toThrow(TypeError);
    expect(cortado).toHaveBeenCalledTimes(1);
  });

  it('nothing written becomes a tag', () => {
    expect(textoAHtml('<script>x</script>\r\n"a"')).toBe('<p>&lt;script&gt;x&lt;/script&gt;<br>&quot;a&quot;</p>');
  });

  it('never retries, also when the connection or the campus fails', async () => {
    const cortado = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    vi.stubGlobal('fetch', cortado);
    await expect(responderEnConversacion('k', 9, 'hola')).rejects.toThrow(TypeError);
    await expect(mandarMensaje('k', 8, 'hola')).rejects.toThrow(TypeError);
    expect(cortado).toHaveBeenCalledTimes(2);
    const caido = responder('<html>503</html>', { status: 503, tipo: 'text/html' });
    vi.stubGlobal('fetch', caido);
    await expect(responderEnConversacion('k', 9, 'hola')).rejects.toMatchObject({ codigo: 'http_503' });
    expect(caido).toHaveBeenCalledTimes(1);
  });

  it('refuses an empty text, one past the campus limit or a number that is not one, before any request', async () => {
    const pedido = responder([]);
    vi.stubGlobal('fetch', pedido);
    // The limit is in bytes: an «á» takes two.
    expect(largoEnBytes('á'.repeat(2048))).toBe(LARGO_MAXIMO);
    for (const [id, texto] of [[9, '   '], [9, ''], [9, 'á'.repeat(2048) + 'a'], ['9', 'hola'], [0, 'hola'], [9.5, 'hola'], [9, 42]]) {
      await expect(responderEnConversacion('k', id, texto)).rejects.toMatchObject({ codigo: 'datos_invalidos' });
      await expect(mandarMensaje('k', id, texto)).rejects.toMatchObject({ codigo: 'datos_invalidos' });
    }
    await expect(marcarLeida('k', 5, '9')).rejects.toMatchObject({ codigo: 'datos_invalidos' });
    expect(pedido).not.toHaveBeenCalled();
    vi.stubGlobal('fetch', responder([{ id: 1, useridfrom: 5, text: 'x', timecreated: 1 }]));
    await expect(responderEnConversacion('k', 9, 'á'.repeat(2048))).resolves.toMatchObject({ id: 1 });
  });

  it('says no in words, without the campus messages', async () => {
    vi.stubGlobal('fetch', responder([{ msgid: -1, errormessage: 'Este usuario lo bloqueó' }]));
    const rechazo = await mandarMensaje('k', 8, 'hola').catch((e) => e);
    expect(rechazo).toMatchObject({ codigo: 'rechazado' });
    expect(rechazo.message).not.toContain('bloque');
    vi.stubGlobal('fetch', responder({ exception: 'moodle_exception', errorcode: 'errormessagetoolong', message: 'interno' }));
    await expect(responderEnConversacion('k', 9, 'hola')).rejects.toMatchObject({ codigo: 'muy_largo' });
    vi.stubGlobal('fetch', responder({ exception: 'moodle_exception', errorcode: 'disabled', message: 'interno' }));
    await expect(marcarLeida('k', 5, 9)).rejects.toMatchObject({ codigo: 'sin_mensajes' });
    vi.stubGlobal('fetch', responder({ exception: 'x', errorcode: 'invalidtoken', message: 'interno' }));
    await expect(mandarMensaje('k', 8, 'hola')).rejects.toMatchObject({ codigo: 'sesion' });
    vi.stubGlobal('fetch', responder([]));
    await expect(responderEnConversacion('k', 9, 'hola')).rejects.toMatchObject({ codigo: 'sin_confirmar' });
    await expect(mandarMensaje('k', 8, 'hola')).rejects.toMatchObject({ codigo: 'sin_confirmar' });
  });

  it('the parameters cannot change the function or the key', async () => {
    const pedido = responder(null);
    vi.stubGlobal('fetch', pedido);
    await marcarLeida('k', 5, 9, { wsfunction: 'core_user_update_users', wstoken: 'otra' });
    expect(cuerpoDe(pedido).wsfunction).toBe('core_message_mark_all_conversation_messages_as_read');
    expect(cuerpoDe(pedido).wstoken).toBe('k');
  });
});

describe('la lista de escritura', () => {
  it('has the three steps of handing in a task, apart from the reads', () => {
    for (const funcion of ['webservice/upload.php', 'mod_assign_save_submission', 'mod_assign_submit_for_grading']) {
      expect(ESCRITURA.has(funcion)).toBe(true);
      expect(LECTURA.has(funcion)).toBe(false);
    }
  });

  it('reads the tasks through LECTURA, and llamar never sends their writes', async () => {
    expect(LECTURA.has('mod_assign_get_assignments')).toBe(true);
    expect(LECTURA.has('mod_assign_get_submission_status')).toBe(true);
    const pedido = responder([]);
    vi.stubGlobal('fetch', pedido);
    for (const funcion of ['mod_assign_save_submission', 'mod_assign_submit_for_grading', 'webservice/upload.php']) {
      await expect(llamar('k', funcion, { assignmentid: 1 })).rejects.toThrow(/lista de lectura/);
    }
    expect(pedido).not.toHaveBeenCalled();
  });
});

describe('subirArchivo', () => {
  const archivo = () => new Blob(['%PDF-1.4'], { type: 'application/pdf' });
  const subido = (itemid = 555) => responder([{ component: 'user', contextid: 9, userid: 1, filearea: 'draft', filename: 'tp.pdf', filepath: '/', itemid, license: 'allrightsreserved', author: 'x', source: 'x' }]);

  it('goes only to upload.php of the campus, with the key in the body and no redirects', async () => {
    const pedido = subido();
    vi.stubGlobal('fetch', pedido);
    expect(await subirArchivo('secreta', archivo(), { nombre: 'tp.pdf' })).toBe(555);
    const [url, opciones] = pedido.mock.calls[0];
    expect(String(url)).toBe(`${CAMPUS}/webservice/upload.php`);
    expect(opciones.method).toBe('POST');
    expect(opciones.redirect).toBe('error');
    expect(opciones.body).toBeInstanceOf(FormData);
    expect(opciones.body.get('token')).toBe('secreta');
    expect(opciones.body.get('filearea')).toBe('draft');
    expect(opciones.body.get('itemid')).toBe('0');
    expect(opciones.body.get('file_1').name).toBe('tp.pdf');
    expect([...opciones.body.keys()].sort()).toEqual(['file_1', 'filearea', 'filepath', 'itemid', 'token']);
  });

  it('puts the next files in the same draft', async () => {
    const pedido = subido(555);
    vi.stubGlobal('fetch', pedido);
    await subirArchivo('k', archivo(), { nombre: 'b.pdf', borrador: 555 });
    expect(pedido.mock.calls[0][1].body.get('itemid')).toBe('555');
  });

  it('never retries, also when the connection or the campus fails', async () => {
    const cortado = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    vi.stubGlobal('fetch', cortado);
    await expect(subirArchivo('k', archivo(), { nombre: 'a.pdf' })).rejects.toThrow(TypeError);
    expect(cortado).toHaveBeenCalledTimes(1);
    const caido = responder('<html>503</html>', { status: 503, tipo: 'text/html' });
    vi.stubGlobal('fetch', caido);
    await expect(subirArchivo('k', archivo(), { nombre: 'a.pdf' })).rejects.toMatchObject({ codigo: 'http_503' });
    expect(caido).toHaveBeenCalledTimes(1);
  });

  it('says in words why the campus refused the file', async () => {
    vi.stubGlobal('fetch', responder([{ filename: 'a.pdf', errortype: 'fileoversized', error: 'internal text' }]));
    await expect(subirArchivo('k', archivo(), { nombre: 'a.pdf' })).rejects.toMatchObject({ codigo: 'archivo_grande', message: 'El archivo pesa más de lo que acepta el campus.' });
    vi.stubGlobal('fetch', responder([{ filename: 'a.pdf', errortype: 'filenameexist', error: 'internal text' }]));
    await expect(subirArchivo('k', archivo(), { nombre: 'a.pdf' })).rejects.toMatchObject({ codigo: 'archivo_repetido' });
    vi.stubGlobal('fetch', responder({ error: 'internal text', errorcode: 'userquotalimit' }, { status: 500 }));
    await expect(subirArchivo('k', archivo(), { nombre: 'a.pdf' })).rejects.toMatchObject({ codigo: 'archivo_grande' });
    vi.stubGlobal('fetch', responder('<html>413</html>', { status: 413, tipo: 'text/html' }));
    await expect(subirArchivo('k', archivo(), { nombre: 'a.pdf' })).rejects.toMatchObject({ codigo: 'archivo_grande' });
    vi.stubGlobal('fetch', responder({ error: 'internal text', errorcode: 'invalidtoken' }));
    await expect(subirArchivo('k', archivo(), { nombre: 'a.pdf' })).rejects.toMatchObject({ codigo: 'sesion' });
    vi.stubGlobal('fetch', responder([]));
    await expect(subirArchivo('k', archivo(), { nombre: 'a.pdf' })).rejects.toMatchObject({ codigo: 'respuesta_invalida' });
  });

  it('refuses what is not a file or a draft number, before any request', async () => {
    const pedido = subido();
    vi.stubGlobal('fetch', pedido);
    for (const [a, opciones] of [['texto', { nombre: 'a.pdf' }], [archivo(), { nombre: '' }], [archivo(), { nombre: 'a.pdf', borrador: -1 }], [archivo(), { nombre: 'a.pdf', borrador: '5' }]]) {
      await expect(subirArchivo('k', a, opciones)).rejects.toBeInstanceOf(ErrorCampus);
    }
    expect(pedido).not.toHaveBeenCalled();
  });
});

describe('guardarEntrega', () => {
  it('writes only through mod_assign_save_submission, with the text and the draft of files', async () => {
    const pedido = responder([]);
    vi.stubGlobal('fetch', pedido);
    expect(await guardarEntrega('k', 7, { texto: '<p>Hola</p>', borrador: 555, wsfunction: 'core_user_update_users', assignmentid: 99 })).toBe(true);
    const [url, opciones] = pedido.mock.calls[0];
    expect(String(url)).toBe(`${CAMPUS}/webservice/rest/server.php`);
    expect(opciones.redirect).toBe('error');
    expect(Object.fromEntries(opciones.body)).toEqual({
      assignmentid: '7',
      'plugindata[onlinetext_editor][text]': '<p>Hola</p>',
      'plugindata[onlinetext_editor][format]': '1',
      'plugindata[onlinetext_editor][itemid]': '0',
      'plugindata[files_filemanager]': '555',
      wstoken: 'k',
      wsfunction: 'mod_assign_save_submission',
      moodlewsrestformat: 'json',
    });
  });

  it('leaves out the part the task does not take', async () => {
    const pedido = responder([]);
    vi.stubGlobal('fetch', pedido);
    await guardarEntrega('k', 7, { borrador: 555 });
    expect(pedido.mock.calls[0][1].body.has('plugindata[onlinetext_editor][text]')).toBe(false);
    await guardarEntrega('k', 7, { texto: '' });
    expect(pedido.mock.calls[1][1].body.has('plugindata[files_filemanager]')).toBe(false);
  });

  it('refuses a submission with nothing, or a task that is not a number, before any request', async () => {
    const pedido = responder([]);
    vi.stubGlobal('fetch', pedido);
    for (const [id, datos] of [[7, {}], ['7', { texto: 'x' }], [0, { texto: 'x' }], [7, { borrador: 0 }], [7, { borrador: '5' }]]) {
      await expect(guardarEntrega('k', id, datos)).rejects.toBeInstanceOf(ErrorCampus);
    }
    expect(pedido).not.toHaveBeenCalled();
  });

  it('turns the campus notice into an error, with its words as plain text', async () => {
    vi.stubGlobal('fetch', responder([{ item: 'assignment', itemid: 7, warningcode: 'couldnotsavesubmission', message: '<span class="error">La fecha de entrega ya pasó</span>' }]));
    const error = await guardarEntrega('k', 7, { texto: 'x' }).catch((e) => e);
    expect(error).toMatchObject({ codigo: 'no_guardada', message: 'El campus no guardó la entrega.', detalle: 'La fecha de entrega ya pasó' });
  });

  it('never retries, and explains a locked task or a dead key', async () => {
    const cortado = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    vi.stubGlobal('fetch', cortado);
    await expect(guardarEntrega('k', 7, { texto: 'x' })).rejects.toThrow(TypeError);
    expect(cortado).toHaveBeenCalledTimes(1);
    vi.stubGlobal('fetch', responder({ exception: 'moodle_exception', errorcode: 'submissionslocked', message: 'internal' }));
    await expect(guardarEntrega('k', 7, { texto: 'x' })).rejects.toMatchObject({ codigo: 'bloqueada' });
    vi.stubGlobal('fetch', responder({ exception: 'x', errorcode: 'invalidtoken', message: 'internal' }));
    await expect(guardarEntrega('k', 7, { texto: 'x' })).rejects.toMatchObject({ codigo: 'sesion' });
  });
});

describe('enviarEntrega', () => {
  it('writes only through mod_assign_submit_for_grading, accepting the statement only when told so', async () => {
    const pedido = responder([]);
    vi.stubGlobal('fetch', pedido);
    expect(await enviarEntrega('k', 7, { aceptar: true, wsfunction: 'x' })).toBe(true);
    expect(Object.fromEntries(pedido.mock.calls[0][1].body)).toEqual({ assignmentid: '7', acceptsubmissionstatement: '1', wstoken: 'k', wsfunction: 'mod_assign_submit_for_grading', moodlewsrestformat: 'json' });
    await enviarEntrega('k', 7, { aceptar: 'si' });
    expect(pedido.mock.calls[1][1].body.get('acceptsubmissionstatement')).toBe('0');
  });

  it('does not show its notice, which carries internal numbers', async () => {
    vi.stubGlobal('fetch', responder([{ item: 'assignment', itemid: 7, warningcode: 'couldnotsubmitforgrading', message: 'User id: 5, Assignment id: 7 Notices:' }]));
    const error = await enviarEntrega('k', 7, { aceptar: true }).catch((e) => e);
    expect(error.codigo).toBe('no_enviada');
    expect(error.message).not.toMatch(/User id/);
    expect(error.detalle).toBeUndefined();
  });

  it('never retries', async () => {
    const caido = responder('<html>503</html>', { status: 503, tipo: 'text/html' });
    vi.stubGlobal('fetch', caido);
    await expect(enviarEntrega('k', 7)).rejects.toMatchObject({ codigo: 'http_503' });
    expect(caido).toHaveBeenCalledTimes(1);
  });
});

describe('15 segundos para que el campus conteste', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // A connection that neither answers nor breaks: only the signal ends it.
  const colgado = () =>
    vi.fn((_url, { signal } = {}) => new Promise((_ok, mal) => signal?.addEventListener('abort', () => mal(signal.reason ?? new DOMException('aborted', 'AbortError')))));

  it('una lectura sin respuesta falla a los 15 s como una caída de la red', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', colgado());
    const pedido = llamar('t', 'core_webservice_get_site_info').catch((e) => e);
    await vi.advanceTimersByTimeAsync(TOPE_MS - 1);
    vi.advanceTimersByTime(1);
    const error = await pedido;
    expect(TOPE_MS).toBe(15_000);
    expect([error instanceof ErrorCampus, error.codigo]).toEqual([true, 'tiempo']);
  });

  it('el ingreso también tiene tope', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', colgado());
    const pedido = pedirClave('u', 'c').catch((e) => e);
    await vi.advanceTimersByTimeAsync(TOPE_MS);
    expect((await pedido).codigo).toBe('tiempo');
  });

  it('una escritura no: cortarla no la deshace en el campus, y repetirla la mandaría dos veces', async () => {
    vi.useFakeTimers();
    const fetch = colgado();
    vi.stubGlobal('fetch', fetch);
    mandarMensaje('t', 5, 'hola').catch(() => {});
    await vi.advanceTimersByTimeAsync(TOPE_MS * 4);
    expect(fetch.mock.calls[0][1].signal).toBeUndefined();
  });

  it('un archivo grande: el tope corre hasta que llegan las cabeceras, y la señal de quien pide sigue cortándolo', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => new Response(new Blob(['x']), { status: 200, headers: { 'content-type': 'application/pdf' } }));
    vi.stubGlobal('fetch', fetch);
    const corte = new AbortController();
    await pedirArchivo('t', `${CAMPUS}/webservice/pluginfile.php/1/a.pdf`, { senal: corte.signal });
    const senal = fetch.mock.calls[0][1].signal;
    await vi.advanceTimersByTimeAsync(TOPE_MS * 2);
    expect(senal.aborted).toBe(false);
    corte.abort();
    expect(senal.aborted).toBe(true);
  });
});

describe('crearMoodle', () => {
  it('takes only an https origin, so a key cannot go somewhere else by a typo', () => {
    for (const malo of [undefined, '', 'campus', 'http://campus.ejemplo.edu.ar', 'ftp://campus.ejemplo.edu.ar', 'https://campus.ejemplo.edu.ar/moodle', 'https://u:p' + '@campus.ejemplo.edu.ar', 'https://campus.ejemplo.edu.ar/?a=1']) {
      expect(() => crearMoodle({ campus: malo })).toThrow();
    }
    expect(crearMoodle({ campus: 'https://campus.ejemplo.edu.ar/' }).campus).toBe('https://campus.ejemplo.edu.ar');
    expect(crearMoodle({ campus: 'http://localhost:8080' }).campus).toBe('http://localhost:8080');
  });

  it('the writes are off by default: they throw before any request', async () => {
    const pedido = responder({ status: true });
    vi.stubGlobal('fetch', pedido);
    const solo = crearMoodle({ campus: CAMPUS });
    expect(solo.escritura).toBe(false);
    await expect(solo.inscribirse('k', 1, { instancia: 2 })).rejects.toThrow(/escritura está apagada/);
    await expect(solo.mandarMensaje('k', 3, 'hola')).rejects.toThrow(/escritura está apagada/);
    await expect(solo.responderEnConversacion('k', 3, 'hola')).rejects.toThrow(/escritura está apagada/);
    await expect(solo.marcarLeida('k', 3, 4)).rejects.toThrow(/escritura está apagada/);
    await expect(solo.responderEnForo('k', 3, 'asunto', 'hola')).rejects.toThrow(/escritura está apagada/);
    await expect(solo.guardarEntrega('k', 3, { texto: 'x' })).rejects.toThrow(/escritura está apagada/);
    await expect(solo.enviarEntrega('k', 3)).rejects.toThrow(/escritura está apagada/);
    await expect(solo.subirArchivo('k', new Blob(['x']), { nombre: 'a.txt' })).rejects.toThrow(/escritura está apagada/);
    expect(pedido).not.toHaveBeenCalled();
  });

  it('asks the campus it was created for, and only that one', async () => {
    const pedido = responder({ ok: 1 });
    vi.stubGlobal('fetch', pedido);
    await crearMoodle({ campus: 'https://campus.ejemplo.edu.ar' }).llamar('k', 'core_webservice_get_site_info');
    expect(String(pedido.mock.calls[0][0])).toBe('https://campus.ejemplo.edu.ar/webservice/rest/server.php');
    await expect(crearMoodle({ campus: 'https://campus.ejemplo.edu.ar' }).pedirArchivo('k', `${CAMPUS}/webservice/pluginfile.php/1/a.pdf`)).rejects.toMatchObject({ codigo: 'fuera_del_campus' });
  });

  it('reads keep working with the writes off', async () => {
    vi.stubGlobal('fetch', responder({ ok: 1 }));
    await expect(crearMoodle({ campus: CAMPUS }).llamar('k', 'core_webservice_get_site_info')).resolves.toEqual({ ok: 1 });
  });
});

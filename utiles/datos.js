// Small pure helpers for texts that come from outside (a campus, a form, a pasted link). `textoPlano` reads HTML, so it
// needs a DOM (a browser, or jsdom in tests): it never lets the markup become anything but text.

const DIA = 86_400;

// Characters that flip the direction of the text and can disguise what is written next to them.
const BIDI = /[\u202A-\u202E\u2066-\u2069]/g;

/** Text with HTML in it, as plain text: it can never run, because only its text is kept. */
export function textoPlano(html) {
  if (!html) return '';
  const documento = new DOMParser().parseFromString(String(html), 'text/html');
  return (documento.body.textContent ?? '').replace(BIDI, '').replace(/\s+/g, ' ').trim();
}

/** Only http(s) links reach a screen. Anything else, such as javascript:, is dropped. */
export function enlaceSeguro(direccion) {
  if (!direccion) return null;
  try {
    const url = new URL(direccion);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    url.searchParams.delete('token');
    url.searchParams.delete('wstoken');
    url.username = '';
    url.password = '';
    return url.href;
  } catch {
    return null;
  }
}

/** The host of an address without «www.», or an empty text if it is not an address. */
export function dominioDe(direccion) {
  try {
    return new URL(direccion).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** The id of a YouTube video from its usual address forms (watch, youtu.be, embed, shorts, live), or null. */
export function idDeYoutube(direccion) {
  try {
    const url = new URL(direccion);
    const host = url.hostname.replace(/^www\.|^m\./, '');
    let id = null;
    if (host === 'youtu.be') id = url.pathname.slice(1);
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = url.searchParams.get('v') ?? /^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname)?.[1] ?? null;
    }
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Lower case, without accents and trimmed: to compare or search texts. */
export const normalizar = (texto) =>
  (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const inicioDelDia = (segundos) => {
  const d = new Date(segundos * 1000);
  d.setHours(0, 0, 0, 0);
  return d.getTime() / 1000;
};

/** «Vence hoy», «Venció ayer», «Vence en 3 días»: how far a date is, in days, from now (both in seconds). */
export function faltan(vence, ahora) {
  const dias = Math.round((inicioDelDia(vence) - inicioDelDia(ahora)) / DIA);
  if (vence < ahora) {
    if (dias === 0) return 'Venció hoy';
    if (dias === -1) return 'Venció ayer';
    return `Venció hace ${-dias} días`;
  }
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
}

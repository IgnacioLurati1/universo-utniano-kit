// Only http(s) links reach a screen, and never with the campus key in them. Same function as utiles/datos.js, copied
// here so this folder works alone.

/** Only http(s) links reach a screen. Anything else, such as javascript:, is dropped, and so is a token in the query. */
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

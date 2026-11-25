// For a web worker that runs code you do not trust (a student's own program): once its engine is loaded, it takes away
// what reaches the network, opens another worker or touches the page's storage. It is a second lock, never the only one:
// dynamic import() is syntax and cannot be taken away, so the worker still needs a Content-Security-Policy that closes
// connect-src, font-src, img-src and script-src for it. Everything listed goes away from the global object and from
// every prototype above it, so it can't be fetched back. postMessage goes too: keep a bound copy before calling this.
export const SIN_RED = [
  'fetch', 'fetchLater', 'XMLHttpRequest', 'WebSocket', 'WebSocketStream', 'EventSource', 'WebTransport', 'importScripts',
  'Worker', 'SharedWorker', 'caches', 'indexedDB', 'BroadcastChannel', 'CookieStore', 'cookieStore', 'RTCPeerConnection',
  'webkitRTCPeerConnection', 'RTCDataChannel', 'WebSocketError', 'FontFace', 'FontFaceSet', 'fonts', 'Notification',
  'postMessage',
];

/** Takes away what reaches the network from `global` (the worker's `self`). Returns the names that were there. */
export function cerrarRed(global, nombres = SIN_RED) {
  const habia = [];
  for (const nombre of nombres) {
    let alguno = false;
    for (let o = global; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) {
      if (!Object.prototype.hasOwnProperty.call(o, nombre)) continue;
      alguno = true;
      try {
        delete o[nombre];
      } catch {
        // Not configurable: shadowed below.
      }
    }
    if (alguno) habia.push(nombre);
    try {
      Object.defineProperty(global, nombre, { value: undefined, writable: false, configurable: false, enumerable: false });
    } catch {
      // Already fixed as it is: nothing else to do.
    }
  }
  return habia;
}

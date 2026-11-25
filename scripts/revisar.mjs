// Checks every file of the repo (tracked, or new and not ignored) for things that must never be public: keys and
// tokens, paths of someone's computer, private network addresses and mail addresses outside the example domains.
//   node scripts/revisar.mjs
// Exits with 1 and the list of findings if there is any. `npm test` runs it too (scripts/revisar.test.js).
// KIT_REVISAR_EXTRA=<a JSON file with an array of words> adds words of your own that must not appear either.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = path.resolve(import.meta.dirname, '..');

export const PATRONES = [
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['Google OAuth secret', /GOCSPX-[A-Za-z0-9_-]{10,}/],
  ['GitHub token', /\b(ghp|gho|ghs|ghu)_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/],
  ['API key (sk-)', /\bsk-(ant-)?[A-Za-z0-9_-]{20,}/],
  ['Supabase key', /sb_(secret|publishable)_[A-Za-z0-9_-]{10,}/],
  ['Supabase project address', /\b[a-z0-9]{20}\.supabase\.(co|in)\b/i],
  ['JWT', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS key', /\bAKIA[0-9A-Z]{16}\b/],
  ['a path of a computer', /[a-z]:[\\/]+users[\\/]+[^\\/\s"'<>`]+|\/(home|Users)\/[a-z0-9._-]+\//i],
  ['an address of a private network', /[a-z0-9-]+\.[a-z0-9-]+\.ts\.net/i],
];

const MAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const MAIL_DE_EJEMPLO = /@([a-z0-9-]+\.)*(ejemplo\.com|example\.(com|org|net)|users\.noreply\.github\.com)$/i;

export function archivosDelRepo(raiz = RAIZ) {
  const salida = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: raiz,
    encoding: 'utf8',
  });
  return salida.split('\0').filter((f) => f && fs.existsSync(path.join(raiz, f)));
}

/** The findings of one text, as `file:line: what`. */
export function revisarTexto(rel, texto, extra = []) {
  const hallazgos = [];
  texto.split('\n').forEach((linea, i) => {
    const donde = `${rel}:${i + 1}`;
    for (const [nombre, patron] of PATRONES) if (patron.test(linea)) hallazgos.push(`${donde}: ${nombre}`);
    for (const m of linea.match(MAIL) ?? []) {
      if (!MAIL_DE_EJEMPLO.test(m)) hallazgos.push(`${donde}: a mail address outside the example domains`);
    }
    for (const palabra of extra) {
      if (linea.toLowerCase().includes(palabra.toLowerCase())) hallazgos.push(`${donde}: a word of the extra list`);
    }
  });
  return hallazgos;
}

export function revisar(raiz = RAIZ, extra = leerExtra()) {
  return archivosDelRepo(raiz)
    .filter((rel) => rel !== 'package-lock.json')
    .flatMap((rel) => {
      const bytes = fs.readFileSync(path.join(raiz, rel));
      // Every file that is text, whatever its name. A NUL byte in the first 8 KB means binary, as git decides it.
      if (bytes.subarray(0, 8192).includes(0)) return [];
      return revisarTexto(rel, bytes.toString('utf8'), extra);
    });
}

export function leerExtra(archivo = process.env.KIT_REVISAR_EXTRA) {
  if (!archivo) return [];
  const lista = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  if (!Array.isArray(lista) || lista.some((p) => typeof p !== 'string' || !p.trim())) {
    throw new Error('KIT_REVISAR_EXTRA tiene que ser un JSON con una lista de palabras');
  }
  return lista;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const hallazgos = revisar();
  if (hallazgos.length) {
    console.error(`Hay ${hallazgos.length} cosas que no pueden ser públicas:\n${hallazgos.join('\n')}`);
    process.exit(1);
  }
  console.log('Revisión limpia.');
}

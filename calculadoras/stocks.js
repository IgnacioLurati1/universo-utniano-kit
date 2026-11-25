// Gestión de stocks of Investigación Operativa, the models of the course notes with their notation (El Santo
// Resumen, investigacion-operativa/parcial-3.md, apunte de Gestión de Stocks, págs. 10 to 44): basic model,
// consumption during the entry, quantity discounts (one step and over the excess), common period, financial
// restriction with Lagrange and safety stock. Fields and formulas, the simulator's of El Santo Resumen
// (its simulator code, MODELOS_STOCK).

const raiz = Math.sqrt;

/** The economic lot Q* = √(2DL / Ci) and its cost per unit CT(Q) = C + L/Q + Ci·Q/2D (págs. 10 and 11). */
const lote = (D, L, Ci) => raiz((2 * D * L) / Ci);
const costoUnitario = (C, L, Ci, D) => (Q) => C + L / Q + (Ci * Q) / (2 * D);

export function basico({ D, L, C, i, LT }) {
  const Q = lote(D, L, C * i);
  const CT = costoUnitario(C, L, C * i, D);
  return { Q, fijos: L / Q, mantenimiento: (C * i * Q) / (2 * D), CT: CT(Q), T: Q / D, lotes: D / Q, PP: D * LT, curva: CT };
}

/** With consumption during the entry, M = Q(1 − D/V) and Q* = √(2DL / Ci(1 − D/V)) (págs. 16 and 17). */
export function ingreso({ D, V, L, C, i, LT }) {
  const factor = 1 - D / V;
  const Q = lote(D, L, C * i * factor);
  const CT = costoUnitario(C, L, C * i * factor, D);
  const M = Q * factor;
  return { factor, Q, M, theta: Q / V, fijos: L / Q, mantenimiento: (C * i * factor * Q) / (2 * D), CT: CT(Q), T: Q / D, promedio: M / 2, PP: D * LT, curva: CT };
}

/** One step: C₁ if Q < a, C₂ if Q ≥ a (págs. 18 and 19). If a ≤ Q₂*, the optimum is Q₂*; else CT₁(Q₁*) and CT₂(a). */
export function escalon({ D, L, i, C1, C2, a, LT }) {
  const Q1 = lote(D, L, C1 * i);
  const Q2 = lote(D, L, C2 * i);
  const CT1 = costoUnitario(C1, L, C1 * i, D);
  const CT2 = costoUnitario(C2, L, C2 * i, D);
  const base = { Q1, Q2, CT1, CT2, PP: D * LT };
  if (a <= Q2) return { ...base, caso: 'a-antes', Q: Q2, CT: CT2(Q2) };
  const c1 = CT1(Q1);
  const c2 = CT2(a);
  return { ...base, caso: 'comparar', ct1: c1, ct2: c2, Q: c2 <= c1 ? a : Q1, CT: Math.min(c1, c2) };
}

/**
 * Discount over the excess: C₂ only for what passes a, k = (C₁ − C₂)a and Q₂* = √(2D(L + k) / C₂i) (págs. 22 and
 * 23), with the notes' three step procedure.
 */
export function excedente({ D, L, i, C1, C2, a, LT }) {
  const k = (C1 - C2) * a;
  const Q1 = lote(D, L, C1 * i);
  const Q2 = raiz((2 * D * (L + k)) / (C2 * i));
  const CT1 = costoUnitario(C1, L, C1 * i, D);
  const CT2 = (Q) => C2 + (k * i) / (2 * D) + (L + k) / Q + (C2 * i * Q) / (2 * D);
  const base = { k, Q1, Q2, CT1, CT2, PP: D * LT };
  if (Q1 >= a) return { ...base, caso: 'q1-pasa', Q: Q2, CT: CT2(Q2) };
  if (Q2 <= a) return { ...base, caso: 'q2-no-llega', Q: Q1, CT: CT1(Q1) };
  const c1 = CT1(Q1);
  const c2 = CT2(Q2);
  return { ...base, caso: 'comparar', ct1: c1, ct2: c2, Q: c1 <= c2 ? Q1 : Q2, CT: Math.min(c1, c2) };
}

/** Common period: CT(T) = C + L/T + S·T/2 and T* = √(2L / S) (págs. 26 and 27), and the cost of a practical Tc. */
export function periodo({ C, L, S, Tc }) {
  const CT = (T) => C + L / T + (S * T) / 2;
  const T = raiz((2 * L) / S);
  return { T, CT: CT(T), fijos: L / T, mantenimiento: (S * T) / 2, CTc: CT(Tc), curva: CT };
}

/**
 * Financial restriction: Qⱼ = √(2DⱼLⱼ / Cⱼ(i + λ)) and the mean investment I = Σ CⱼQⱼ/2, which can't pass I₀ (págs. 30
 * to 33). `articulos`: [{ D, L, C }]. `pruebas`: the λ the student tries, as the notes' successive approximations.
 * `lambda`: the one where I = I₀, by halves, when the restriction is effective.
 */
export function financiera({ i, I0, articulos, pruebas = [] }) {
  const con = (lambda) => {
    const lotes = articulos.map(({ D, L, C }) => raiz((2 * D * L) / (C * (i + lambda))));
    return { lambda, lotes, I: lotes.reduce((s, Q, j) => s + (articulos[j].C * Q) / 2, 0) };
  };
  const libre = con(0);
  const efectiva = libre.I > I0;
  let lambda = 0;
  if (efectiva) {
    let lo = 0;
    let hi = 1;
    while (con(hi).I > I0 && hi < 1e9) hi *= 2;
    for (let k = 0; k < 200; k += 1) {
      const m = (lo + hi) / 2;
      if (con(m).I > I0) lo = m;
      else hi = m;
    }
    lambda = (lo + hi) / 2;
  }
  return { libre, efectiva, pruebas: pruebas.map(con), final: con(lambda), con };
}

/**
 * Safety stock with a constant lead time (págs. 38 to 40): D̄_LT = D̄·LT, S_DLT = √LT·S_D, SS = z·S_DLT and
 * PP = D̄_LT + SS. z comes from the table of pág. 49.
 */
export function seguridad({ media, desvio, LT, z }) {
  const mediaLT = media * LT;
  const desvioLT = raiz(LT) * desvio;
  const SS = z * desvioLT;
  return { mediaLT, desvioLT, SS, PP: mediaLT + SS };
}

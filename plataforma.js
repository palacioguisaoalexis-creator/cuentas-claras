/* Cuentas Claras — conexión con Firebase: inicio de sesión, base de datos, IA (Gemini) y descargas.
   La app (app.js) pide estas capacidades con window.claude.use(nombre); aquí se cumplen con Firebase. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-ai.js';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app-check.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDchcJkzpQZeEgfsrq-WPnX4-SD7dIsoto',
  authDomain: 'cuentas-claras-71e7c.firebaseapp.com',
  projectId: 'cuentas-claras-71e7c',
  storageBucket: 'cuentas-claras-71e7c.firebasestorage.app',
  messagingSenderId: '443900434508',
  appId: '1:443900434508:web:e30cc8f8f12d2fc88c7ce9'
};

const app = initializeApp(firebaseConfig);
/* App Check con Fraud Defense (reCAPTCHA Enterprise): demuestra que las llamadas a la IA vienen de esta página y no de un robot. */
const RECAPTCHA_SITE_KEY = '6LeWsvItAAAAADnCiAIs-ywkCU552rxlKRDV74ym';
let appCheck = null;
try { appCheck = initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true }); } catch (e) { console.error('App Check', e); }
const auth = getAuth(app);
auth.languageCode = 'es';
const fdb = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const ai = getAI(app, { backend: new GoogleAIBackend() });

const $ = s => document.querySelector(s);
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };

/* ---------- base de datos ---------- */
const DB = {
  collection: path => ({
    path,
    doc: id => ({ set: data => setDoc(doc(fdb, path, id), data), delete: () => deleteDoc(doc(fdb, path, id)) }),
    onSnapshot: (next, err) => onSnapshot(collection(fdb, path), { includeMetadataChanges: true }, snap => {
      next({ docChanges: () => snap.docChanges(), docs: snap.docs, empty: snap.empty, size: snap.size,
        metadata: { fromCache: snap.metadata.fromCache && snap.empty, hasPendingWrites: snap.metadata.hasPendingWrites } });
    }, e => err && err({ code: e.code === 'permission-denied' ? 'revoked' : 'unavailable', message: String(e.message || e) }))
  })
};
const USER = { id: async () => auth.currentUser?.uid || null, isOwner: async () => true, canEdit: async () => true, can: async () => true };

/* ---------- IA con Gemini (Firebase AI Logic, plan gratuito) ---------- */
const MODELOS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
function limpiar(t) {
  let s = String(t);
  const u = auth.currentUser;
  const palabras = [u?.displayName, (u?.email || '').split('@')[0]].filter(Boolean).flatMap(n => n.split(/[\s._-]+/)).filter(w => w.length >= 3);
  for (const w of palabras) s = s.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[nombre]');
  return s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[correo]')
    .replace(/\b\d{9,}\b/g, '[número]')
    .replace(/^.*\b(CR|CRA|KR|KRA|CL|CLL|CALLE|CARRERA|AV|AVENIDA|DG|DIAGONAL|TV|TRANSVERSAL)\b\.?\s*\d+.*$/gim, '[dirección]');
}
function aceptoIA() {
  if (ls.get('cc-ia-ok') === '1') return true;
  const ok = window.confirm('El asistente con IA usa Gemini de Google (plan gratuito).\n\nAntes de enviar, quitamos tu nombre, tu correo, direcciones y números largos. Aun así, Google puede usar lo que se le envía para mejorar sus productos.\n\n¿Quieres usarlo?');
  if (ok) ls.set('cc-ia-ok', '1');
  return ok;
}
const aB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });
async function contenidos(input, imagenes) {
  const turns = typeof input === 'string' ? [{ role: 'user', content: input }] : input;
  const out = [];
  for (const t of turns) {
    const role = t.role === 'assistant' ? 'model' : 'user';
    const text = limpiar(t.content);
    if (out.length && out[out.length - 1].role === role) out[out.length - 1].parts.push({ text });
    else out.push({ role, parts: [{ text }] });
  }
  if (imagenes && imagenes.length) {
    const last = out[out.length - 1];
    for (const f of Array.from(imagenes)) last.parts.push({ inlineData: { mimeType: f.type || 'image/jpeg', data: await aB64(f) } });
  }
  return out;
}
function tipoError(e) {
  const m = String(e?.message || e) + ' ' + String(e?.code || '') + ' ' + JSON.stringify(e?.customErrorData || {});
  if (/app.?check|attestation|401|UNAUTHENTICATED/i.test(m)) return 'appcheck';
  if (/SERVICE_DISABLED|API has not been used|firebasevertexai|generativelanguage|ai logic/i.test(m)) return 'sampling_disabled';
  if (/429|RESOURCE_EXHAUSTED|quota|rate/i.test(m)) return 'rate_limited';
  if (/404|NOT_FOUND|not found|is not supported|unsupported model/i.test(m)) return 'modelo';
  if (/403|PERMISSION_DENIED|has not been used|disabled|API key/i.test(m)) return 'sampling_disabled';
  return 'upstream_error';
}
async function SAMPLE(input, opts = {}) {
  if (!aceptoIA()) throw { code: 'not_granted', message: 'El usuario no aceptó usar la IA.' };
  if (appCheck) { try { await getToken(appCheck, false); } catch (e) { console.error('App Check token', e); throw { code: 'appcheck', message: 'No se obtuvo el certificado App Check: ' + String(e?.message || e).slice(0, 220) }; } }
  else throw { code: 'appcheck', message: 'App Check no se inició en esta página.' };
  const contents = await contenidos(input, opts.images);
  const pref = ls.get('cc-modelo');
  const orden = pref ? [pref, ...MODELOS.filter(m => m !== pref)] : MODELOS;
  let ultimo;
  for (const nombre of orden) {
    let text = '';
    try {
      const model = getGenerativeModel(ai, { model: nombre });
      const res = await model.generateContentStream({ contents });
      for await (const ch of res.stream) {
        if (opts.signal?.aborted) throw { code: 'cancelled', text };
        let d = ''; try { d = ch.text(); } catch (e) {}
        if (!d) continue;
        text += d;
        opts.onText && opts.onText({ text, delta: d });
      }
      if (!text.trim()) throw { code: 'empty_completion' };
      ls.set('cc-modelo', nombre);
      return { text, truncated: false, modelTierApplied: 'default' };
    } catch (e) {
      if (e && e.code && !String(e.code).includes('/')) throw e;
      const t = tipoError(e); ultimo = e;
      if (t === 'modelo') continue;
      console.error('Gemini', nombre, e);
      throw { code: t, message: String(e?.message || e).slice(0, 300), text: text || undefined };
    }
  }
  throw { code: 'upstream_error', message: String(ultimo?.message || 'Sin modelo disponible') };
}
SAMPLE.json = async (input, opts = {}) => {
  const inp = typeof input === 'string' ? input + '\n\nResponde únicamente con JSON válido, sin texto antes ni después.' : input;
  const { text } = await SAMPLE(inp, opts);
  let s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(s); } catch (e) {}
  const a = s.search(/[\[{]/), b = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch (e) {} }
  throw { code: 'invalid_json', message: 'Respuesta no es JSON', text };
};
SAMPLE.limits = async () => ({ maxPromptBytes: 262144, images: { maxCount: 6, maxInputBytes: 15e6, mediaTypes: ['image/jpeg', 'image/png', 'image/webp'] } });

/* ---------- descargas ---------- */
const MIME = { xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv', json: 'application/json', pdf: 'application/pdf' };
const DL = { save: async ({ filename, data }) => {
  const ext = String(filename).split('.').pop().toLowerCase();
  const blob = data instanceof Blob ? data : new Blob([data], { type: MIME[ext] || 'application/octet-stream' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { status: 'saved' };
} };

window.claude = { use: async name => ({ db: DB, user: USER, sample: SAMPLE, downloads: DL })[name] || null };

/* ---------- inicio de sesión ---------- */
const msg = (t, bad) => { const el = $('#lgMsg'); el.textContent = t; el.className = 'lg-msg' + (bad ? ' bad' : ''); el.hidden = !t; };
const urlBase = () => location.origin + location.pathname;
function errAuth(e) {
  const c = e?.code || '';
  if (c.includes('popup-closed') || c.includes('cancelled-popup')) return '';
  if (c.includes('unauthorized-domain')) return 'Este sitio todavía no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).';
  if (c.includes('operation-not-allowed')) return 'Este método de inicio de sesión no está activado en Firebase.';
  if (c.includes('invalid-email')) return 'Revisa el correo: parece que está mal escrito.';
  if (c.includes('invalid-action-code') || c.includes('expired')) return 'El enlace ya se usó o venció. Pide uno nuevo.';
  if (c.includes('network')) return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  if (c.includes('too-many-requests')) return 'Demasiados intentos. Espera unos minutos.';
  return 'No se pudo iniciar sesión. Intenta de nuevo.';
}
$('#lgGoogle').onclick = async () => {
  msg('');
  const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, p); }
  catch (e) {
    if ((e?.code || '').includes('popup-blocked') || (e?.code || '').includes('operation-not-supported')) { try { await signInWithRedirect(auth, p); return; } catch (e2) { e = e2; } }
    const t = errAuth(e); if (t) msg(t, true);
  }
};
$('#lgForm').onsubmit = async ev => {
  ev.preventDefault();
  const email = $('#lgEmail').value.trim(); if (!email) return;
  const b = $('#lgSend'); b.disabled = true; b.textContent = 'Enviando…';
  try {
    await sendSignInLinkToEmail(auth, email, { url: urlBase(), handleCodeInApp: true });
    ls.set('cc-email', email);
    msg(`Listo. Te enviamos un enlace a ${email}. Ábrelo desde este mismo celular o computador para entrar. Si no lo ves, revisa la carpeta de spam.`);
  } catch (e) { msg(errAuth(e), true); }
  finally { b.disabled = false; b.textContent = 'Enviarme el enlace'; }
};
async function completarEnlace() {
  if (!isSignInWithEmailLink(auth, location.href)) return;
  let email = ls.get('cc-email');
  if (!email) {
    $('#lgLinkBox').hidden = false;
    msg('Para terminar, escribe el correo al que te llegó el enlace.');
    await new Promise(res => { $('#lgLinkForm').onsubmit = ev => { ev.preventDefault(); email = $('#lgLinkEmail').value.trim(); if (email) res(); }; });
  }
  try { await signInWithEmailLink(auth, email, location.href); ls.del('cc-email'); history.replaceState(null, '', urlBase()); }
  catch (e) { msg(errAuth(e), true); }
}

let appCargada = false, uidActual = null;
function cargarApp() {
  if (appCargada) return; appCargada = true;
  const s = document.createElement('script'); s.src = 'app.js?v=' + (document.documentElement.dataset.v || '1'); document.body.appendChild(s);
  const top = document.querySelector('.top');
  if (top && !$('#ccSalir')) {
    const b = document.createElement('button'); b.id = 'ccSalir'; b.className = 'btn ghost sm'; b.type = 'button'; b.textContent = 'Salir';
    b.title = auth.currentUser?.email || ''; b.onclick = async () => { await signOut(auth); location.replace(urlBase()); };
    top.appendChild(b);
  }
}
onAuthStateChanged(auth, user => {
  $('#cargando').hidden = true;
  if (user) {
    if (uidActual && uidActual !== user.uid) { location.reload(); return; }
    uidActual = user.uid;
    $('#login').hidden = true; $('#appRoot').hidden = false;
    cargarApp();
  } else {
    if (appCargada) { location.replace(urlBase()); return; }
    $('#appRoot').hidden = true; $('#login').hidden = false;
  }
});
completarEnlace();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

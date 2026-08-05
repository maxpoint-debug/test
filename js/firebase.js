// ===================== FIREBASE MODULE =====================
// ES module — corre despues de que los scripts regulares definieron window.FB.
// Sobreescribe los metodos de window.FB con las funciones reales de Firestore.

import { initializeApp }    from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDocs,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app = initializeApp({
  apiKey:            'AIzaSyCw76jqobNfGKt4aH7ygv4iVz9ZAHxTiko',
  authDomain:        'maxpoint-taller.firebaseapp.com',
  projectId:         'maxpoint-taller',
  storageBucket:     'maxpoint-taller.firebasestorage.app',
  messagingSenderId: '591043101786',
  appId:             '1:591043101786:web:b18f78627738a22d008463',
});

const db  = getFirestore(app);
const cR   = collection(db, 'reparaciones');
const cRp  = collection(db, 'repuestos');
const cCat = collection(db, 'catalogo');
const cUsa = collection(db, 'usados');
const cVen = collection(db, 'ventas');
const cSt  = collection(db, 'stock');
const dCfg  = doc(db, 'config', 'catalogo');
const dCom  = doc(db, 'config', 'comisiones');

// V2.1 — entidades base. Conviven con las colecciones actuales.
const cCli = collection(db, 'clientes');
const cEq  = collection(db, 'equipos');
const cMov = collection(db, 'movimientos');

function normKey(v) {
  return String(v || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}
function phoneKey(v) { return String(v || '').replace(/\D/g, ''); }
function safeId(prefix, key) { return prefix + '_' + (key || Math.random().toString(36).slice(2, 12)).slice(0, 80); }

async function v21Cliente(data) {
  const tel = phoneKey(data.telefono);
  const key = tel || normKey(data.nombre);
  if (!key) return null;
  const id = safeId('cli', key);
  await setDoc(doc(db, 'clientes', id), {
    nombre: data.nombre || '', telefono: data.telefono || '', dni: data.dni || '',
    direccion: data.direccion || '', email: data.email || '',
    updatedAt: serverTimestamp()
  }, { merge: true });
  return id;
}

async function v21Equipo(data, origen, origenId, clienteId) {
  const imei = normKey(data.imei);
  const key = imei || normKey(origen + '_' + origenId);
  if (!key) return null;
  const id = safeId('eq', key);
  await setDoc(doc(db, 'equipos', id), {
    imei: data.imei || '', modelo: data.modelo || data.equipo || '', capacidad: data.capacidad || '',
    color: data.color || '', estadoActual: data.estado || '', origen: origen, origenId: origenId,
    clienteId: clienteId || '', updatedAt: serverTimestamp()
  }, { merge: true });
  return id;
}

async function v21Movimiento(tipo, origen, origenId, data, extra) {
  await addDoc(cMov, {
    tipo: tipo, origen: origen, origenId: origenId,
    clienteId: (extra && extra.clienteId) || '', equipoId: (extra && extra.equipoId) || '',
    estado: data.estado || '', detalle: (extra && extra.detalle) || '',
    fecha: serverTimestamp()
  });
}

async function v21Sync(origen, origenId, data, tipo, extra) {
  try {
    // Updates parciales (ej. solo estado/pago) no deben borrar relaciones existentes.
    const tieneIdentidad = !!(data.nombre || data.telefono || data.imei || data.modelo || data.equipo);
    let clienteId = null, equipoId = null;
    if (tieneIdentidad) {
      clienteId = await v21Cliente(data);
      equipoId = await v21Equipo(data, origen, origenId, clienteId);
      const col = origen === 'reparacion' ? 'reparaciones' : (origen === 'venta' ? 'ventas' : 'stock');
      const links = { _v2: 1 };
      if (clienteId) links.clienteId = clienteId;
      if (equipoId) links.equipoId = equipoId;
      await updateDoc(doc(db, col, origenId), links);
    }
    await v21Movimiento(tipo, origen, origenId, data, { clienteId, equipoId, detalle: extra && extra.detalle });
  } catch (e) {
    // V2.1 nunca debe impedir la operacion principal de V1.
    console.warn('MaxPoint V2.1 sync:', e);
  }
}


// --- Sobreescribir FB con funciones reales ---
window.FB.add = (d, cb) => addDoc(cR, { ...d, _ts: serverTimestamp() })
  .then(ref => { cb(null); v21Sync('reparacion', ref.id, d, 'reparacion_creada'); })
  .catch(e => cb(e.message));
// Importacion historica queda intacta: no migra masivamente datos a V2.1.
window.FB.addId = (id, d, cb) => setDoc(doc(db, 'reparaciones', id), { ...d, _ts: serverTimestamp() })
  .then(() => cb(null)).catch(e => cb(e.message));
window.FB.upd = (id, d, cb) => updateDoc(doc(db, 'reparaciones', id), { ...d, _upd: serverTimestamp() })
  .then(() => { cb(null); v21Sync('reparacion', id, d, 'reparacion_actualizada'); })
  .catch(e => cb(e.message));
window.FB.del   = (id, cb)     => deleteDoc(doc(db, 'reparaciones', id)).then(() => cb(null)).catch(e => cb(e.message));
window.FB.addR  = (d, cb)      => addDoc(cRp, { ...d, _ts: serverTimestamp() }).then(() => cb(null)).catch(e => cb(e.message));
window.FB.updR  = (id, d, cb)  => updateDoc(doc(db, 'repuestos', id), { ...d, _upd: serverTimestamp() }).then(() => cb(null)).catch(e => cb(e.message));
window.FB.delR    = (id, cb)     => deleteDoc(doc(db, 'repuestos', id)).then(() => cb(null)).catch(e => cb(e.message));

// --- Catalogo y config ---
window.FB.setConfig = (d, cb) => setDoc(dCfg, d).then(() => cb(null)).catch(e => cb(e.message));

window.FB.setCat = async (items, cb) => {
  try {
    // 1. Backup: guardar config con timestamp de ultima actualizacion
    const snap = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const { getDocs, writeBatch } = snap;
    const batch1 = writeBatch(db);
    // Borrar catalogo viejo
    const oldDocs = await getDocs(cCat);
    oldDocs.forEach(d => batch1.delete(d.ref));
    await batch1.commit();
    // Subir nuevo catalogo en batches de 400
    const chunkSize = 400;
    for (let i = 0; i < items.length; i += chunkSize) {
      const batch2 = writeBatch(db);
      items.slice(i, i + chunkSize).forEach(item => {
        batch2.set(doc(cCat), item);
      });
      await batch2.commit();
    }
    cb(null);
  } catch(e) { cb(e.message); }
};

// --- Listener reparaciones ---
onSnapshot(
  query(cR, orderBy('_ts', 'asc')),
  (snap) => {
    window.REPS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
    updSidebar();
    syncOk();
    // Si el modal de detalle esta abierto, refrescarlo con datos nuevos
    if (window._detId && document.getElementById('mDet').classList.contains('open')) {
      _renderDet();
    }
  },
  (err) => syncErr('Firestore error: ' + err.message)
);

// --- Listener repuestos ---
onSnapshot(query(cRp, orderBy('_ts','asc')), (snap) => {
  window.RPUS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (window.VIEW === 'rpus') render();
  if (typeof updSidebar === 'function') updSidebar();
}, () => {});

// --- Listener ventas ---
onSnapshot(query(cVen, orderBy('fecha','desc')), (snap) => {
  window.VENTAS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (window.VIEW === 'ven') render();
  if (typeof actualizarBadgeSeg === 'function') actualizarBadgeSeg();
}, () => {});

// --- Listener stock ---
onSnapshot(query(cSt, orderBy('fecha','desc')), (snap) => {
  window.STOCK = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (window.VIEW === 'stock') render();
}, () => {});

// --- Listener usados ---
onSnapshot(cUsa, (snap) => {
  window.USADOS = snap.docs.map(d => d.data());
  if (typeof cotLoadUsados === 'function') cotLoadUsados(window.USADOS);
}, () => {});

// --- Listener catalogo ---
onSnapshot(cCat, (snap) => {
  window.CATALOGO = snap.docs.map(d => d.data());
}, () => {});

// --- Listener config comisiones ---
onSnapshot(dCom, (snap) => {
  if (snap.exists() && typeof comLoadCfg === 'function') comLoadCfg(snap.data());
}, () => {});

// --- Listener config catalogo ---
onSnapshot(dCfg, (snap) => {
  if (snap.exists() && typeof catLoadConfig === 'function') catLoadConfig(snap.data());
}, () => {});

// ── Config comisiones ──
window.FB.setComCfg = (d, cb) => setDoc(dCom, d).then(()=>cb(null)).catch(e=>cb(e.message));

// ── CRUD ventas ──
window.FB.addV = (d, cb) => addDoc(cVen, { ...d, _ts: serverTimestamp() })
  .then(ref => { cb(null); v21Sync('venta', ref.id, d, 'venta_creada'); })
  .catch(e => cb(e.message));
window.FB.updV = (id, d, cb) => updateDoc(doc(cVen,id), { ...d, _upd: serverTimestamp() })
  .then(() => { cb(null); v21Sync('venta', id, d, 'venta_actualizada'); })
  .catch(e => cb(e.message));
window.FB.delV  = (id, cb)     => deleteDoc(doc(cVen,id)).then(()=>cb(null)).catch(e=>cb(e.message));

// ── CRUD stock ──
window.FB.addSt = (d, cb) => addDoc(cSt, { ...d, _ts: serverTimestamp() })
  .then(ref => { cb(null); v21Sync('stock', ref.id, d, 'stock_creado'); })
  .catch(e => cb(e.message));
window.FB.updSt = (id, d, cb) => updateDoc(doc(cSt,id), { ...d, _upd: serverTimestamp() })
  .then(() => { cb(null); v21Sync('stock', id, d, 'stock_actualizado'); })
  .catch(e => cb(e.message));
window.FB.delSt = (id, cb)     => deleteDoc(doc(cSt,id)).then(()=>cb(null)).catch(e=>cb(e.message));

// ── setUsados ──
window.FB.setUsados = async (items, cb) => {
  try {
    const old = await getDocs(cUsa);
    const b1 = writeBatch(db); old.docs.forEach(d => b1.delete(d.ref)); await b1.commit();
    const b2 = writeBatch(db);
    items.forEach(u => { const r = doc(cUsa, u.modelo.replace(/[^a-zA-Z0-9]/g,'_')); b2.set(r, u); });
    await b2.commit(); cb(null);
  } catch(e) { cb(e.message); }
};

// ── setCat ──

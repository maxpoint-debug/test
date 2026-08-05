// ===================== HELPERS PUROS =====================
// Sin efectos secundarios. Fácil de testear.

// --- Strings ---
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Fechas ---
function hoy() {
  return new Date().toLocaleDateString('es-AR');
}
function horaActual() {
  return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// --- Números ---
function pesos(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR');
}

// --- Badges HTML ---
var BADGE_ESTADO = {
  'Ingresado':   'b-ingresado',
  'En proceso':  'b-proceso',
  'Listo':       'b-listo',
  'Entregado':   'b-entregado',
  'No aprobado': 'b-noaprobado',
  'Garantia':    'b-garantia',
};
var BADGE_RPU = {
  'Esperando':  'b-esperando',
  'Encargado':  'b-encargado',
  'Llego':      'b-llego',
  'Usado':      'b-usado',
};
var BADGE_PAGO = {
  'Pendiente': 'b-pendiente',
  'Parcial':   'b-parcial',
  'Pagado':    'b-pagado',
};
var COLOR_ESTADO = {
  'Ingresado':   'var(--bl)',
  'En proceso':  'var(--or)',
  'Listo':       'var(--gr)',
  'Entregado':   'var(--mu)',
  'No aprobado': 'var(--rd)',
  'Garantia':    'var(--pu)',
};

function badgeEst(e) {
  var cls = BADGE_ESTADO[e] || 'b-ingresado';
  return '<span class="badge ' + cls + '">' + esc(e || 'Ingresado') + '</span>';
}
function badgePag(p) {
  var cls = BADGE_PAGO[p] || 'b-pendiente';
  return '<span class="badge ' + cls + '">' + esc(p || 'Pendiente') + '</span>';
}
function colorEst(e) {
  return COLOR_ESTADO[e] || 'var(--mu)';
}

// --- Orden siguiente ---
function nextOrden() {
  if (!REPS.length) return '#0001';
  var nums = REPS.map(function(r) {
    return parseInt((r.orden || '#0').replace(/[^0-9]/g, '')) || 0;
  });
  return '#' + String(Math.max.apply(null, nums) + 1).padStart(4, '0');
}

// --- Detección de repuesto sugerido ---
function detectarRepuesto(falla, equipo) {
  var f = (falla || '').toLowerCase();
  for (var i = 0; i < REGLAS_REPUESTO.length; i++) {
    var regla = REGLAS_REPUESTO[i];
    var match = regla.palabras.some(function(p) { return f.includes(p); });
    if (match) {
      return { nombre: regla.rep + (equipo ? ' — ' + equipo : ''), equipo: equipo };
    }
  }
  return null;
}

// --- DOM helpers ---
function mkBtn(clases, texto, handler) {
  var b = document.createElement('button');
  b.className = 'btn ' + clases;
  b.textContent = texto;
  b.addEventListener('click', handler);
  return b;
}
function mkBadge(cls, texto) {
  var s = document.createElement('span');
  s.className = 'badge ' + cls;
  s.textContent = texto;
  return s;
}
function el(id) {
  return document.getElementById(id);
}
function val(id) {
  var e = el(id);
  return e ? e.value.trim() : '';
}
function setVal(id, v) {
  var e = el(id);
  if (e) e.value = v || '';
}

// --- Toast ---
function toast(msg, color) {
  var t = el('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.borderLeftColor = color || 'var(--gr)';
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2800);
}

// --- Modales ---
function openM(id)  { el(id).classList.add('open'); }
function closeM(id) { el(id).classList.remove('open'); }

// --- Sync bar ---
function syncOk(msg) {
  var b = el('syncbar');
  b.className = 'syncbar ok';
  el('syncmsg').textContent = msg || 'Sincronizado';
  setTimeout(function() { b.style.display = 'none'; }, 3000);
}
function syncErr(msg) {
  var b = el('syncbar');
  b.className = 'syncbar err';
  b.style.display = 'flex';
  el('syncmsg').textContent = msg || 'Error de conexion';
}
function syncLoad(msg) {
  var b = el('syncbar');
  b.className = 'syncbar load';
  b.style.display = 'flex';
  el('syncmsg').textContent = msg || 'Procesando...';
}

// --- Sidebar counters ---
function updSidebar() {
  var listos    = REPS.filter(function(r) { return r.estado === 'Listo'; }).length;
  var esperando = RPUS.filter(function(r) { return r.estado === 'Esperando'; }).length;

  var nb1 = el('nb-l'), nb2 = el('nb-r');
  if (nb1) { nb1.textContent = listos;    nb1.style.display = listos    ? '' : 'none'; }
  if (nb2) { nb2.textContent = esperando; nb2.style.display = esperando ? '' : 'none'; }

  var s1 = el('sb1'), s2 = el('sb2'), s3 = el('sb3');
  if (s1) s1.textContent = REPS.length.toLocaleString();
  if (s2) s2.textContent = listos;
  if (s3) s3.textContent = esperando;
}

// --- CSV Export ---
function expCSV() {
  var cols = ['orden','fecha','nombre','telefono','equipo','modelo','falla','presupuesto','sena','estado','pago','tecnico'];
  var nl   = '\n';
  var rows = getFiltrados().map(function(r) {
    return cols.map(function(c) {
      return '"' + String(r[c] || '').replace(/"/g, '""') + '"';
    }).join(',');
  });
  var csv  = cols.join(',') + nl + rows.join(nl);
  var a    = document.createElement('a');
  a.href   = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'maxpoint-reps.csv';
  a.click();
  toast('CSV exportado');
}

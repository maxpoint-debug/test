// ===================== COMISIONES =====================
// Tecnicos/vendedores, comisiones mensuales, garantias

// ── Config (se guarda en Firebase config/comisiones) ─
var COM_CFG = {
  tecnicos:      [],       // [{ id, nombre, activo }]
  com_rep:       5000,     // $ por reparacion
  com_ven:       10000,    // $ por venta
};

function comLoadCfg(data) {
  if (!data) return;
  if (data.tecnicos)  COM_CFG.tecnicos  = data.tecnicos;
  if (data.com_rep)   COM_CFG.com_rep   = data.com_rep;
  if (data.com_ven)   COM_CFG.com_ven   = data.com_ven;
}

// ── Guardar config ────────────────────────────────────
function comGuardarCfg(cb) {
  FB.setComCfg(COM_CFG, cb || function() {});
}

// ── Modal gestión de técnicos ─────────────────────────
function openGestionTecnicos() {
  comRenderTecnicos();
  openM('mTecnicos');
}

function comRenderTecnicos() {
  var wrap = el('tecListaWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  COM_CFG.tecnicos.forEach(function(t, i) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--bd)';
    row.innerHTML = '<input type="text" value="' + esc(t.nombre) + '" data-i="' + i + '"'
      + ' style="flex:1;background:var(--s2);border:1px solid var(--bd);border-radius:6px;padding:6px 10px;color:var(--tx);font-size:13px;outline:none"'
      + ' onchange="comEditarNombre(this)"/>'
      + '<label style="font-size:11px;color:var(--mu);display:flex;align-items:center;gap:4px;cursor:pointer">'
      + '<input type="checkbox" data-i="' + i + '" onchange="comToggleActivo(this)"' + (t.activo !== false ? ' checked' : '') + '/> Activo</label>'
      + '<button data-i="' + i + '" onclick="comEliminar(this.dataset.i)"'
      + ' style="background:none;border:none;color:var(--mu);cursor:pointer;font-size:16px;padding:0 4px">&#10006;</button>';
    wrap.appendChild(row);
  });
}

function comAgregarTecnico() {
  var nom = el('tecNuevoNom').value.trim();
  if (!nom) return;
  COM_CFG.tecnicos.push({ id: 'tec_' + Date.now(), nombre: nom, activo: true });
  el('tecNuevoNom').value = '';
  comRenderTecnicos();
}

function comEditarNombre(input) {
  var i = parseInt(input.dataset.i);
  COM_CFG.tecnicos[i].nombre = input.value.trim();
}

function comToggleActivo(chk) {
  var i = parseInt(chk.dataset.i);
  COM_CFG.tecnicos[i].activo = chk.checked;
}

function comEliminar(i) {
  COM_CFG.tecnicos.splice(parseInt(i), 1);
  comRenderTecnicos();
}

function comGuardarTecnicos() {
  comGuardarCfg(function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    toast('Tecnicos guardados');
    closeM('mTecnicos');
  });
}

// ── Lista de tecnicos activos para selects ────────────
function comOpcionesTecnicos(seleccionado) {
  var opts = '<option value="">— Sin asignar —</option>';
  COM_CFG.tecnicos.filter(function(t){ return t.activo !== false; }).forEach(function(t) {
    opts += '<option value="' + esc(t.nombre) + '"' + (t.nombre === seleccionado ? ' selected' : '') + '>' + esc(t.nombre) + '</option>';
  });
  return opts;
}

// ── Marcar reparacion como garantia ──────────────────
function marcarGarantia(id) {
  var r = REPS.find(function(x) { return x.id === id; });
  if (!r) return;
  var esGar = r.es_garantia === 'si';
  var nuevo = esGar ? 'no' : 'si';
  FB.upd(id, { es_garantia: nuevo }, function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    toast(nuevo === 'si' ? 'Marcada como garantia' : 'Garantia removida');
  });
}

// ── Calcular comisiones por mes ───────────────────────
function calcComisiones(mesKey) {
  // mesKey = 'YYYY-MM' o null para mes actual
  if (!mesKey) {
    var hoy = new Date();
    var m = String(hoy.getMonth()+1).padStart(2,'0');
    mesKey = hoy.getFullYear() + '-' + m;
  }

  var resultado = {};
  COM_CFG.tecnicos.forEach(function(t) {
    resultado[t.nombre] = { reps: 0, gar: 0, ven: 0, com_rep: 0, com_ven: 0, total: 0 };
  });

  // Reparaciones del mes — solo Pagadas o Entregadas
  (window.REPS || []).forEach(function(r) {
    if (!r.tecnico || !r.fecha) return;
    var k = fechaAMesKey(r.fecha);
    if (k !== mesKey) return;
    // Solo contar si fue cobrada o entregada
    var conta = r.pago === 'Pagado' || r.estado === 'Entregado';
    if (!conta) return;
    if (r.gremio === 'si') return; // gremio no cuenta comision
    if (!resultado[r.tecnico]) resultado[r.tecnico] = { reps:0, gar:0, ven:0, com_rep:0, com_ven:0, total:0 };
    if (r.es_garantia === 'si') {
      resultado[r.tecnico].gar++;
    } else {
      resultado[r.tecnico].reps++;
      resultado[r.tecnico].com_rep += COM_CFG.com_rep;
    }
  });

  // Ventas del mes
  (window.VENTAS || []).forEach(function(v) {
    if (!v.vendedor || !v.fecha) return;
    var k = fechaAMesKey(v.fecha);
    if (k !== mesKey) return;
    if (!resultado[v.vendedor]) resultado[v.vendedor] = { reps:0, gar:0, ven:0, com_rep:0, com_ven:0, total:0 };
    resultado[v.vendedor].ven++;
    resultado[v.vendedor].com_ven += COM_CFG.com_ven;
  });

  // Total
  Object.keys(resultado).forEach(function(nom) {
    var d = resultado[nom];
    d.total = d.com_rep + d.com_ven;
  });

  return resultado;
}

function fechaAMesKey(fechaStr) {
  if (!fechaStr) return '';
  // DD/MM/YYYY → YYYY-MM
  if (fechaStr.includes('/')) {
    var p = fechaStr.split('/');
    return p[2] + '-' + p[1];
  }
  // YYYY-MM-DD → YYYY-MM
  return fechaStr.slice(0, 7);
}

// ── Meses disponibles ─────────────────────────────────
function calcMesesDisponibles() {
  var meses = {};
  (window.REPS || []).forEach(function(r) {
    if (r.fecha) meses[fechaAMesKey(r.fecha)] = true;
  });
  (window.VENTAS || []).forEach(function(v) {
    if (v.fecha) meses[fechaAMesKey(v.fecha)] = true;
  });
  return Object.keys(meses).filter(Boolean).sort().reverse();
}

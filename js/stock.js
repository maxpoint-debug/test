// ===================== STOCK DE EQUIPOS =====================

// ── Formulario nuevo equipo ───────────────────────────────
var _stockId = null;

function openNewStock(prefill) {
  _stockId = null;
  el('mStockT').textContent = 'Agregar equipo';
  ['sMod','sCap','sCol','sDet','sPrecioVenta','sPrecioCosto','sNot','sImei'].forEach(function(id) {
    setVal(id, '');
  });
  el('sEst').value = 'A revisar';
  // Prefill desde parte de pago
  if (prefill) {
    setVal('sMod',  prefill.modelo  || '');
    setVal('sImei', prefill.imei   || '');
    setVal('sPrecioCosto', prefill.valor || '');
    el('sEst').value = 'A revisar';
  }
  el('btnSaveStock').disabled = false;
  el('btnSaveStock').textContent = 'Guardar';
  openM('mStock');
}

function openEditStock(id) {
  var s = STOCK.find(function(x) { return x.id === id; });
  if (!s) return;
  _stockId = id;
  el('mStockT').textContent = 'Editar equipo';
  setVal('sMod',         s.modelo        || '');
  setVal('sCap',         s.capacidad     || '');
  setVal('sCol',         s.color         || '');
  setVal('sDet',         s.detalles      || '');
  setVal('sImei',        s.imei          || '');
  setVal('sPrecioVenta', s.precio_venta  || '');
  setVal('sPrecioCosto', s.precio_costo  || '');
  setVal('sNot',         s.notas         || '');
  el('sEst').value = s.estado || 'A revisar';
  el('btnSaveStock').disabled = false;
  el('btnSaveStock').textContent = 'Guardar';
  openM('mStock');
}

function saveStock() {
  var mod = val('sMod');
  if (!mod) { alert('El modelo es obligatorio.'); return; }
  var btn = el('btnSaveStock');
  btn.disabled = true; btn.textContent = 'Guardando...';

  var d = {
    modelo:       mod,
    capacidad:    val('sCap'),
    color:        val('sCol'),
    detalles:     val('sDet'),
    imei:         val('sImei'),
    precio_venta: val('sPrecioVenta'),
    precio_costo: val('sPrecioCosto'),
    notas:        val('sNot'),
    estado:       el('sEst').value,
    fecha:        hoy(),
  };

  if (_stockId) {
    FB.updSt(_stockId, d, function(err) {
      btn.disabled = false; btn.textContent = 'Guardar';
      if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
      closeM('mStock'); toast('Equipo actualizado');
    });
  } else {
    FB.addSt(d, function(err) {
      btn.disabled = false; btn.textContent = 'Guardar';
      if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
      closeM('mStock'); toast('Equipo agregado al stock');
    });
  }
}

function eliminarStock(id) {
  if (!confirm('Eliminar este equipo del stock?')) return;
  FB.delSt(id, function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    toast('Eliminado', 'var(--rd)');
  });
}

function cambiarEstadoStock(id, nuevoEst) {
  FB.updSt(id, { estado: nuevoEst }, function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    toast('Estado: ' + nuevoEst);
  });
}

// ── Lista para WhatsApp ───────────────────────────────────
function copiarListaStock() {
  var disponibles = STOCK.filter(function(s) { return s.estado === 'Disponible'; });
  if (!disponibles.length) { toast('No hay equipos disponibles', 'var(--rd)'); return; }

  var lineas = disponibles.map(function(s) {
    var label = [s.modelo, s.capacidad, s.color].filter(Boolean).join(' ');
    var precio = s.precio_venta ? ' — $' + Number(s.precio_venta).toLocaleString('es-AR') : '';
    var det = s.detalles ? ' (' + s.detalles + ')' : '';
    return '📱 ' + label + det + precio;
  }).join('\n');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(lineas).then(function() {
      toast('Lista copiada — ' + disponibles.length + ' equipos');
    }).catch(function() { stockFallbackCopy(lineas); });
  } else {
    stockFallbackCopy(lineas);
  }
}

function stockFallbackCopy(texto) {
  var ta = document.createElement('textarea');
  ta.value = texto;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast('Lista copiada'); }
  catch(e) { toast('Error al copiar', 'var(--rd)'); }
  document.body.removeChild(ta);
}

// ── Badges de estado ─────────────────────────────────────
function badgeStock(estado) {
  var map = {
    'A revisar':    { bg: 'rgba(167,139,250,.12)', color: 'var(--pu)', bd: 'rgba(167,139,250,.3)' },
    'En reparacion':{ bg: 'rgba(240,180,41,.12)',  color: 'var(--acc)',bd: 'rgba(240,180,41,.3)'  },
    'Disponible':   { bg: 'rgba(45,206,137,.12)',  color: 'var(--gr)', bd: 'rgba(45,206,137,.3)'  },
    'Reservado':    { bg: 'rgba(78,154,241,.12)',   color: 'var(--bl)', bd: 'rgba(78,154,241,.3)'  },
    'Prestado':     { bg: 'rgba(240,100,41,.12)',   color: 'var(--or)', bd: 'rgba(240,100,41,.3)'  },
    'Vendido':      { bg: 'rgba(122,122,138,.08)',  color: 'var(--mu)', bd: 'var(--bd)'             },
  };
  var st = map[estado] || map['A revisar'];
  return '<span style="background:' + st.bg + ';color:' + st.color + ';border:1px solid ' + st.bd + ';border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700">' + (estado||'A revisar') + '</span>';
}

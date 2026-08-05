// ===================== SEGUIMIENTOS =====================
// Post-reparacion (60d), post-venta (90d y 365d)
// Estadisticas: podio clientes, modelos mas vendidos

var SEG_DESC = 10; // % descuento configurable

// ── Calcular dias entre fecha y hoy ──────────────────
function diasDesde(fechaStr) {
  if (!fechaStr) return null;
  // Soporta DD/MM/YYYY y YYYY-MM-DD
  var parts = fechaStr.includes('/') ? fechaStr.split('/').reverse() : fechaStr.split('-');
  var d = new Date(parts[0], parts[1]-1, parts[2]);
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  return Math.floor((hoy - d) / 86400000);
}

// ── Generar lista de seguimientos ────────────────────
function calcSeguimientos() {
  var lista = [];

  // Post-reparacion: dia 60
  (window.REPS || []).forEach(function(r) {
    if (!r.nombre || !r.telefono) return;
    var dias = diasDesde(r.fecha);
    if (dias === null) return;
    if (dias >= 55 && dias <= 120) { // ventana 55-120 dias
      var estado = (r.seg_est || 'pendiente');
      lista.push({
        id:       'rep_' + r.id,
        ref_id:   r.id,
        tipo:     'reparacion',
        nombre:   r.nombre,
        tel:      r.telefono,
        equipo:   r.equipo + (r.modelo ? ' ' + r.modelo : ''),
        fecha:    r.fecha,
        dias:     dias,
        estado:   estado,
        urgencia: dias >= 60 ? 'alta' : 'proxima',
        label:    'Reparacion dia ' + dias,
      });
    }
  });

  // Post-venta: dia 90 y dia 365
  (window.VENTAS || []).forEach(function(v) {
    if (!v.nombre || !v.telefono) return;
    var dias = diasDesde(v.fecha);
    if (dias === null) return;
    var modelo = [v.modelo, v.capacidad, v.color].filter(Boolean).join(' ');

    if (dias >= 85 && dias <= 150) { // ventana 90 dias
      lista.push({
        id:       'ven90_' + v.id,
        ref_id:   v.id,
        tipo:     'venta_90',
        nombre:   v.nombre,
        tel:      v.telefono,
        equipo:   modelo,
        fecha:    v.fecha,
        dias:     dias,
        estado:   v.seg90_est || 'pendiente',
        urgencia: dias >= 90 ? 'alta' : 'proxima',
        label:    'Venta 90 dias',
      });
    }
    if (dias >= 355 && dias <= 420) { // ventana 365 dias
      lista.push({
        id:       'ven365_' + v.id,
        ref_id:   v.id,
        tipo:     'venta_365',
        nombre:   v.nombre,
        tel:      v.telefono,
        equipo:   modelo,
        fecha:    v.fecha,
        dias:     dias,
        estado:   v.seg365_est || 'pendiente',
        urgencia: dias >= 365 ? 'alta' : 'proxima',
        label:    'Venta 1 anio',
      });
    }
  });

  // Ordenar: primero alta urgencia, luego por dias desc
  lista.sort(function(a, b) {
    if (a.urgencia !== b.urgencia) return a.urgencia === 'alta' ? -1 : 1;
    return b.dias - a.dias;
  });

  return lista;
}

// ── Badge contador ────────────────────────────────────
function segContarPendientes() {
  return calcSeguimientos().filter(function(s) {
    return s.estado === 'pendiente' && s.urgencia === 'alta';
  }).length;
}

// ── Guardar estado en Firebase ────────────────────────
function segCambiarEstado(seg, nuevoEst) {
  if (seg.tipo === 'reparacion') {
    FB.upd(seg.ref_id, { seg_est: nuevoEst }, function() {});
  } else if (seg.tipo === 'venta_90') {
    FB.updV(seg.ref_id, { seg90_est: nuevoEst }, function() {});
  } else if (seg.tipo === 'venta_365') {
    FB.updV(seg.ref_id, { seg365_est: nuevoEst }, function() {});
  }
}

// ── Mensajes WhatsApp ─────────────────────────────────
function segMensaje(seg) {
  var desc = SEG_DESC + '%';
  var msgs = {
    reparacion: 'Hola ' + seg.nombre + '! Como estas?\n\n'
      + 'Hace 60 dias reparaste tu ' + seg.equipo + ' con nosotros y queriamos saber como te fue con la reparacion.\n\n'
      + 'Como agradecimiento, tenes un ' + desc + ' de descuento en fundas, templados y cables esta semana.\n\n'
      + 'Cualquier consulta estamos disponibles!\nMaxPoint',
    venta_90:   'Hola ' + seg.nombre + '! Como estas?\n\n'
      + 'Hace 3 meses te llevaste tu ' + seg.equipo + ' y queriamos saber como te esta yendo con el equipo.\n\n'
      + 'Si necesitas algun accesorio, tenes un ' + desc + ' de descuento en fundas, templados y cables.\n\n'
      + 'Cualquier consulta estamos disponibles!\nMaxPoint',
    venta_365:  'Hola ' + seg.nombre + '! Como estas?\n\n'
      + 'Hace un anio que te llevaste tu ' + seg.equipo + ' de MaxPoint!\n\n'
      + 'Si estas pensando en renovar tu equipo, pasa por el local. Tenemos stock disponible y podemos hacer una buena oferta.\n\n'
      + 'Cualquier consulta estamos disponibles!\nMaxPoint',
  };
  return msgs[seg.tipo] || '';
}

function segEnviarWA(seg) {
  var tel = (seg.tel || '').replace(/[^0-9]/g,'');
  if (!tel) { toast('Sin telefono registrado', 'var(--rd)'); return; }
  var msg = segMensaje(seg);
  var url = 'https://wa.me/' + tel + '?text=' + encodeURIComponent(msg);
  window.open(url, '_blank');
  // Marcar como contactado automaticamente
  segCambiarEstado(seg, 'contactado');
}

// ── Config descuento ──────────────────────────────────
function segEditarDescuento() {
  var nuevo = prompt('Descuento para seguimientos (%):', SEG_DESC);
  if (nuevo && !isNaN(nuevo) && Number(nuevo) >= 0 && Number(nuevo) <= 100) {
    SEG_DESC = Number(nuevo);
    toast('Descuento actualizado a ' + SEG_DESC + '%');
  }
}

// ── Estadisticas ──────────────────────────────────────
function calcPodio() {
  var counts = {};
  (window.REPS || []).forEach(function(r) {
    if (!r.nombre) return;
    counts[r.nombre] = (counts[r.nombre] || 0) + 1;
  });
  (window.VENTAS || []).forEach(function(v) {
    if (!v.nombre) return;
    counts[v.nombre] = (counts[v.nombre] || 0) + 1;
  });
  return Object.keys(counts)
    .map(function(n) { return { nombre: n, total: counts[n] }; })
    .sort(function(a,b) { return b.total - a.total; })
    .slice(0, 3);
}

function calcModelos() {
  var modelos = {};
  (window.VENTAS || []).forEach(function(v) {
    var key = (v.modelo || '').trim();
    if (!key) return;
    if (!modelos[key]) modelos[key] = { ventas: 0, tiempos: [] };
    modelos[key].ventas++;
    // Tiempo en stock: si vino del stock, calcular dias entre ingreso y venta
    if (v.fecha) {
      var diasVenta = diasDesde(v.fecha);
      if (diasVenta !== null && diasVenta >= 0) modelos[key].tiempos.push(diasVenta);
    }
  });
  return Object.keys(modelos).map(function(m) {
    var data = modelos[m];
    var promDias = data.tiempos.length
      ? Math.round(data.tiempos.reduce(function(s,x){return s+x;},0) / data.tiempos.length)
      : null;
    return { modelo: m, ventas: data.ventas, promDias: promDias };
  }).sort(function(a,b) { return b.ventas - a.ventas; }).slice(0, 10);
}

// Helper para llamar desde data-sid en botones
function segWA(sid) {
  var lista = calcSeguimientos();
  var seg = lista.find(function(s) { return s.id === sid; });
  if (seg) segEnviarWA(seg);
  else toast('Seguimiento no encontrado', 'var(--rd)');
}

function actualizarBadgeSeg() {
  var badge = el('nb-seg');
  if (!badge) return;
  var n = segContarPendientes();
  badge.textContent = n;
  badge.style.display = n > 0 ? '' : 'none';
}

// ===================== RENDER =====================
// Todas las funciones que construyen UI con DOM methods.
// Cero innerHTML con strings interpolados para evitar bugs de escaping.

// ---- Dispatcher central ----
function render() {
  if      (VIEW === 'reps') renderReps();
  else if (VIEW === 'rpus') renderRpus();
  else if (VIEW === 'seg')   renderSeg();
  else if (VIEW === 'ven')   renderVen();
  else if (VIEW === 'stock') renderStock();
  else if (VIEW === 'cot')  renderCot();
  else if (VIEW === 'cli')  renderCli();
  else if (VIEW === 'pag')  renderPag();
  else if (VIEW === 'bal')  renderBal();
}

// ---- Filtrado ----
function getFiltrados() {
  var list = REPS.slice().reverse();
  if (SEARCH) {
    var q = SEARCH.toLowerCase();
    list = list.filter(function(r) {
      return (r.nombre  || '').toLowerCase().includes(q)
          || (r.equipo  || '').toLowerCase().includes(q)
          || (r.orden   || '').includes(q)
          || (r.telefono|| '').includes(q)
          || (r.falla   || '').toLowerCase().includes(q);
    });
  }
  if (FILT) {
    list = list.filter(function(r) { return r.estado === FILT; });
  }
  return list;
}

// ============================================================
// REPARACIONES
// ============================================================
function renderReps() {
  var cnt  = el('cnt');
  var all  = getFiltrados();
  var tot  = Math.max(1, Math.ceil(all.length / PZ));
  if (PAGE > tot) PAGE = tot;
  var list = all.slice((PAGE - 1) * PZ, PAGE * PZ);

  // Stats
  var ac = REPS.filter(function(r) { return r.estado !== 'Entregado' && r.estado !== 'No aprobado'; }).length;
  var li = REPS.filter(function(r) { return r.estado === 'Listo'; }).length;
  var cb = REPS.filter(function(r) { return r.pago !== 'Pagado' && r.estado !== 'Entregado' && r.estado !== 'No aprobado'; })
               .reduce(function(s, r) { return s + Number(r.presupuesto || 0) - Number(r.sena || 0); }, 0);

  cnt.innerHTML = '';

  // -- Toolbar --
  var tb = document.createElement('div');
  tb.className = 'toolbar';

  var si  = document.createElement('div');  si.className = 'si';
  var ico = document.createElement('span'); ico.className = 'si-ico'; ico.textContent = '🔍';
  var inp = document.createElement('input');
  inp.placeholder = 'Buscar nombre, equipo, orden...';
  inp.value = SEARCH;
  inp.addEventListener('input', function() {
    var pos = this.selectionStart;
    SEARCH = this.value; PAGE = 1; renderReps();
    requestAnimationFrame(function() {
      var next = document.querySelector('.toolbar .si input');
      if (next) { next.focus(); try { next.setSelectionRange(pos, pos); } catch(e) {} }
    });
  });
  si.appendChild(ico); si.appendChild(inp); tb.appendChild(si);

  var sel = document.createElement('select'); sel.className = 'fsel';
  ['', 'Ingresado', 'En proceso', 'Listo', 'Entregado', 'No aprobado', 'Garantia'].forEach(function(e) {
    var o = document.createElement('option');
    o.value = e; o.textContent = e || 'Todos los estados';
    if (FILT === e) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', function() { FILT = this.value; PAGE = 1; renderReps(); });
  tb.appendChild(sel);
  cnt.appendChild(tb);

  // -- Stat cards --
  var sg = document.createElement('div'); sg.className = 'sg';
  sg.innerHTML = ''
    + '<div class="sc"><div class="scl">Total registros</div><div class="scv cy">' + REPS.length.toLocaleString() + '</div></div>'
    + '<div class="sc"><div class="scl">En taller</div><div class="scv cb">' + ac + '</div></div>'
    + '<div class="sc"><div class="scl">Para retirar</div><div class="scv cg">' + li + '</div></div>'
    + '<div class="sc"><div class="scl">Por cobrar</div><div class="scv co">' + pesos(cb) + '</div></div>';
  cnt.appendChild(sg);

  if (!list.length) {
    var em = document.createElement('div'); em.className = 'empty';
    em.innerHTML = '<div class="ei">📋</div>' + (REPS.length ? 'Sin resultados para ese filtro.' : 'Sin ordenes. Importa el historico o carga la primera.');
    cnt.appendChild(em);
    return;
  }

  // -- Tabla --
  var tw = document.createElement('div'); tw.className = 'tw';
  var tbl = document.createElement('table');
  tbl.innerHTML = '<thead><tr>'
    + '<th>Orden</th><th>Cliente</th><th>Equipo</th>'
    + '<th>Falla</th><th>Presup.</th><th>Estado</th>'
    + '<th>Pago</th><th>Fecha</th><th></th>'
    + '</tr></thead>';

  var tbody = document.createElement('tbody');
  list.forEach(function(r) {
    var tr = document.createElement('tr');

    // Celda orden
    var tdOrden = document.createElement('td');
    var spanOrden = document.createElement('span'); spanOrden.className = 'on'; spanOrden.textContent = r.orden || '';
    tdOrden.appendChild(spanOrden); tr.appendChild(tdOrden);

    // Celda cliente
    var tdCli = document.createElement('td');
    var divNom = document.createElement('div'); divNom.style.fontWeight = '600'; divNom.textContent = r.nombre || '';
    var divTel = document.createElement('div'); divTel.className = 'mu mono'; divTel.style.fontSize = '11px'; divTel.textContent = r.telefono || '';
    tdCli.appendChild(divNom); tdCli.appendChild(divTel); tr.appendChild(tdCli);

    // Equipo
    var tdEq = document.createElement('td'); tdEq.style.fontSize = '12px'; tdEq.textContent = r.equipo || ''; tr.appendChild(tdEq);

    // Falla (truncada)
    var tdFalla = document.createElement('td');
    tdFalla.className = 'mu'; tdFalla.style.cssText = 'max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px';
    tdFalla.textContent = (r.falla || '').substring(0, 40); tr.appendChild(tdFalla);

    // Presupuesto
    var tdPres = document.createElement('td'); tdPres.className = 'mono'; tdPres.style.fontSize = '12px';
    tdPres.textContent = (r.presupuesto && r.presupuesto !== '0') ? pesos(r.presupuesto) : '—'; tr.appendChild(tdPres);

    // Estado (badge via innerHTML, string fija)
    var tdEst = document.createElement('td'); tdEst.innerHTML = badgeEst(r.estado); tr.appendChild(tdEst);

    // Pago
    var tdPag = document.createElement('td'); tdPag.innerHTML = badgePag(r.pago); tr.appendChild(tdPag);

    // Fecha
    var tdFecha = document.createElement('td'); tdFecha.className = 'mu mono'; tdFecha.style.fontSize = '11px'; tdFecha.textContent = r.fecha || ''; tr.appendChild(tdFecha);

    // Acciones — closures limpios con IIFE
    var tdActs = document.createElement('td'); tdActs.className = 'acts';
    tdActs.appendChild(mkBtn('btn-g btn-sm', 'Ver',  (function(id) { return function() { openDet(id); }; })(r.id)));
    tdActs.appendChild(mkBtn('btn-g btn-sm', '✏️',   (function(id) { return function() { openEditRep(id); }; })(r.id)));
    tdActs.appendChild(mkBtn('btn-d btn-sm', '🗑',   (function(id, ord) {
      return function() {
        if (confirm('Eliminar orden ' + ord + '?')) {
          FB.del(id, function(err) {
            if (err) toast('Error: ' + err, 'var(--rd)');
            else toast('Eliminado', 'var(--rd)');
          });
        }
      };
    })(r.id, r.orden)));
    tr.appendChild(tdActs);

    tbody.appendChild(tr);
  });

  tbl.appendChild(tbody);
  tw.appendChild(tbl);

  // -- Paginacion --
  var pg = document.createElement('div'); pg.className = 'pg';
  var info = document.createElement('span'); info.className = 'pi';
  info.textContent = all.length + ' registros — pag. ' + PAGE + '/' + tot;
  pg.appendChild(info);
  var pgBtns = document.createElement('div'); pgBtns.style.display = 'flex'; pgBtns.style.gap = '6px';
  var bPrev = mkBtn('btn-g btn-sm', '← Ant', function() { PAGE--; renderReps(); }); if (PAGE <= 1) bPrev.disabled = true;
  var bNext = mkBtn('btn-g btn-sm', 'Sig →', function() { PAGE++; renderReps(); }); if (PAGE >= tot) bNext.disabled = true;
  pgBtns.appendChild(bPrev); pgBtns.appendChild(bNext);
  pg.appendChild(pgBtns);
  tw.appendChild(pg);
  cnt.appendChild(tw);
}

// ============================================================
// REPUESTOS
// ============================================================
function renderRpus() {
  var cnt = el('cnt'); cnt.innerHTML = '';

  var esp = RPUS.filter(function(r) { return r.estado === 'Esperando'; });
  var enc = RPUS.filter(function(r) { return r.estado === 'Encargado'; });
  var lle = RPUS.filter(function(r) { return r.estado === 'Llego'; });
  var usa = RPUS.filter(function(r) { return r.estado === 'Usado'; });
  var cE  = esp.reduce(function(s, r) { return s + Number(r.costo || 0); }, 0);

  // Stats
  var sg = document.createElement('div'); sg.className = 'sg';
  sg.innerHTML = ''
    + '<div class="sc"><div class="scl">Esperando</div><div class="scv cp">' + esp.length + '</div></div>'
    + '<div class="sc"><div class="scl">Encargado</div><div class="scv co">' + enc.length + '</div></div>'
    + '<div class="sc"><div class="scl">Disponibles</div><div class="scv cg">' + lle.length + '</div></div>'
    + '<div class="sc"><div class="scl">Usados</div><div class="scv cy">' + usa.length + '</div></div>'
    + '<div class="sc"><div class="scl">Costo pendiente</div><div class="scv co">' + pesos(cE) + '</div></div>';
  // Boton copiar lista (solo si hay Esperando)
  if (esp.length) {
    var btnCopy = document.createElement('button');
    btnCopy.className = 'btn btn-p';
    btnCopy.style.cssText = 'margin-top:8px;width:100%';
    btnCopy.textContent = '📋 Copiar lista para proveedor (' + esp.length + ')';
    btnCopy.addEventListener('click', function() { copiarListaProveedor(esp); });
    cnt.appendChild(btnCopy);
  }
  cnt.appendChild(sg);

  function rpCard(r) {
    var card = document.createElement('div'); card.className = 'rc';

    var top = document.createElement('div');
    top.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:8px';

    var info = document.createElement('div');
    var nom  = document.createElement('div'); nom.style.cssText = 'font-weight:600;font-size:14px'; nom.textContent = r.nombre || '';
    info.appendChild(nom);
    if (r.modelo) {
      var mod = document.createElement('div'); mod.className = 'mu'; mod.style.fontSize = '12px'; mod.textContent = r.modelo;
      info.appendChild(mod);
    }

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:5px;align-items:center;flex-wrap:wrap';

    // Dropdown de estado — permite cambiar en cualquier direccion
    var sel = document.createElement('select');
    sel.className = 'rpu-estado-sel';
    ['Esperando','Encargado','Llego','Usado'].forEach(function(est) {
      var opt = document.createElement('option');
      opt.value = est; opt.textContent = est;
      if (est === r.estado) opt.selected = true;
      sel.appendChild(opt);
    });
    // Color del select segun estado actual
    var colorMap = { 'Esperando':'var(--pu)', 'Encargado':'var(--or)', 'Llego':'var(--gr)', 'Usado':'var(--mu)' };
    sel.style.color = colorMap[r.estado] || 'var(--mu)';
    sel.addEventListener('change', (function(id, selEl) {
      return function() {
        var nuevoEst = selEl.value;
        selEl.style.color = colorMap[nuevoEst] || 'var(--mu)';
        FB.updR(id, { estado: nuevoEst }, function() {
          toast('Estado: ' + nuevoEst);
        });
      };
    })(r.id, sel));
    btns.appendChild(sel);

    btns.appendChild(mkBtn('btn-d btn-sm', '🗑', (function(id) {
      return function() {
        if (confirm('Eliminar repuesto?')) {
          FB.delR(id, function() { toast('Eliminado', 'var(--rd)'); });
        }
      };
    })(r.id)));

    top.appendChild(info); top.appendChild(btns); card.appendChild(top);

    // Meta info
    var meta = document.createElement('div'); meta.className = 'rcm';
    if (r.orden)     meta.innerHTML += '<span>🔧 <span class="on">' + esc(r.orden) + '</span></span>';
    if (r.cliente)   meta.innerHTML += '<span>👤 ' + esc(r.cliente) + '</span>';
    if (r.costo && r.costo !== '0') meta.innerHTML += '<span>💰 <span class="mono">' + pesos(r.costo) + '</span></span>';
    if (r.proveedor) meta.innerHTML += '<span>🏪 ' + esc(r.proveedor) + '</span>';
    if (r.fecha)     meta.innerHTML += '<span class="mono mu" style="font-size:11px">' + esc(r.fecha) + '</span>';
    card.appendChild(meta);

    if (r.notas) {
      var nn = document.createElement('div');
      nn.style.cssText = 'margin-top:5px;font-size:12px;color:var(--mu)';
      nn.textContent = r.notas; card.appendChild(nn);
    }
    return card;
  }

  function addSection(titulo, color, items) {
    if (!items.length) return;
    var h = document.createElement('h2'); h.className = 'section-title'; h.style.color = color; h.textContent = titulo;
    cnt.appendChild(h);
    items.forEach(function(r) { cnt.appendChild(rpCard(r)); });
  }

  addSection('⏳ Esperando',    'var(--pu)', esp);
  addSection('📦 Encargado',   'var(--or)', enc);
  addSection('✅ Disponibles', 'var(--gr)', lle);
  addSection('✓ Usados',       'var(--mu)', usa);

  if (!RPUS.length) {
    var em = document.createElement('div'); em.className = 'empty';
    em.innerHTML = '<div class="ei">📦</div>Sin repuestos cargados.';
    cnt.appendChild(em);
  }
}

// ============================================================
// CLIENTES
// ============================================================
function renderCli() {
  var cnt = el('cnt'); cnt.innerHTML = '';

  // Search bar
  var tb = document.createElement('div'); tb.className = 'toolbar';
  var si = document.createElement('div'); si.className = 'si';
  var ico = document.createElement('span'); ico.className = 'si-ico'; ico.textContent = '🔍';
  var inp = document.createElement('input'); inp.placeholder = 'Buscar cliente...';
  inp.addEventListener('input', function() {
    var q = this.value.toLowerCase();
    cnt.querySelectorAll('.rc[data-s]').forEach(function(c) {
      c.style.display = c.dataset.s.includes(q) ? '' : 'none';
    });
  });
  si.appendChild(ico); si.appendChild(inp); tb.appendChild(si); cnt.appendChild(tb);

  // Agrupar por cliente
  var map = {};
  REPS.forEach(function(r) {
    var k = (r.nombre || '').trim().toLowerCase();
    if (!k) return;
    if (!map[k]) map[k] = { nombre: r.nombre, tel: r.telefono, ords: [] };
    map[k].ords.push(r);
  });
  var clientes = Object.values(map).sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });

  if (!clientes.length) {
    cnt.innerHTML += '<div class="empty"><div class="ei">👤</div>Sin clientes.</div>';
    return;
  }

  clientes.forEach(function(c) {
    var card = document.createElement('div'); card.className = 'rc';
    card.dataset.s = (c.nombre + ' ' + (c.tel || '')).toLowerCase();

    var act = c.ords.filter(function(r) { return r.estado !== 'Entregado' && r.estado !== 'No aprobado'; }).length;

    // Header
    var hd = document.createElement('div');
    hd.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px';
    var info = document.createElement('div');
    var nom  = document.createElement('div'); nom.style.cssText = 'font-weight:600;font-size:14px'; nom.textContent = c.nombre;
    var tel  = document.createElement('div'); tel.className = 'mu mono'; tel.style.fontSize = '12px'; tel.textContent = c.tel || 'Sin telefono';
    info.appendChild(nom); info.appendChild(tel);
    var btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap;align-items:center';
    btns.appendChild(mkBadge('b-count', c.ords.length + ' ord.'));
    if (act) btns.appendChild(mkBadge('b-active', act + ' activo' + (act !== 1 ? 's' : '')));
    if (c.tel) {
      // Buscamos la ultima orden activa del cliente para abrirWA2 con contexto
      var ultimaOrd = c.ords.slice().reverse().find(function(o) {
        return o.estado !== 'Entregado' && o.estado !== 'No aprobado';
      }) || c.ords[c.ords.length - 1];
      btns.appendChild(mkBtn('btn-w btn-sm', '💬 WA', (function(ord) {
        return function() {
          if (ord) abrirWA2(ord.id);
          else toast('Sin ordenes para enviar mensaje', 'var(--mu)');
        };
      })(ultimaOrd)));
    }
    hd.appendChild(info); hd.appendChild(btns); card.appendChild(hd);

    // Ultimas 3 ordenes
    c.ords.slice().reverse().slice(0, 3).forEach(function(r) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;border-top:1px solid var(--bd);padding:5px 0;font-size:13px;flex-wrap:wrap';
      var spanOrd = document.createElement('span'); spanOrd.className = 'on'; spanOrd.textContent = r.orden || '';
      var spanEq  = document.createElement('span'); spanEq.className  = 'mu'; spanEq.style.fontSize = '12px'; spanEq.textContent = r.equipo || '';
      var spanFec = document.createElement('span'); spanFec.className = 'mu'; spanFec.style.fontSize = '11px'; spanFec.textContent = r.fecha || '';
      var estSpan = document.createElement('span'); estSpan.innerHTML = badgeEst(r.estado);
      var bVer    = mkBtn('btn-g btn-sm', 'Ver', (function(id) { return function() { openDet(id); }; })(r.id));
      row.appendChild(spanOrd); row.appendChild(spanEq);
      row.appendChild(estSpan); row.appendChild(spanFec); row.appendChild(bVer);
      card.appendChild(row);
    });
    if (c.ords.length > 3) {
      var more = document.createElement('div');
      more.style.cssText = 'font-size:11px;color:var(--mu);text-align:center;padding-top:4px';
      more.textContent = '+' + (c.ords.length - 3) + ' mas';
      card.appendChild(more);
    }
    cnt.appendChild(card);
  });
}

// ============================================================
// PAGOS
// ============================================================
function renderPag() {
  var cnt = el('cnt'); cnt.innerHTML = '';

  var pnd = REPS.filter(function(r) { return r.pago === 'Pendiente' && r.estado !== 'Entregado' && r.estado !== 'No aprobado'; });
  var prc = REPS.filter(function(r) { return r.pago === 'Parcial'; });
  var cobrado = REPS.filter(function(r) { return r.pago === 'Pagado'; })
                    .reduce(function(s, r) { return s + Number(r.presupuesto || 0); }, 0);
  var porcobrar = pnd.reduce(function(s, r) { return s + Number(r.presupuesto || 0); }, 0)
                + prc.reduce(function(s, r) { return s + Number(r.presupuesto || 0) - Number(r.sena || 0); }, 0);

  // Stats
  var sg = document.createElement('div'); sg.className = 'sg';
  sg.innerHTML = ''
    + '<div class="sc"><div class="scl">Por cobrar</div><div class="scv co">' + pesos(porcobrar) + '</div></div>'
    + '<div class="sc"><div class="scl">Pendientes</div><div class="scv cr">' + pnd.length + '</div></div>'
    + '<div class="sc"><div class="scl">Con sena</div><div class="scv cy">' + prc.length + '</div></div>';
  cnt.appendChild(sg);

  function mkTabla(titulo, color, filas, cols) {
    if (!filas.length) return;
    var h = document.createElement('h2'); h.className = 'section-title'; h.style.color = color; h.textContent = titulo;
    cnt.appendChild(h);
    var tw = document.createElement('div'); tw.className = 'tw'; tw.style.marginBottom = '20px';
    var tbl = document.createElement('table');
    var thead = document.createElement('thead');
    var htr = document.createElement('tr');
    cols.concat(['Accion']).forEach(function(c) {
      var th = document.createElement('th'); th.textContent = c; htr.appendChild(th);
    });
    thead.appendChild(htr); tbl.appendChild(thead);
    var tbody = document.createElement('tbody');
    filas.forEach(function(r) {
      var tr = document.createElement('tr');
      var sal = Number(r.presupuesto || 0) - Number(r.sena || 0);

      function addTd(content, cls) {
        var td = document.createElement('td'); if (cls) td.className = cls;
        if (typeof content === 'string') td.innerHTML = content; else td.appendChild(content);
        tr.appendChild(td);
      }
      var spanOrd = document.createElement('span'); spanOrd.className = 'on'; spanOrd.textContent = r.orden || '';
      addTd(spanOrd); addTd(esc(r.nombre)); addTd(esc(r.equipo));
      if (cols.length === 5) {
        addTd(r.presupuesto && r.presupuesto !== '0' ? pesos(r.presupuesto) : '—', 'mono');
        addTd(badgeEst(r.estado));
      } else {
        addTd(pesos(r.presupuesto || 0), 'mono');
        addTd(pesos(r.sena || 0), 'mono cg');
        addTd(pesos(sal), 'mono co');
      }
      var tdAct = document.createElement('td');
      tdAct.appendChild(mkBtn('btn-g btn-sm', '💳 Cobrar', (function(id) {
        return function() { openPago(id); };
      })(r.id)));
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody); tw.appendChild(tbl); cnt.appendChild(tw);
  }

  mkTabla('Sin pago',  'var(--rd)', pnd, ['Orden','Cliente','Equipo','Presupuesto','Estado']);
  mkTabla('Con sena', 'var(--or)', prc, ['Orden','Cliente','Equipo','Presupuesto','Sena','Saldo']);

  if (!pnd.length && !prc.length) {
    cnt.innerHTML += '<div class="empty"><div class="ei">🎉</div>Sin pagos pendientes. Todo al dia!</div>';
  }
}

// ============================================================
// BALANCE
// ============================================================
function renderBal() {
  var cnt = el('cnt'); cnt.innerHTML = '';
  var MN = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // ── Resumen global ────────────────────────────────
  var tCobrado   = REPS.filter(function(r){return r.pago==='Pagado';}).reduce(function(s,r){return s+Number(r.presupuesto||0);},0);
  var cRepuestos = RPUS.filter(function(r){return r.estado==='Usado';}).reduce(function(s,r){return s+Number(r.costo||0);},0);
  var tVentas    = (window.VENTAS||[]).reduce(function(s,v){return s+Number(v.precio||0);},0);
  var cVentas    = (window.VENTAS||[]).reduce(function(s,v){return s+Number(v.costo||0);},0);
  var tEfectivo  = (window.VENTAS||[]).reduce(function(s,v){
    var pp = Number(v.pp_valor||0);
    return s + (Number(v.precio||0) - pp);
  },0);
  var tPartePago = (window.VENTAS||[]).reduce(function(s,v){return s+Number(v.pp_valor||0);},0);

  var sg = document.createElement('div'); sg.className = 'sc-row';
  sg.innerHTML = '<div class="sc"><div class="scl">Reparaciones cobradas</div><div class="scv cg">' + pesos(tCobrado) + '</div></div>'
    + '<div class="sc"><div class="scl">Costo repuestos</div><div class="scv cr">' + pesos(cRepuestos) + '</div></div>'
    + '<div class="sc"><div class="scl">Ventas total</div><div class="scv co">' + pesos(tVentas) + '</div></div>'
    + '<div class="sc"><div class="scl">Efectivo ventas</div><div class="scv cb">' + pesos(tEfectivo) + '</div></div>'
    + (tPartePago ? '<div class="sc"><div class="scl">Parte de pago</div><div class="scv cy">' + pesos(tPartePago) + '</div></div>' : '')
    + '<div class="sc"><div class="scl">Ganancia ventas</div><div class="scv cg">' + pesos(tVentas-cVentas) + '</div></div>';
  cnt.appendChild(sg);

  // ── Selector de mes para comisiones ──────────────
  var meses = calcMesesDisponibles ? calcMesesDisponibles() : [];
  var hoy = new Date(); var mesActual = hoy.getFullYear() + '-' + String(hoy.getMonth()+1).padStart(2,'0');
  if (!meses.length || !meses.includes(mesActual)) meses.unshift(mesActual);

  var secCom = document.createElement('div'); secCom.style.marginTop = '20px';
  secCom.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
    + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--acc)">Comisiones por tecnico</div>'
    + '<div style="display:flex;gap:6px;align-items:center">'
    + '<select id="balMesSel" onchange="renderBalComisiones()" style="background:var(--s2);border:1px solid var(--bd);border-radius:6px;padding:4px 8px;color:var(--tx);font-size:12px;outline:none">'
    + meses.map(function(m){ var p=m.split('-'); return '<option value="'+m+'"'+(m===mesActual?' selected':'')+'>'+(MN[parseInt(p[1])]||p[1])+' '+p[0]+'</option>'; }).join('')
    + '</select>'
    + '<button class="btn btn-g btn-sm" onclick="openGestionTecnicos()">Gestionar</button>'
    + '</div></div>'
    + '<div id="balComWrap"></div>';
  cnt.appendChild(secCom);
  renderBalComisiones();

  // ── Desglose mensual reparaciones (solo Pagadas o Entregadas) ──
  var mes = {};
  REPS.forEach(function(r) {
    if (!r.fecha) return;
    // Solo contar las terminadas
    if (r.pago !== 'Pagado' && r.estado !== 'Entregado') return;
    var k = fechaAMesKey ? fechaAMesKey(r.fecha) : r.fecha.slice(0,7);
    if (!mes[k]) mes[k] = { cobrado:0, total:0, gar:0 };
    mes[k].total++;
    if (r.pago==='Pagado') mes[k].cobrado += Number(r.presupuesto||0);
    if (r.es_garantia==='si') mes[k].gar++;
  });
  // Ventas por mes (no acumuladas)
  var mesVen = {};
  (window.VENTAS||[]).forEach(function(v) {
    if (!v.fecha) return;
    var k = typeof fechaAMesKey === 'function' ? fechaAMesKey(v.fecha) : v.fecha.slice(0,7);
    if (!k) return;
    if (!mesVen[k]) mesVen[k] = { total:0, monto:0 };
    mesVen[k].total++;
    mesVen[k].monto += Number(v.precio||0);
  });

  var secMes = document.createElement('div'); secMes.style.marginTop = '20px';
  secMes.innerHTML = '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--mu);margin-bottom:8px">Reparaciones por mes</div>';
  var tw = document.createElement('div'); tw.className = 'tw';
  var tbl = document.createElement('table');
  tbl.innerHTML = '<thead><tr><th>Mes</th><th>Reparaciones</th><th>Garantias</th><th>Cobrado</th></tr></thead>';
  var tbody = document.createElement('tbody');
  Object.keys(mes).sort().reverse().forEach(function(k) {
    var mr = mes[k]||{total:0,cobrado:0,gar:0};
    var pt = k.split('-');
    var tr = document.createElement('tr');
    tr.innerHTML = '<td style="font-weight:600">' + (MN[parseInt(pt[1])]||pt[1]) + ' ' + pt[0] + '</td>'
      + '<td class="mono">' + mr.total + '</td>'
      + '<td class="mono cr">' + (mr.gar||0) + '</td>'
      + '<td class="mono cg">' + pesos(mr.cobrado) + '</td>';
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody); tw.appendChild(tbl); secMes.appendChild(tw);
  cnt.appendChild(secMes);

  // ── Balance de ventas ─────────────────────────────
  if (window.VENTAS && VENTAS.length) {
    // Calcular por mes
    var venMes = {};
    VENTAS.forEach(function(v) {
      var k = typeof fechaAMesKey === 'function' ? fechaAMesKey(v.fecha) : (v.fecha||'').slice(0,7);
      if (!k) return;
      if (!venMes[k]) venMes[k] = { cant:0, bruto:0, costo:0, pp:0 };
      venMes[k].cant++;
      venMes[k].bruto += Number(v.precio||0);
      venMes[k].pp    += Number(v.pp_valor||0);
      venMes[k].costo += Number(v.costo||0);
    });

    // Totales anuales
    var anos = {};
    Object.keys(venMes).forEach(function(k) {
      var ano = k.split('-')[0];
      if (!anos[ano]) anos[ano] = { cant:0, bruto:0, costo:0 };
      anos[ano].cant    += venMes[k].cant;
      anos[ano].bruto   += venMes[k].bruto;
      anos[ano].costo   += venMes[k].costo;
    });

    var totalBruto = VENTAS.reduce(function(s,v){return s+Number(v.precio||0);},0);
    var totalCosto = VENTAS.reduce(function(s,v){return s+Number(v.costo||0);},0);
    var totalGan   = totalBruto - totalCosto;

    var secVen = document.createElement('div'); secVen.style.marginTop = '24px';
    secVen.innerHTML = '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--bl);margin-bottom:8px">Balance de ventas</div>';

    // Stats globales
    var sgv = document.createElement('div'); sgv.className = 'sc-row';
    var totalPP = VENTAS.reduce(function(s,v){return s+Number(v.pp_valor||0);},0);
    var totalEfectivo = totalBruto - totalPP;
    sgv.innerHTML = '<div class="sc"><div class="scl">Total ventas</div><div class="scv cb">' + VENTAS.length + '</div></div>'
      + '<div class="sc"><div class="scl">Facturado</div><div class="scv co">' + pesos(totalBruto) + '</div></div>'
      + '<div class="sc"><div class="scl">Efectivo</div><div class="scv cb">' + pesos(totalEfectivo) + '</div></div>'
      + (totalPP ? '<div class="sc"><div class="scl">Parte de pago</div><div class="scv cy">' + pesos(totalPP) + '</div></div>' : '')
      + '<div class="sc"><div class="scl">Costo total</div><div class="scv cy">' + pesos(totalCosto) + '</div></div>'
      + '<div class="sc"><div class="scl">Ganancia total</div><div class="scv cg">' + pesos(totalGan) + '</div></div>';
    secVen.appendChild(sgv);

    // Tabla mensual
    var twv = document.createElement('div'); twv.className = 'tw'; twv.style.marginTop = '10px';
    var tblv = document.createElement('table');
    tblv.innerHTML = '<thead><tr><th>Mes</th><th>Ventas</th><th>Facturado</th><th>Efectivo</th><th>Parte pago</th><th>Costo</th><th>Gan.</th><th>%</th></tr></thead>';
    var tbodyv = document.createElement('tbody');
    Object.keys(venMes).sort().reverse().forEach(function(k) {
      var vm = venMes[k];
      var gan = vm.bruto - vm.costo;
      var margen = vm.bruto ? Math.round(gan / vm.bruto * 100) : 0;
      var pt = k.split('-');
      var tr = document.createElement('tr');
      var efect = vm.bruto - (vm.pp||0);
      tr.innerHTML = '<td style="font-weight:600">' + (MN[parseInt(pt[1])]||pt[1]) + ' ' + pt[0] + '</td>'
        + '<td class="mono">' + vm.cant + '</td>'
        + '<td class="mono co">' + pesos(vm.bruto) + '</td>'
        + '<td class="mono cb">' + pesos(efect) + '</td>'
        + '<td class="mono cy">' + (vm.pp ? pesos(vm.pp) : '—') + '</td>'
        + '<td class="mono cy">' + pesos(vm.costo) + '</td>'
        + '<td class="mono ' + (gan>=0?'cg':'cr') + '">' + pesos(gan) + '</td>'
        + '<td class="mono ' + (margen>=0?'cg':'cr') + '">' + margen + '%</td>';
      tbodyv.appendChild(tr);
    });

    // Fila anual
    Object.keys(anos).sort().reverse().forEach(function(ano) {
      var av = anos[ano];
      var gan = av.bruto - av.costo;
      var margen = av.bruto ? Math.round(gan / av.bruto * 100) : 0;
      var tr = document.createElement('tr');
      tr.style.cssText = 'background:rgba(240,180,41,.06);font-weight:700;border-top:2px solid var(--bd)';
      tr.innerHTML = '<td style="font-weight:800;color:var(--acc)">Total ' + ano + '</td>'
        + '<td class="mono">' + av.cant + '</td>'
        + '<td class="mono co">' + pesos(av.bruto) + '</td>'
        + '<td class="mono cb">' + pesos(av.bruto-(av.pp||0)) + '</td>'
        + '<td class="mono cy">' + (av.pp ? pesos(av.pp) : '—') + '</td>'
        + '<td class="mono cy">' + pesos(av.costo) + '</td>'
        + '<td class="mono ' + (gan>=0?'cg':'cr') + '">' + pesos(gan) + '</td>'
        + '<td class="mono ' + (margen>=0?'cg':'cr') + '">' + margen + '%</td>';
      tbodyv.appendChild(tr);
    });

    tblv.appendChild(tbodyv); twv.appendChild(tblv); secVen.appendChild(twv);
    cnt.appendChild(secVen);

  // ── Repuestos en Balance ─────────────────────────
  var anioCurR = new Date().getFullYear();
  var MN4 = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var rpusAnio = (window.RPUS||[]).filter(function(rp) {
    var k = typeof fechaAMesKey === 'function' ? fechaAMesKey(rp.fecha||'') : (rp.fecha||'').slice(0,7);
    return k.startsWith(String(anioCurR));
  });
  var totalGastoAnio = rpusAnio.reduce(function(s,rp){return s+Number(rp.costo||0);},0);
  var rpUsadosAnio   = rpusAnio.filter(function(rp){return rp.estado==='Usado';}).length;

  var secRpu = document.createElement('div'); secRpu.style.marginTop = '20px';
  secRpu.innerHTML = '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--pu);margin-bottom:8px">Repuestos ' + anioCurR + '</div>';
  var scRpu = document.createElement('div'); scRpu.className = 'sc-row';
  scRpu.innerHTML = '<div class="sc"><div class="scl">Comprados</div><div class="scv cp">' + rpusAnio.length + '</div></div>'
    + '<div class="sc"><div class="scl">Usados</div><div class="scv cg">' + rpUsadosAnio + '</div></div>'
    + '<div class="sc"><div class="scl">Gasto anual</div><div class="scv cr">' + pesos(totalGastoAnio) + '</div></div>';
  secRpu.appendChild(scRpu);

  var mesRpu = {};
  (window.RPUS||[]).forEach(function(rp) {
    if (!rp.fecha) return;
    var k = typeof fechaAMesKey === 'function' ? fechaAMesKey(rp.fecha) : rp.fecha.slice(0,7);
    if (!mesRpu[k]) mesRpu[k] = { cant:0, gasto:0, usados:0 };
    mesRpu[k].cant++; mesRpu[k].gasto += Number(rp.costo||0);
    if (rp.estado==='Usado') mesRpu[k].usados++;
  });
  var twRpu = document.createElement('div'); twRpu.className = 'tw'; twRpu.style.marginTop = '8px';
  var tblRpu = document.createElement('table');
  tblRpu.innerHTML = '<thead><tr><th>Mes</th><th>Comprados</th><th>Usados</th><th>Gasto</th></tr></thead>';
  var tbodyRpu = document.createElement('tbody');
  Object.keys(mesRpu).sort().reverse().forEach(function(k) {
    var d = mesRpu[k]; var pt = k.split('-');
    var tr = document.createElement('tr');
    tr.innerHTML = '<td style="font-weight:600">' + (MN4[parseInt(pt[1])]||pt[1]) + ' ' + pt[0] + '</td>'
      + '<td class="mono cp">' + d.cant + '</td>'
      + '<td class="mono cg">' + d.usados + '</td>'
      + '<td class="mono cr">' + pesos(d.gasto) + '</td>';
    tbodyRpu.appendChild(tr);
  });
  tblRpu.appendChild(tbodyRpu); twRpu.appendChild(tblRpu); secRpu.appendChild(twRpu);

  var topRpu = {};
  (window.RPUS||[]).forEach(function(rp) {
    var n = (rp.nombre||'').trim(); if (!n) return;
    if (!topRpu[n]) topRpu[n] = { cant:0, gasto:0 };
    topRpu[n].cant++; topRpu[n].gasto += Number(rp.costo||0);
  });
  var topArr = Object.keys(topRpu).map(function(n){ return {nombre:n,cant:topRpu[n].cant,gasto:topRpu[n].gasto}; })
    .sort(function(a,b){return b.cant-a.cant;}).slice(0,10);
  if (topArr.length) {
    var divTop = document.createElement('div'); divTop.style.marginTop = '12px';
    divTop.innerHTML = '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--mu);margin-bottom:6px">Top 10 repuestos</div>';
    topArr.forEach(function(t,i) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;padding:6px 0;border-bottom:1px solid var(--bd);font-size:12px;gap:8px';
      row.innerHTML = '<span style="color:var(--mu);font-size:10px;width:18px">#' + (i+1) + '</span>'
        + '<span style="flex:1;color:var(--tx)">' + esc(t.nombre) + '</span>'
        + '<span style="color:var(--pu);font-weight:700">' + t.cant + 'x</span>'
        + '<span style="color:var(--mu);font-size:11px">' + pesos(t.gasto) + '</span>';
      divTop.appendChild(row);
    });
    secRpu.appendChild(divTop);
  }
  cnt.appendChild(secRpu);
  }
}

function renderBalComisiones() {
  var wrap = el('balComWrap'); if (!wrap) return;
  var sel  = el('balMesSel');
  var mesKey = sel ? sel.value : null;
  var com = calcComisiones ? calcComisiones(mesKey) : {};
  var MN = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  if (!Object.keys(com).length) {
    wrap.innerHTML = '<div style="color:var(--mu);font-size:12px;padding:12px 0">Sin datos — carga tecnico en las reparaciones y vendedor en las ventas</div>';
    return;
  }

  wrap.innerHTML = '';
  Object.keys(com).forEach(function(nom) {
    var d = com[nom];
    if (!d.reps && !d.gar && !d.ven) return;
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--s1);border:1px solid var(--bd);border-radius:8px;padding:12px 14px;margin-bottom:8px';
    card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start">'
      + '<div style="font-size:14px;font-weight:800;color:var(--tx)">' + esc(nom) + '</div>'
      + '<div style="font-size:18px;font-weight:900;color:var(--gr)">' + pesos(d.total) + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:12px;margin-top:8px;font-size:11px;color:var(--mu);flex-wrap:wrap">'
      + (d.reps ? '<span>&#128295; ' + d.reps + ' reparaciones = ' + pesos(d.com_rep) + '</span>' : '')
      + (d.gar  ? '<span style="color:var(--rd)">&#9888; ' + d.gar + ' garantias (no cobran)</span>' : '')
      + (d.ven  ? '<span>&#128201; ' + d.ven + ' ventas = ' + pesos(d.com_ven) + '</span>' : '')
      + '</div>'
      + '<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--bd);display:flex;gap:8px;font-size:11px;color:var(--mu)">'
      + '<span>Com. rep: ' + pesos(COM_CFG.com_rep) + ' c/u</span>'
      + '<span>Com. ven: ' + pesos(COM_CFG.com_ven) + ' c/u</span>'
      + '<button class="btn btn-g btn-sm" onclick="editarComisiones()" style="margin-left:auto;font-size:10px">Editar montos</button>'
      + '</div>';
    wrap.appendChild(card);
  });
}

function editarComisiones() {
  var rep = prompt('Comision por reparacion ($):', COM_CFG.com_rep);
  if (rep === null) return;
  var ven = prompt('Comision por venta ($):', COM_CFG.com_ven);
  if (ven === null) return;
  COM_CFG.com_rep = Number(rep) || COM_CFG.com_rep;
  COM_CFG.com_ven = Number(ven) || COM_CFG.com_ven;
  comGuardarCfg(function(err) {
    if (err) { toast('Error: '+err,'var(--rd)'); return; }
    toast('Montos actualizados');
    renderBalComisiones();
  });
}

// ── COPIAR LISTA PARA PROVEEDOR ─────────────────────────────
function copiarListaProveedor(items) {
  // grupos: key normalizada -> { label original, cantidad }
  var grupos = {};
  items.forEach(function(r) {
    var nom = (r.nombre || '').trim();
    if (!nom) return;
    var mod = (r.modelo || '').trim();
    var label = (mod && nom.toLowerCase().indexOf(mod.toLowerCase()) === -1)
      ? nom + ' — ' + mod
      : nom;
    // Normalizar para agrupar duplicados (minusculas + espacios simples)
    var key = label.toLowerCase().replace(/\s+/g, ' ');
    if (grupos[key]) {
      grupos[key].cant += 1;
    } else {
      grupos[key] = { label: label, cant: 1 };
    }
  });
  var lineas = Object.keys(grupos).map(function(k) {
    var g = grupos[k];
    return '- ' + g.cant + 'x ' + g.label;
  });
  var texto = lineas.join('\n');
  if (!texto) { toast('Sin repuestos en Esperando', 'var(--rd)'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(function() {
      toast('Lista copiada (' + lineas.length + ' items)');
    }).catch(function() { fallbackCopy(texto); });
  } else {
    fallbackCopy(texto);
  }
}

function fallbackCopy(texto) {
  var ta = document.createElement('textarea');
  ta.value = texto;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast('Lista copiada'); }
  catch(e) { toast('Error al copiar', 'var(--rd)'); }
  document.body.removeChild(ta);
}

// ── RENDER VENTAS ────────────────────────────────────
function renderVen() {
  var cnt = el('cnt'); cnt.innerHTML = '';
  var total        = VENTAS.length;
  var totalPesos   = VENTAS.reduce(function(s,v) { return s + Number(v.precio||0); }, 0);
  var totalCosto   = VENTAS.reduce(function(s,v) { return s + Number(v.costo||0); }, 0);
  var totalGanancia = totalPesos - totalCosto;

  var sc = document.createElement('div'); sc.className = 'sc-row';
  sc.innerHTML = '<div class="sc"><div class="scl">Total ventas</div><div class="scv cb">' + total + '</div></div>';
  cnt.appendChild(sc);

  if (!VENTAS.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'padding:32px;text-align:center;color:var(--mu)';
    empty.innerHTML = '<div style="font-size:32px;margin-bottom:12px">&#128201;</div>'
      + '<div style="font-size:15px;font-weight:700;margin-bottom:6px">Sin ventas registradas</div>'
      + '<div style="font-size:13px">Usa "+ Nueva venta" para registrar</div>';
    cnt.appendChild(empty);
    return;
  }

  var MN = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  // Agrupar por mes
  var porMes = {};
  VENTAS.slice().sort(function(a,b){ return (b.fecha||'').localeCompare(a.fecha||''); })
  .forEach(function(v) {
    var k = typeof fechaAMesKey === 'function' ? fechaAMesKey(v.fecha) : (v.fecha||'').slice(0,7);
    if (!porMes[k]) porMes[k] = [];
    porMes[k].push(v);
  });

  Object.keys(porMes).sort().reverse().forEach(function(mesKey) {
    var vensMes = porMes[mesKey];
    var pt = mesKey.split('-');
    var titulo = (MN[parseInt(pt[1])]||pt[1]) + ' ' + pt[0];
    var totalMes = vensMes.reduce(function(s,v){return s+Number(v.precio||0);},0);
    var ganMes   = vensMes.reduce(function(s,v){return s+Number(v.precio||0)-Number(v.costo||0);},0);

    var sec = document.createElement('div'); sec.style.cssText = 'margin-top:16px';
    sec.innerHTML = '<div style="margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--bd)">'
      + '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--acc)">' + titulo + ' — ' + vensMes.length + ' ventas</div>'
      + '</div>';

    vensMes.forEach(function(v) {
      var card = document.createElement('div');
      card.style.cssText = 'background:var(--s1);border:1px solid var(--bd);border-radius:8px;padding:12px 14px;margin-bottom:6px';
      var modelo = [v.modelo, v.capacidad, v.color].filter(Boolean).join(' ');
      var pp = v.parte_pago === 'Si' ? '<span style="font-size:10px;background:rgba(78,154,241,.12);color:var(--bl);border:1px solid rgba(78,154,241,.25);border-radius:10px;padding:2px 7px;margin-left:6px">Parte pago</span>' : '';
      var gan = (v.precio && v.costo && Number(v.costo)) ? Number(v.precio) - Number(v.costo) : null;
      card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">'
        + '<div style="flex:1">'
        + '<div style="font-size:13px;font-weight:800;color:var(--tx)">' + esc(v.nombre||'') + pp + '</div>'
        + '<div style="font-size:12px;color:var(--mu);margin-top:2px">' + esc(modelo) + '</div>'
        + '<div style="font-size:10px;color:var(--mu);font-family:monospace;margin-top:2px">IMEI: ' + esc(v.imei||'') + '</div>'
        + (v.vendedor ? '<div style="font-size:10px;color:var(--mu)">' + esc(v.vendedor) + (v.canal?' via '+esc(v.canal):'') + '</div>' : '')
        + '</div>'
        + '<div style="text-align:right;flex-shrink:0">'
        + '<div style="font-size:16px;font-weight:900;color:var(--gr)">' + pesos(v.precio||0) + '</div>'
        + (v.costo && Number(v.costo) ? '<div style="font-size:10px;color:var(--mu)">Costo: ' + pesos(v.costo) + '</div>' : '')
        + (gan !== null ? '<div style="font-size:11px;font-weight:700;color:' + (gan>=0?'var(--gr)':'var(--rd)') + '">Gan: ' + pesos(gan) + '</div>' : '')
        + '<div style="font-size:10px;color:var(--mu);margin-top:2px">' + esc(v.fecha||'') + '</div>'
        + '</div></div>'
        + '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">'
        + '<button class="btn btn-g btn-sm" data-vid="' + v.id + '" onclick="prtVenta(this.dataset.vid)">Comprobante</button>'
        + '<button class="btn btn-g btn-sm" data-vid="' + v.id + '" onclick="openEditVenta(this.dataset.vid)">Editar</button>'
        + '<button class="btn btn-d btn-sm" data-vid="' + v.id + '" onclick="eliminarVenta(this.dataset.vid)">&#128465;</button>'
        + '</div>';
      sec.appendChild(card);
    });
    cnt.appendChild(sec);
  });
}

// ── RENDER STOCK ─────────────────────────────────────
function renderStock() {
  var cnt = el('cnt'); cnt.innerHTML = '';
  var estados = ['A revisar','En reparacion','Disponible','Reservado','Prestado','Vendido'];
  var colorMap = { 'A revisar':'var(--pu)', 'En reparacion':'var(--acc)', 'Disponible':'var(--gr)',
    'Reservado':'var(--bl)', 'Prestado':'var(--or)', 'Vendido':'var(--mu)' };
  var disp = STOCK.filter(function(s){return s.estado==='Disponible';}).length;
  var rev  = STOCK.filter(function(s){return s.estado==='A revisar';}).length;
  var sc = document.createElement('div'); sc.className = 'sc-row';
  sc.innerHTML = '<div class="sc"><div class="scl">Total</div><div class="scv cb">' + STOCK.length + '</div></div>'
    + '<div class="sc"><div class="scl">Disponibles</div><div class="scv cg">' + disp + '</div></div>'
    + '<div class="sc"><div class="scl">A revisar</div><div class="scv cp">' + rev + '</div></div>';
  cnt.appendChild(sc);
  if (!STOCK.length) {
    cnt.innerHTML += '<div style="padding:32px;text-align:center;color:var(--mu)"><div style="font-size:32px;margin-bottom:12px">&#128241;</div><div style="font-size:15px;font-weight:700">Stock vacio</div></div>';
    return;
  }
  estados.forEach(function(est) {
    var items = STOCK.filter(function(s) { return s.estado === est; });
    if (!items.length) return;
    var sec = document.createElement('div'); sec.style.cssText = 'margin-top:16px';
    sec.innerHTML = '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:' + (colorMap[est]||'var(--mu)') + ';margin-bottom:8px">' + est + ' (' + items.length + ')</div>';
    items.forEach(function(s) {
      var card = document.createElement('div');
      card.style.cssText = 'background:var(--s1);border:1px solid var(--bd);border-radius:8px;padding:12px 14px;margin-bottom:6px';
      var label = [s.modelo, s.capacidad, s.color].filter(Boolean).join(' ');
      var margen = (s.precio_venta && s.precio_costo) ? Number(s.precio_venta)-Number(s.precio_costo) : null;
      card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">'
        + '<div style="flex:1"><div style="font-size:13px;font-weight:800">' + esc(label) + '</div>'
        + (s.detalles ? '<div style="font-size:11px;color:var(--mu);margin-top:2px">' + esc(s.detalles) + '</div>' : '')
        + (s.imei ? '<div style="font-size:10px;color:var(--mu);font-family:monospace">IMEI: ' + esc(s.imei) + '</div>' : '')
        + '</div>'
        + '<div style="text-align:right;flex-shrink:0">'
        + (s.precio_venta ? '<div style="font-size:15px;font-weight:900;color:var(--gr)">' + pesos(s.precio_venta) + '</div>' : '')
        + (s.precio_costo ? '<div style="font-size:10px;color:var(--mu)">Costo: ' + pesos(s.precio_costo) + '</div>' : '')
        + (margen !== null ? '<div style="font-size:10px;font-weight:700;color:' + (margen>=0?'var(--gr)':'var(--rd)') + '">Margen: ' + pesos(margen) + '</div>' : '')
        + '</div></div>'
        + '<div style="display:flex;gap:6px;margin-top:10px;align-items:center;flex-wrap:wrap">'
        + '<select class="rpu-estado-sel" data-sid="' + s.id + '" onchange="cambiarEstadoStock(this.dataset.sid, this.value)" style="color:' + (colorMap[s.estado]||'var(--mu)') + '">'
        + estados.map(function(e) { return '<option' + (e===s.estado?' selected':'') + '>' + e + '</option>'; }).join('')
        + '</select>'
        + '<button class="btn btn-g btn-sm" data-sid="' + s.id + '" onclick="openEditStock(this.dataset.sid)">Editar</button>'
        + '<button class="btn btn-d btn-sm" data-sid="' + s.id + '" onclick="eliminarStock(this.dataset.sid)">&#128465;</button>'
        + '</div>';
      sec.appendChild(card);
    });
    cnt.appendChild(sec);
  });
}

// ── RENDER COTIZADOR ─────────────────────────────────
function renderCot() {
  var cnt = el('cnt'); cnt.innerHTML = '';
  if (!USADOS.length) {
    cnt.innerHTML = '<div style="padding:32px;text-align:center;color:var(--mu)"><div style="font-size:32px;margin-bottom:12px">&#128242;</div><div style="font-size:15px;font-weight:700;margin-bottom:6px">Sin modelos cargados</div><div style="font-size:13px">Usa "Actualizar lista" para cargar precios del proveedor</div></div>';
    return;
  }
  var precios = USADOS.map(function(u){return u.precio_usd;});
  var sc = document.createElement('div'); sc.className = 'sc-row';
  sc.innerHTML = '<div class="sc"><div class="scl">Modelos</div><div class="scv cb">' + USADOS.length + '</div></div>'
    + '<div class="sc"><div class="scl">Desde</div><div class="scv cg">USD ' + Math.min.apply(null,precios) + '</div></div>'
    + '<div class="sc"><div class="scl">Hasta</div><div class="scv cb">USD ' + Math.max.apply(null,precios) + '</div></div>';
  cnt.appendChild(sc);
  var lista = document.createElement('div'); lista.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:12px';
  USADOS.slice().sort(function(a,b){return b.precio_usd-a.precio_usd;}).forEach(function(u) {
    var row = document.createElement('div');
    row.style.cssText = 'background:var(--s1);border:1px solid var(--bd);border-radius:8px;padding:10px 14px;display:flex;align-items:center;cursor:pointer';
    row.innerHTML = '<span style="flex:1;font-size:13px;font-weight:600">' + esc(u.modelo) + '</span>'
      + '<span style="font-size:14px;font-weight:800;color:var(--bl)">USD ' + u.precio_usd + '</span>';
    row.addEventListener('click', (function(modelo){
      return function() {
        var found = USADOS.find(function(x){return x.modelo===modelo;});
        if (!found) return;
        _cotSel = found; _cotRes = [found];
        cotReset();
        el('cotQ').value = found.modelo;
        el('cotQ').classList.add('sel');
        el('cotPanel').style.display = '';
        cotCalcular();
        openM('mCot');
      };
    })(u.modelo));
    lista.appendChild(row);
  });
  cnt.appendChild(lista);
}

// ── RENDER SEGUIMIENTOS ───────────────────────────────
function renderSeg() {
  var cnt = el('cnt'); cnt.innerHTML = '';
  var lista = calcSeguimientos();
  var pendAlta = lista.filter(function(s){ return s.estado==='pendiente' && s.urgencia==='alta'; }).length;
  var pendProx = lista.filter(function(s){ return s.estado==='pendiente' && s.urgencia==='proxima'; }).length;

  // Stats
  var sc = document.createElement('div'); sc.className = 'sc-row';
  sc.innerHTML = '<div class="sc"><div class="scl">Urgentes</div><div class="scv cr">' + pendAlta + '</div></div>'
    + '<div class="sc"><div class="scl">Proximos</div><div class="scv co">' + pendProx + '</div></div>'
    + '<div class="sc"><div class="scl">Total</div><div class="scv cb">' + lista.length + '</div></div>'
    + '<div class="sc" onclick="segEditarDescuento()" style="cursor:pointer"><div class="scl">Descuento</div><div class="scv cg">' + SEG_DESC + '%</div></div>';
  cnt.appendChild(sc);

  // Seguimientos pendientes
  if (lista.filter(function(s){return s.estado==='pendiente';}).length) {
    var secP = document.createElement('div'); secP.style.cssText = 'margin-top:16px';
    secP.innerHTML = '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--acc);margin-bottom:8px">Pendientes</div>';
    lista.filter(function(s){return s.estado==='pendiente';}).forEach(function(s) {
      secP.appendChild(mkSegCard(s));
    });
    cnt.appendChild(secP);
  }

  // Contactados / cerrados
  var cerrados = lista.filter(function(s){return s.estado!=='pendiente';});
  if (cerrados.length) {
    var secC = document.createElement('div'); secC.style.cssText = 'margin-top:16px';
    secC.innerHTML = '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--mu);margin-bottom:8px">Gestionados</div>';
    cerrados.forEach(function(s) { secC.appendChild(mkSegCard(s)); });
    cnt.appendChild(secC);
  }

  if (!lista.length) {
    cnt.innerHTML += '<div style="padding:32px;text-align:center;color:var(--mu)">'
      + '<div style="font-size:32px;margin-bottom:12px">&#127881;</div>'
      + '<div style="font-size:15px;font-weight:700;margin-bottom:6px">Sin seguimientos pendientes</div>'
      + '<div style="font-size:13px">Los clientes apareceran automaticamente cuando llegue el momento</div>'
      + '</div>';
  }

  // Estadisticas
  var divStats = document.createElement('div'); divStats.style.cssText = 'margin-top:24px';

  // Podio
  var podio = calcPodio();
  if (podio.length) {
    var medallas = ['🥇','🥈','🥉'];
    divStats.innerHTML += '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--acc);margin-bottom:8px">Podio de clientes</div>'
      + podio.map(function(p, i) {
        return '<div style="background:var(--s1);border:1px solid var(--bd);border-radius:8px;padding:10px 14px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">'
          + '<div><span style="font-size:20px;margin-right:8px">' + (medallas[i]||'') + '</span>'
          + '<span style="font-size:13px;font-weight:700">' + esc(p.nombre) + '</span></div>'
          + '<div style="font-size:13px;font-weight:800;color:var(--acc)">' + p.total + ' transacciones</div>'
          + '</div>';
      }).join('');
  }

  // Modelos mas vendidos
  var modelos = calcModelos();
  if (modelos.length) {
    divStats.innerHTML += '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--bl);margin-bottom:8px;margin-top:16px">Modelos mas vendidos</div>'
      + modelos.map(function(m, i) {
        return '<div style="background:var(--s1);border:1px solid var(--bd);border-radius:8px;padding:10px 14px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">'
          + '<div><span style="font-size:11px;color:var(--mu);margin-right:8px">#' + (i+1) + '</span>'
          + '<span style="font-size:13px;font-weight:700">' + esc(m.modelo) + '</span></div>'
          + '<div style="text-align:right">'
          + '<div style="font-size:13px;font-weight:800;color:var(--gr)">' + m.ventas + ' vendidos</div>'
          + '</div></div>';
      }).join('');
  }

  cnt.appendChild(divStats);
}

function mkSegCard(s) {
  var card = document.createElement('div');
  var urgColor = s.urgencia === 'alta' ? 'var(--rd)' : 'var(--acc)';
  var estColors = { pendiente:'var(--acc)', contactado:'var(--bl)', interesado:'var(--gr)', compro:'var(--gr)', no_interesa:'var(--mu)' };
  var estLabels = { pendiente:'Pendiente', contactado:'Contactado', interesado:'Interesado', compro:'Compro', no_interesa:'No interesa' };
  var tipoLabel = { reparacion:'Reparacion', venta_90:'Venta 90d', venta_365:'Venta 1 anio' };

  card.style.cssText = 'background:var(--s1);border:1px solid var(--bd);border-left:3px solid ' + urgColor + ';border-radius:8px;padding:12px 14px;margin-bottom:6px';
  card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">'
    + '<div style="flex:1">'
    + '<div style="font-size:13px;font-weight:800">' + esc(s.nombre) + '</div>'
    + '<div style="font-size:11px;color:var(--mu);margin-top:2px">' + esc(s.equipo) + '</div>'
    + '<div style="font-size:10px;color:var(--mu);margin-top:2px">' + (tipoLabel[s.tipo]||s.tipo) + ' — dia ' + s.dias + '</div>'
    + '</div>'
    + '<div style="text-align:right;flex-shrink:0">'
    + '<select style="background:var(--s2);border:1px solid var(--bd);border-radius:6px;padding:3px 6px;font-size:11px;color:' + (estColors[s.estado]||'var(--mu)') + ';outline:none" data-sid="' + s.id + '" onchange="segSetEst(this)">'
    + ['pendiente','contactado','interesado','compro','no_interesa'].map(function(e) {
        return '<option value="' + e + '"' + (e===s.estado?' selected':'') + '>' + (estLabels[e]||e) + '</option>';
      }).join('')
    + '</select>'
    + '</div></div>'
    + '<div style="margin-top:8px">'
    + '<button class="btn btn-g btn-sm" style="background:rgba(37,211,102,.1);color:#25D366;border-color:rgba(37,211,102,.3)" data-sid="' + s.id + '" onclick="segWA(this.dataset.sid)">&#128242; WhatsApp</button>'
    + '</div>';
  return card;
}

function segSetEst(sel) {
  var sid = sel.dataset.sid;
  var nuevoEst = sel.value;
  var lista = calcSeguimientos();
  var seg = lista.find(function(s){ return s.id === sid; });
  if (seg) segCambiarEstado(seg, nuevoEst);
}

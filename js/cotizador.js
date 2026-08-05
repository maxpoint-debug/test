// ===================== COTIZADOR DE USADOS =====================
var USADOS = [];

function cotLoadUsados(docs) { USADOS = docs || []; }

var _cotRes = [], _cotIdx = -1, _cotSel = null;

function openCotizador() {
  cotReset();
  openM('mCot');
}

function cotReset() {
  setVal('cotQ', '');
  setVal('cotBat', '100');
  var d = el('cotDrop'); if (d) d.classList.remove('open');
  var q = el('cotQ'); if (q) q.classList.remove('sel');
  if (el('cotEstetica')) el('cotEstetica').value = 'ok';
  if (el('cotPantalla')) el('cotPantalla').value = 'ok';
  if (el('cotPanel'))    el('cotPanel').style.display = 'none';
  if (el('cotResultado')) el('cotResultado').style.display = 'none';
  _cotSel = null;
  _cotExtras = [];
  cotRenderExtras();
  if (el('btnCotWA'))    el('btnCotWA').style.display = 'none';
  if (el('btnCotPrint')) el('btnCotPrint').style.display = 'none';
}

function cotBuscar(q) {
  var drop = el('cotDrop');
  q = (q || '').trim();
  if (q.length < 2 || !USADOS.length) { drop.classList.remove('open'); return; }
  var words = q.toLowerCase().split(/\s+/);
  _cotRes = USADOS.filter(function(u) {
    return words.every(function(w) { return u.modelo.toLowerCase().includes(w); });
  }).slice(0, 10);
  if (!_cotRes.length) {
    drop.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--mu);text-align:center">Sin resultados</div>';
    drop.classList.add('open'); return;
  }
  drop.innerHTML = _cotRes.map(function(u, i) {
    var lbl = u.modelo;
    words.forEach(function(w) {
      var re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')','gi');
      lbl = lbl.replace(re,'<mark style="background:rgba(240,180,41,.22);color:var(--acc);border-radius:2px;font-style:normal">$1</mark>');
    });
    return '<div class="cat-item" onmousedown="cotElegir(' + i + ')">'
      + '<span style="flex:1;font-size:13px">' + lbl + '</span>'
      + '<span style="font-size:12px;color:var(--bl);font-weight:700">USD ' + u.precio_usd + '</span>'
      + '</div>';
  }).join('');
  _cotIdx = -1;
  drop.classList.add('open');
}

function cotKeyDown(e) {
  var drop = el('cotDrop');
  var items = drop.querySelectorAll('.cat-item');
  if (!drop.classList.contains('open')) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _cotIdx = Math.min(_cotIdx+1, items.length-1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _cotIdx = Math.max(_cotIdx-1, 0); }
  else if (e.key === 'Enter' && _cotIdx >= 0) { e.preventDefault(); cotElegir(_cotIdx); return; }
  else if (e.key === 'Escape') { drop.classList.remove('open'); return; }
  items.forEach(function(el,i) { el.classList.toggle('act', i===_cotIdx); });
}

function cotElegir(i) {
  var u = _cotRes[i]; if (!u) return;
  _cotSel = u;
  el('cotQ').value = u.modelo;
  el('cotQ').classList.add('sel');
  el('cotDrop').classList.remove('open');
  el('cotPanel').style.display = '';
  cotCalcular();
}

// Array de descuentos extras [ { lbl, usd } ]
var _cotExtras = [];

function cotAgregarExtra() {
  var id = 'extra_' + Date.now();
  _cotExtras.push({ id: id, lbl: '', usd: 0 });
  cotRenderExtras();
}

function cotQuitarExtra(id) {
  _cotExtras = _cotExtras.filter(function(e) { return e.id !== id; });
  cotRenderExtras();
  cotCalcular();
}

function cotRenderExtras() {
  var wrap = el('cotExtrasWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  _cotExtras.forEach(function(extra) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;position:relative';
    row.innerHTML =
      '<div style="flex:1;position:relative">'
      + '<input type="text" placeholder="Buscar repuesto o descripcion..." autocomplete="off"'
      + ' style="width:100%;background:var(--s2);border:1px solid var(--bd);border-radius:6px;padding:7px 10px;color:var(--tx);font-size:12px;outline:none"'
      + ' data-id="' + extra.id + '"'
      + ' value="' + (extra.lbl || '') + '"'
      + ' oninput="cotExtraBuscar(this)"'
      + '/>'
      + '<div class="cat-drop" id="ed_' + extra.id + '"></div>'
      + '</div>'
      + '<input type="number" placeholder="USD" min="0"'
      + ' style="width:70px;background:var(--s2);border:1px solid var(--bd);border-radius:6px;padding:7px 8px;color:var(--rd);font-size:12px;font-weight:700;text-align:center;outline:none"'
      + ' data-id="' + extra.id + '"'
      + ' value="' + (extra.usd || '') + '"'
      + ' oninput="cotExtraSetUsd(this)"'
      + '/>'
      + '<button data-eid="' + extra.id + '" onclick="cotQuitarExtra(this.dataset.eid)" style="background:none;border:none;color:var(--mu);cursor:pointer;font-size:16px;padding:0 4px">&#10006;</button>';
      + ' style="background:none;border:none;color:var(--mu);cursor:pointer;font-size:16px;padding:0 4px">x</button>';
    wrap.appendChild(row);
  });
}

function cotExtraBuscar(input) {
  var id  = input.dataset.id;
  var q   = input.value.trim();
  var drop = el('ed_' + id);
  if (!drop) return;
  if (q.length < 2 || !window.CATALOGO || !window.CATALOGO.length) { drop.classList.remove('open'); return; }
  var words = q.toLowerCase().split(/\s+/);
  var res = (window.CATALOGO || []).filter(function(p) {
    return words.every(function(w) { return p.label.toLowerCase().includes(w); });
  }).slice(0, 8);
  if (!res.length) { drop.classList.remove('open'); return; }
  drop.innerHTML = res.map(function(p) {
    return '<div class="cat-item" data-lbl="' + p.label.replace(/"/g,'&quot;') + '" data-usd="' + p.costo_usd + '" data-eid="' + id + '" onmousedown="cotExtraElegirEl(this)">' + '<span style="flex:1;font-size:12px">' + p.label + '</span>' + '<span style="font-size:11px;color:var(--bl);font-weight:700;margin-left:8px">USD ' + p.costo_usd + '</span>' + '</div>';
      + '<span style="flex:1;font-size:12px">' + p.label + '</span>'
      + '<span style="font-size:11px;color:var(--bl);font-weight:700;margin-left:8px">USD ' + p.costo_usd + '</span>'
      + '</div>';
  }).join('');
  drop.classList.add('open');
  // Actualizar label en array
  var extra = _cotExtras.find(function(e) { return e.id === id; });
  if (extra) extra.lbl = input.value;
}

function cotExtraElegirEl(el) {
  cotExtraElegir(el.dataset.eid, el.dataset.lbl, parseFloat(el.dataset.usd));
}

function cotExtraElegir(id, lbl, usd) {
  var extra = _cotExtras.find(function(e) { return e.id === id; });
  if (!extra) return;
  extra.lbl = lbl;
  extra.usd = Math.round(usd);
  cotRenderExtras();
  cotCalcular();
  var drop = el('ed_' + id); if (drop) drop.classList.remove('open');
}

function cotExtraSetUsd(input) {
  var id  = input.dataset.id;
  var extra = _cotExtras.find(function(e) { return e.id === id; });
  if (extra) { extra.usd = parseFloat(input.value) || 0; cotCalcular(); }
}

function cotCalcular() {
  if (!_cotSel) return;
  var base     = _cotSel.precio_usd;
  var bat      = parseInt(el('cotBat').value) || 100;
  var estetica = el('cotEstetica').value;
  var pantalla = el('cotPantalla').value;

  // Descuento bateria
  var descBat = 0, descBatLbl = '';
  if (bat < 90) {
    var mCorto = _cotSel.modelo.toLowerCase();
    // Extraer solo el numero del modelo (ej: "14", "13 pro", "15 pro max")
    var mNum = mCorto.match(/\d+(?:\s*(?:pro\s*max|pro|plus|air|mini))?/);
    var mNumStr = mNum ? mNum[0].trim() : null;
    var batCat = null;
    if (mNumStr) {
      batCat = (window.CATALOGO || []).find(function(p) {
        var lbl = p.label.toLowerCase();
        return lbl.includes('bater') && lbl.includes('iphone') && lbl.includes(mNumStr);
      });
    }
    descBat    = batCat ? Math.round(batCat.costo_usd) : 20;
    descBatLbl = batCat ? 'Bateria (' + batCat.label + ')' : 'Bateria (estimado)';
  }

  // Descuento estetica
  var descEst = 0, descEstLbl = '';
  if (estetica === 'leve')    { descEst = 15; descEstLbl = 'Detalles leves'; }
  if (estetica === 'marcado') { descEst = 35; descEstLbl = 'Muy marcado'; }

  // Descuento pantalla
  var descPan = 0, descPanLbl = '';
  if (pantalla === 'rota') {
    var mCorto2 = _cotSel.modelo.toLowerCase();
    var mNum2 = mCorto2.match(/\d+(?:\s*(?:pro\s*max|pro|plus|air|mini))?/);
    var mNumStr2 = mNum2 ? mNum2[0].trim() : null;
    var modCat = null;
    if (mNumStr2) {
      modCat = (window.CATALOGO || []).find(function(p) {
        var lbl = p.label.toLowerCase();
        return lbl.includes('modulo') && lbl.includes('iphone') && lbl.includes(mNumStr2);
      });
    }
    descPan    = modCat ? Math.round(modCat.costo_usd) : 50;
    descPanLbl = modCat ? 'Modulo (' + modCat.label + ')' : 'Pantalla (estimado)';
  }

  var descExtras = _cotExtras.reduce(function(s,e) { return s + (e.usd||0); }, 0);
  var total = Math.max(0, base - descBat - descEst - descPan - descExtras);

  var row = function(lbl, val, color) {
    return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);font-size:13px">'
      + '<span style="color:var(--mu)">' + lbl + '</span>'
      + '<span style="font-weight:700;color:' + color + '">' + val + '</span></div>';
  };

  var html = row('Precio base', 'USD ' + base, 'var(--tx)')
  if (descBat) html += row(descBatLbl, '- USD ' + descBat, 'var(--rd)');
  if (descEst) html += row(descEstLbl, '- USD ' + descEst, 'var(--rd)');
  if (descPan) html += row(descPanLbl, '- USD ' + descPan, 'var(--rd)');
  _cotExtras.forEach(function(e) {
    if (e.usd) html += row(e.lbl || 'Descuento', '- USD ' + e.usd, 'var(--rd)');
  });

  html += '<div style="background:rgba(45,206,137,.08);border:1px solid rgba(45,206,137,.25);'
    + 'border-radius:8px;padding:14px;text-align:center;margin-top:10px">'
    + '<div style="font-size:10px;color:var(--mu);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Precio de compra sugerido</div>'
    + '<div style="font-size:34px;font-weight:900;color:var(--gr)">USD ' + total + '</div>'
    + '</div>';

  el('cotResultadoInner').innerHTML = html;
  el('cotResultado').style.display = '';
  if (el('btnCotWA'))    el('btnCotWA').style.display = '';
  if (el('btnCotPrint')) el('btnCotPrint').style.display = '';
}

// ── PARSER LISTA WHATSAPP ────────────────────────────────────
function openListaParser() {
  var pin = prompt('PIN:');
  if (pin !== PIN) { toast('PIN incorrecto', 'var(--rd)'); return; }
  setVal('listaInput', '');
  el('listaPreview').style.display = 'none';
  el('listaPreviewContent').innerHTML = '';
  el('btnSubirLista').disabled = true;
  openM('mLista');
}

var _listaItems = [];

function parsearLista() {
  var txt = val('listaInput');
  if (!txt.trim()) return;
  _listaItems = [];
  var lineas = txt.split('\n');
  var modeloActual = null;

  lineas.forEach(function(linea) {
    linea = linea.trim();
    if (!linea) return;

    // Detectar modelo: tiene numero de iphone + capacidad
    var mMod = linea.match(/(?:i?phone\s*)?(\d{1,2}\s*(?:pro\s*max|pro|plus|air|mini)?\s*\d{3}\s*(?:gb|tb))/i);
    if (mMod) {
      var mod = mMod[1].trim().replace(/\s+/g,' ')
        .replace(/(\d+)\s*(gb|tb)/i, '$1$2')
        .replace(/gb/i,'GB').replace(/tb/i,'TB')
        .replace(/pro\s*max/i,'Pro Max').replace(/\bpro\b/i,'Pro')
        .replace(/\bplus\b/i,'Plus').replace(/\bair\b/i,'Air').replace(/\bmini\b/i,'Mini');
      if (!/^iphone/i.test(mod)) mod = 'iPhone ' + mod;
      modeloActual = mod.trim();
    }

    // Detectar precio x1
    var mPrecio = linea.match(/(\d{3,4})x1\s*[\uD83D\uDCAB\uD83D\uDCB5💵]/)
      || linea.match(/^(\d{3,4})\s*[\uD83D\uDCAB\uD83D\uDCB5💵]/)
      || linea.match(/(\d{3,4})💵/);

    if (mPrecio && modeloActual) {
      var precio = parseInt(mPrecio[1]);
      if (precio >= 100 && precio <= 5000) {
        var existe = _listaItems.find(function(x) { return x.modelo === modeloActual; });
        if (existe) { if (precio < existe.precio_usd) existe.precio_usd = precio; }
        else _listaItems.push({ modelo: modeloActual, precio_usd: precio });
      }
    }
  });

  if (!_listaItems.length) {
    el('listaPreviewContent').innerHTML = '<div style="color:var(--rd);font-size:12px">No se detectaron modelos. Revisá el formato.</div>';
    el('listaPreview').style.display = '';
    el('btnSubirLista').disabled = true;
    return;
  }

  el('listaPreviewContent').innerHTML = _listaItems.map(function(u) {
    var existe = USADOS.find(function(x) { return x.modelo === u.modelo; });
    var tag = !existe
      ? '<span style="color:var(--gr);font-size:10px;font-weight:700"> NUEVO</span>'
      : u.precio_usd < existe.precio_usd
        ? '<span style="color:var(--acc);font-size:10px;font-weight:700"> BAJA</span>'
        : '<span style="color:var(--mu);font-size:10px;font-weight:700"> sin cambio</span>';
    return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);font-size:12px">'
      + '<span>' + u.modelo + tag + '</span>'
      + '<span style="color:var(--bl);font-weight:700">USD ' + u.precio_usd + '</span>'
      + '</div>';
  }).join('');

  el('listaPreview').style.display = '';
  el('btnSubirLista').disabled = false;
}

function subirLista() {
  if (!_listaItems.length) return;
  var base = USADOS.slice();
  var nuevos = 0, actualizados = 0;
  _listaItems.forEach(function(item) {
    var idx = base.findIndex(function(x) { return x.modelo === item.modelo; });
    if (idx === -1) { base.push(item); nuevos++; }
    else if (item.precio_usd < base[idx].precio_usd) { base[idx].precio_usd = item.precio_usd; actualizados++; }
  });
  var btn = el('btnSubirLista');
  btn.disabled = true; btn.textContent = 'Guardando...';
  FB.setUsados(base, function(err) {
    btn.disabled = false; btn.textContent = 'Actualizar base';
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    USADOS = base;
    closeM('mLista');
    toast('Base actualizada — ' + nuevos + ' nuevos, ' + actualizados + ' actualizados');
  });
}

// ── WHATSAPP + IMPRIMIR ──────────────────────────────

function cotAbrirWA() {
  if (!_cotSel) return;
  setVal('waNombre', '');
  setVal('waTel', '');
  openM('mCotWA');
}

function cotEnviarWA() {
  var nombre = val('waNombre').trim();
  var tel    = val('waTel').trim().replace(/[^0-9]/g, '');
  if (!tel) { toast('Ingresa el telefono', 'var(--rd)'); return; }

  var base     = _cotSel.precio_usd;
  var bat      = parseInt(el('cotBat').value) || 100;
  var estetica = el('cotEstetica').value;
  var pantalla = el('cotPantalla').value;
  var descExtras = _cotExtras.reduce(function(s,e) { return s + (e.usd||0); }, 0);

  var totalEl = el('cotResultadoInner');
  var totalMatch = totalEl ? totalEl.innerHTML.match(/USD (\d+)<\/div><\/div>/) : null;
  var total = totalMatch ? parseInt(totalMatch[1]) : (base - descExtras);

  var partes = [];
  if (nombre) partes.push('Hola ' + nombre + '!');
  else partes.push('Hola!');
  partes.push('');
  partes.push('Te paso la cotizacion de tu equipo:');
  partes.push('');
  partes.push('Modelo: ' + _cotSel.modelo);
  if (bat < 90) partes.push('Bateria: ' + bat + '%');
  if (estetica === 'leve')    partes.push('Estetica: Detalles leves');
  if (estetica === 'marcado') partes.push('Estetica: Muy marcado');
  if (pantalla === 'rota')    partes.push('Pantalla: Rota');
  _cotExtras.forEach(function(e) {
    if (e.usd) partes.push((e.lbl || 'Descuento') + ': - USD ' + e.usd);
  });
  partes.push('');
  partes.push('Valor de toma en parte de pago: USD ' + total);
  partes.push('');
  partes.push('Cualquier consulta estamos disponibles!');
  partes.push('MaxPoint - Sistema de Taller');

  var msg = partes.join('\n');
  var url = 'https://wa.me/' + tel + '?text=' + encodeURIComponent(msg);
  window.open(url, '_blank');
  closeM('mCotWA');
}
function cotImprimir() {
  if (!_cotSel) return;
  var inner = el('cotResultadoInner');
  if (!inner) return;
  var totalMatch = inner.innerHTML.match(/USD (\d+)<\/div><\/div>/);
  var total = totalMatch ? totalMatch[1] : '?';

  var w = window.open('', '_blank');
  w.document.write(
    '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<title>Cotizacion MaxPoint</title>'
    + '<style>body{font-family:system-ui,sans-serif;max-width:400px;margin:20px auto;color:#111}'
    + 'h2{font-size:18px;margin-bottom:4px}h3{font-size:14px;color:#555;margin:0 0 16px}'
    + '.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;font-size:14px}'
    + '.total{background:#f0fff4;border:1px solid #86efac;border-radius:8px;padding:14px;text-align:center;margin-top:16px}'
    + '.total div:first-child{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px}'
    + '.total div:last-child{font-size:28px;font-weight:900;color:#16a34a}'
    + '.footer{margin-top:20px;font-size:11px;color:#999;text-align:center}'
    + '@media print{button{display:none}}'
    + '</style></head><body>'
    + '<h2>Cotizacion MaxPoint</h2>'
    + '<h3>' + _cotSel.modelo + '</h3>'
    + inner.innerHTML.replace(/var\(--[a-z]+\)/g,'#666').replace(/var\(--rd\)/g,'#dc2626').replace(/var\(--tx\)/g,'#111').replace(/var\(--bd\)/g,'#e5e7eb')
    + '<div class="total"><div>Valor de toma en parte de pago</div><div>USD ' + total + '</div></div>'
    + '<div class="footer">MaxPoint — Sistema de Taller</div>'
    + '<br><button onclick="window.print()" style="width:100%;padding:10px;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">Imprimir</button>'
    + '</body></html>'
  );
  w.document.close();
}

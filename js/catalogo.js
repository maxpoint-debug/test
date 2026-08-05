// ===================== CATALOGO =====================
// Buscador de catalogo en formulario de repuesto
// Carga del Excel y subida a Firebase (solo admin)

// ── Estado local ─────────────────────────────────────
var _catResults  = [];
var _catIdx      = -1;
var _catSel      = null;   // producto seleccionado del catalogo
var _catItems    = [];     // productos parseados del Excel antes de subir
var CFG_CAT      = { usd: 1425, mult: 3, desc: 0 };

// Cargar config desde Firebase al iniciar
// (se llama desde firebase.js cuando llega el snapshot de config)
function catLoadConfig(cfg) {
  if (!cfg) return;
  CFG_CAT.usd  = cfg.usd  || CFG_CAT.usd;
  CFG_CAT.mult = cfg.mult || CFG_CAT.mult;
  CFG_CAT.desc = cfg.desc != null ? cfg.desc : CFG_CAT.desc;
}

function catPrecioFinal(costoUsd) {
  var ars    = costoUsd * CFG_CAT.usd;
  var venta  = ars * CFG_CAT.mult;
  var final  = venta * (1 - CFG_CAT.desc / 100);
  return { ars: Math.round(ars), venta: Math.round(venta), final: Math.round(final) };
}

// ── Autocomplete en formulario repuesto ──────────────
function catBuscar(q) {
  var drop = el('catDrop');
  q = q.trim();
  if (q.length < 2 || !CATALOGO.length) { drop.classList.remove('open'); return; }

  var words = q.toLowerCase().split(/\s+/);
  _catResults = CATALOGO.filter(function(p) {
    return words.every(function(w) { return (p.label || '').toLowerCase().includes(w); });
  }).slice(0, 10);

  if (!_catResults.length) {
    drop.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--mu);text-align:center">Sin resultados</div>';
    drop.classList.add('open'); return;
  }

  drop.innerHTML = _catResults.map(function(p, i) {
    var label = p.label || '';
    words.forEach(function(w) {
      var re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      label = label.replace(re, '<mark style="background:rgba(240,180,41,.25);color:var(--acc);border-radius:2px;font-style:normal">$1</mark>');
    });
    var pr = catPrecioFinal(p.costo_usd);
    return '<div class="cat-item" data-i="' + i + '" onmousedown="catSeleccionar(' + i + ')">'
      + '<div style="flex:1;font-size:13px">' + label + '</div>'
      + '<div style="font-size:10px;color:var(--mu);font-weight:700;margin:0 6px">' + (p.tipo || '') + '</div>'
      + '<div style="font-size:11px;color:var(--gr);font-weight:600;white-space:nowrap">$' + pr.final.toLocaleString('es-AR') + '</div>'
      + '</div>';
  }).join('');

  _catIdx = -1;
  drop.classList.add('open');
}

function catKeyDown(e) {
  var drop = el('catDrop');
  var items = drop.querySelectorAll('.cat-item');
  if (!drop.classList.contains('open')) return;
  if (e.key === 'ArrowDown')  { e.preventDefault(); _catIdx = Math.min(_catIdx + 1, items.length - 1); }
  else if (e.key === 'ArrowUp')   { e.preventDefault(); _catIdx = Math.max(_catIdx - 1, 0); }
  else if (e.key === 'Enter' && _catIdx >= 0) { e.preventDefault(); catSeleccionar(_catIdx); return; }
  else if (e.key === 'Escape') { drop.classList.remove('open'); return; }
  items.forEach(function(el, i) { el.style.background = i === _catIdx ? 'rgba(240,180,41,.08)' : ''; });
}

function catSeleccionar(i) {
  var p = _catResults[i];
  if (!p) return;
  _catSel = p;

  var pr = catPrecioFinal(p.costo_usd);

  // Rellenar campos del formulario
  el('catQ').value = p.label;
  el('catDrop').classList.remove('open');
  setVal('rpNom', p.label);
  setVal('rpCos', pr.ars);          // costo interno ARS
  setVal('rpPrecio', pr.final);     // precio sugerido al cliente

  // Mostrar panel de costos
  el('catUSD').textContent   = 'USD ' + p.costo_usd;
  el('catARS').textContent   = '$' + pr.ars.toLocaleString('es-AR');
  el('catVenta').textContent = '$' + pr.final.toLocaleString('es-AR');
  el('catTipo').textContent  = p.tipo || '';
  el('catPanel').style.display = '';
}

function catLimpiar() {
  _catSel = null;
  setVal('catQ', '');
  setVal('rpNom', '');
  setVal('rpCos', '');
  el('catPanel').style.display = 'none';
  el('catDrop').classList.remove('open');
}

// ── Carga del Excel (admin) ───────────────────────────
function openCatAdmin() {
  var pin = prompt('PIN:');
  if (pin !== PIN) { toast('PIN incorrecto', 'var(--rd)'); return; }
  // Resetear estado
  _catItems = [];
  el('catUploadLabel').textContent = 'Tocar para seleccionar archivo Excel';
  el('catUploadLabel').style.color = '';
  el('catFile').value = '';
  el('catPreview').style.display = 'none';
  el('catPreviewContent').innerHTML = '';
  el('btnSubirCat').disabled = true;
  el('catBackupInfo').style.display = 'none';
  // Cargar config actual en los inputs
  el('catUsdVal').value = CFG_CAT.usd;
  el('catMult').value   = CFG_CAT.mult;
  el('catDesc').value   = CFG_CAT.desc;
  openM('mCat');
}

function catCargarExcel(input) {
  var file = input.files[0];
  if (!file) return;
  el('catUploadLabel').textContent = 'Leyendo ' + file.name + '...';

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data    = new Uint8Array(e.target.result);
      var wb      = XLSX.read(data, { type: 'uint8array' });
      var ws      = wb.Sheets['PEDIDO'];
      if (!ws) throw new Error('No se encontro la hoja PEDIDO');

      // Leer dolar de celda I4
      var dolarCell = ws['I4'];
      var usdVal = dolarCell ? parseFloat(dolarCell.v) : 0;
      if (usdVal > 500) el('catUsdVal').value = usdVal;

      // Parsear productos desde fila 7
      var rows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 6 });
      var items = [];
      rows.forEach(function(row) {
        var cod       = row[0];
        var prod      = row[1];
        var modelo    = row[2];
        var color     = row[3];
        var tipo      = row[5];
        var costoUsd  = row[10];
        if (cod && prod && modelo && typeof costoUsd === 'number' && costoUsd > 0) {
          var label = String(prod) + ' ' + String(modelo) + (color ? ' ' + String(color) : '');
          items.push({
            cod:       String(cod),
            label:     label.trim(),
            tipo:      String(tipo || ''),
            costo_usd: costoUsd,
          });
        }
      });

      if (!items.length) throw new Error('No se encontraron productos validos');

      _catItems = items;
      el('catUploadLabel').textContent = file.name + ' — ' + items.length + ' productos OK';
      el('catUploadLabel').closest('.cat-upload-area').classList.add('loaded');

      // Preview: primeros 5 + resumen por tipo
      var porTipo = {};
      items.forEach(function(p) { porTipo[p.tipo] = (porTipo[p.tipo] || 0) + 1; });
      var resumen = Object.keys(porTipo).map(function(t) {
        return '<span style="margin-right:10px"><b>' + t + '</b> ' + porTipo[t] + '</span>';
      }).join('');
      var ejemplos = items.slice(0, 5).map(function(p) {
        return '<div style="padding:3px 0;border-bottom:1px solid var(--bd);font-size:12px">'
          + '<span style="color:var(--tx)">' + p.label + '</span>'
          + '<span style="float:right;color:var(--bl)">USD ' + p.costo_usd + '</span></div>';
      }).join('');

      el('catPreviewContent').innerHTML =
        '<div style="margin-bottom:8px;font-size:11px;color:var(--mu)">' + resumen + '</div>'
        + ejemplos
        + '<div style="padding-top:6px;font-size:11px;color:var(--mu)">...y ' + (items.length - 5) + ' mas</div>';
      el('catPreview').style.display = '';
      el('btnSubirCat').disabled = false;

    } catch(err) {
      el('catUploadLabel').textContent = 'Error: ' + err.message;
      el('catUploadLabel').style.color = 'var(--rd)';
      toast('Error leyendo Excel: ' + err.message, 'var(--rd)');
    }
  };
  reader.readAsArrayBuffer(file);
}

function catSubir() {
  if (!_catItems.length) { toast('Carga un Excel primero', 'var(--rd)'); return; }

  var usd  = parseFloat(el('catUsdVal').value) || CFG_CAT.usd;
  var mult = parseFloat(el('catMult').value)   || CFG_CAT.mult;
  var desc = parseFloat(el('catDesc').value)   || 0;

  var btn = el('btnSubirCat');
  btn.disabled = true;
  btn.textContent = 'Subiendo...';
  syncLoad('Subiendo catalogo...');

  // Guardar config primero
  var cfg = { usd: usd, mult: mult, desc: desc, updated: hoy() };
  FB.setConfig(cfg, function(errCfg) {
    if (errCfg) {
      btn.disabled = false; btn.textContent = 'Subir catalogo';
      toast('Error guardando config: ' + errCfg, 'var(--rd)');
      syncErr('Error config');
      return;
    }
    CFG_CAT = { usd: usd, mult: mult, desc: desc };

    // Subir productos
    FB.setCat(_catItems, function(errCat) {
      btn.disabled = false; btn.textContent = 'Subir catalogo';
      if (errCat) {
        toast('Error subiendo catalogo: ' + errCat, 'var(--rd)');
        syncErr('Error catalogo');
        return;
      }
      closeM('mCat');
      toast('Catalogo actualizado — ' + _catItems.length + ' productos', 'var(--gr)');
      syncOk('Catalogo actualizado');
      el('catBackupInfo').style.display = 'none';
    });
  });
}

// ── Autocomplete cliente en formulario repuesto ──────
function rpCliSugg(q) {
  var drop = el('rpCliDrop');
  if (!drop) return;
  q = q.trim();
  if (q.length < 2) { drop.classList.remove('open'); return; }
  var ql = q.toLowerCase();
  // Nombres unicos del historial
  var vistos = {};
  var sugs = [];
  (window.REPS || []).forEach(function(r) {
    var n = (r.nombre || '').trim();
    if (!n) return;
    var key = n.toLowerCase();
    if (!vistos[key] && key.includes(ql)) { vistos[key] = true; sugs.push(n); }
  });
  sugs = sugs.slice(0, 8);
  if (!sugs.length) { drop.classList.remove('open'); return; }
  drop.innerHTML = sugs.map(function(n) {
    return '<div class="cat-item" onmousedown="rpCliElegir(this.dataset.n)" data-n="' + n.replace(/"/g, '&quot;') + '">' + n + '</div>';
      + n + '</div>';
  }).join('');
  drop.classList.add('open');
}

function rpCliElegir(n) {
  setVal('rpCli', n);
  var drop = el('rpCliDrop');
  if (drop) drop.classList.remove('open');
}

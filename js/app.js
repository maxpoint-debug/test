// ===================== APP — init y navegacion =====================

function showView(v, navEl) {
  // Cerrar sidebar en mobile al navegar
  if (window.innerWidth <= 700) closeSidebar();
  VIEW = v;
  PAGE = 1;

  // Nav highlight
  document.querySelectorAll('.ni').forEach(function(n) { n.classList.remove('active'); });
  if (navEl) navEl.classList.add('active');

  // Titulo
  var titulos = { reps: 'Reparaciones', rpus: 'Repuestos', seg: 'Seguimientos', ven: 'Ventas', stock: 'Stock', cot: 'Cotizador', cli: 'Clientes', pag: 'Pagos', bal: 'Balance' };
  el('topT').textContent = titulos[v] || v;

  // Botones topbar
  setTopActions(v);

  render();
}

function setTopActions(v) {
  var ta = el('topA');
  ta.innerHTML = '';
  if (v === 'reps') {
    ta.appendChild(mkBtn('btn-g btn-sm', '⬆️ Importar historico', importarHist));
    ta.appendChild(mkBtn('btn-g btn-sm', '📥 CSV', expCSV));
    ta.appendChild(mkBtn('btn-p', '＋ Nuevo ingreso', openNewRep));
  } else if (v === 'rpus') {
    ta.appendChild(mkBtn('btn-p', '＋ Nuevo repuesto', openNewRepuesto));
  } else if (v === 'ven') {
    ta.appendChild(mkBtn('btn-p', '+  Nueva venta', openNewVenta));
  } else if (v === 'stock') {
    ta.appendChild(mkBtn('btn-g btn-sm', 'Copiar lista WA', copiarListaStock));
    ta.appendChild(mkBtn('btn-p', '+  Agregar equipo', function() { openNewStock(null); }));
  } else if (v === 'cot') {
    ta.appendChild(mkBtn('btn-g btn-sm', 'Actualizar lista', openListaParser));
    ta.appendChild(mkBtn('btn-p', '+  Cotizar', openCotizador));
  } else if (v === 'bal') {
    ta.appendChild(mkBtn('btn-g btn-sm', 'Actualizar catalogo', openCatAdmin));
  }
}

// Cerrar autocompletes al hacer click fuera
document.addEventListener('click', function(e) {
  if (!e.target.closest('#wNom'))    el('acNomL').style.display = 'none';
  if (!e.target.closest('#wEq'))     el('acEqL').style.display  = 'none';
  if (!e.target.closest('#catWrap'))   { var d = el('catDrop');    if (d) d.classList.remove('open'); }
  if (!e.target.closest('#rpCliWrap')) { var d2 = el('rpCliDrop'); if (d2) d2.classList.remove('open'); }
});

// Init
setTopActions('reps');

function toggleSidebar() {
  var sb  = document.getElementById('sidebar');
  var ov  = document.getElementById('sidebarOverlay');
  if (!sb) return;
  var open = sb.classList.contains('open');
  if (open) { closeSidebar(); } else { openSidebar(); }
}

function openSidebar() {
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.add('open');
  if (ov) ov.classList.add('open');
}

function closeSidebar() {
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
}

// Exponer handlers usados desde HTML inline (compatibilidad Safari/iOS).
window.toggleSidebar = toggleSidebar;
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;

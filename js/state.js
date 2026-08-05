// ===================== ESTADO GLOBAL =====================
// Una sola fuente de verdad. Todos los otros módulos leen/escriben aquí.

var REPS = [];        // Array de reparaciones (desde Firebase)
var RPUS = [];        // Array de repuestos (desde Firebase)

var VIEW    = 'reps'; // Vista activa
var SEARCH  = '';     // Texto de búsqueda
var FILT    = '';     // Filtro de estado
var PAGE    = 1;
var PZ      = 50;     // Registros por página

// IDs de operaciones en curso
var _eid      = null;        // ID de reparación en edición
var _detId    = null;        // ID de detalle abierto (para auto-refresh)
var _recId    = null;        // ID de recibo abierto
var _pagoId   = null;        // ID de reparación con pago pendiente
var _pagoMedio = 'Efectivo'; // Medio de pago seleccionado
var _sugg     = null;        // Repuesto sugerido pendiente { nombre, equipo }
var _afterRpu = null;        // Acción post-guardado de repuesto

var PIN = '4354'; // ← CAMBIAR antes de usar

// ===================== CATALOGO =====================
var CATALOGO   = [];   // productos del proveedor (desde Firebase)
var USADOS     = [];   // equipos usados para cotizar
var VENTAS     = [];   // registro de ventas
var STOCK      = [];   // stock de equipos
var CAT_CONFIG = { usd: 1425, mult: 3, descuento: 0 };

// ===================== FIREBASE OBJECT =====================
// Este objeto es sobreescrito por js/firebase.js una vez que
// el módulo ES carga. Así el código regular puede llamar FB.add()
// sin importar si Firebase ya cargó o no.
window.FB = {
  add:   function(d, cb)      { cb('Firebase no conectado todavía'); },
  addId: function(id, d, cb)  { cb('Firebase no conectado todavía'); },
  upd:   function(id, d, cb)  { cb('Firebase no conectado todavía'); },
  del:   function(id, cb)     { cb('Firebase no conectado todavía'); },
  addR:  function(d, cb)      { cb('Firebase no conectado todavía'); },
  updR:  function(id, d, cb)  { cb('Firebase no conectado todavía'); },
  delR:     function(id, cb)     { cb('Firebase no conectado todavía'); },
  setCat:   function(items, cb)  { cb('Firebase no conectado todavía'); },
  setConfig:function(d, cb)      { cb('Firebase no conectado todavía'); },
  getConfig:function(cb)         { cb(null, {}); },
};

// ===================== CONSTANTES =====================
var ESTADOS = ['Ingresado', 'En proceso', 'Listo', 'Entregado', 'No aprobado', 'Garantia'];
var PAGOS   = ['Pendiente', 'Parcial', 'Pagado'];
var TECNICOS = ['', 'Tomas', 'Matias'];

var REGLAS_REPUESTO = [
  { palabras: ['pantalla','display','modulo','tactil','touch','lcd','vidrio'], rep: 'Modulo pantalla' },
  { palabras: ['bateria','carga lenta','no carga'],                            rep: 'Bateria' },
  { palabras: ['pin de carga','conector','puerto'],                            rep: 'Pin de carga' },
  { palabras: ['camara','foto'],                                               rep: 'Camara' },
  { palabras: ['auricular','parlante','altavoz','sonido','speaker','microfono'], rep: 'Altavoz/Microfono' },
  { palabras: ['flex','boton','power','volumen'],                              rep: 'Flex botones' },
  { palabras: ['carcasa','marco','chasis','tapa'],                             rep: 'Carcasa' },
  { palabras: ['placa','no enciende','no prende','no inicia','se apaga'],      rep: 'Reparacion de placa' },
];

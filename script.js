(() => {
'use strict';

/* =====================================================================
   FROSTBITT – isfiskespill i én fil (HTML5 Canvas + Web Audio)
   ===================================================================== */

// ---------------------------------------------------------------------
// Konstanter
// ---------------------------------------------------------------------
const W = 960, H = 600;               // logisk oppløsning
const ICE_TOP = 240;                  // toppen av isen (der fiskeren står)
const ICE_BOT = 272;                  // undersiden av isen (vannet starter)
const MAXD = 285;                     // maks dybde for kroken (px under isen)
const HOLE_W = 26;                    // bredde på et isfiskehull
const SC = 1.2;                       // skala på fiskeren
const LOCAL_FRONT = 22;               // hvor langt foran fiskeren hullet/borret er (lokalt)
const FRONT = LOCAL_FRONT * SC;       // samme avstand i verdenskoordinater
const WALK_SPEED = 140;               // px/sek
const HOOK_SPEED = 110;               // px/sek
const GAME_HOUR = 60;                 // 1 spilltime = 60 ekte sekunder (5 timer = 5 minutter)
const RARE_PTS = 50;                  // fisk med minst så mange poeng er "sjelden" og gir nytt nivå
const TEMP_NORMAL = 37.0, TEMP_DEAD = 28.0;   // kroppstemperatur (°C) ved start og ved død
const bodyTemp = () => TEMP_NORMAL - clamp(game.cold / 5, 0, 1) * (TEMP_NORMAL - TEMP_DEAD);
const ROUND_TIME = 5 * GAME_HOUR;     // runden varer 5 spilltimer = 5 minutter
const levelNeed = L => 30 * L * (L + 1);   // totalpoeng som trengs for å nå nivå L+1: 60, 180, 360, 600, 900 …
const MAX_COLD = 5;                   // 5 timer uten varme = død
const COFFEE_HEAT = 3;                // en kopp kaffe tar kulden 3 timer tilbake
const DRILL_TIME = 2.5;               // sekunder å bore et hull
const TARGET_FISH = 12;               // antall fisker i vannet
const KENNEL_X = 740, KENNEL_Y = 229, KENNEL_S = .7;   // lite hundehus på land, like ved hytta
const FONT = '"Inter","SF Pro Display","Segoe UI",system-ui,-apple-system,Roboto,"Helvetica Neue",Arial,sans-serif';
const SHADOW = 'rgba(2,12,30,0.58)';  // fargen på fiskesilhuettene

// Fiskeslag. depth = område (0 = rett under isen, 1 = bunn), speed = svømmefart,
// effort = antall tastetrykk for å sveive inn, pull = hvor fort fisken drar tilbake,
// bite = bitelyst (sannsynlighet per sekund når munnen er ved kroken).
const FISH = {
  abbor:  { name:'Abbor',  acc:'en Abbor',  pts:10,  weight:30, max:4, depth:[.25,.60], speed:[40,70],   len:40,  hr:.36, effort:7,  pull:.12, bite:1.6, body:'#6f9238', belly:'#e0da86', fin:'#e0662a', finX:-.02, stripes:true },
  mort:   { name:'Mort',   acc:'en Mort',   pts:15,  weight:28, max:4, depth:[.05,.30], speed:[50,80],   len:36,  hr:.32, effort:7,  pull:.12, bite:1.4, body:'#8b99a3', belly:'#eef1f2', fin:'#d94a3a', finX:-.02 },
  sik:    { name:'Sik',    acc:'en Sik',    pts:30,  weight:14, max:2, depth:[.40,.70], speed:[45,65],   len:54,  hr:.30, effort:10, pull:.15, bite:.9,  body:'#a3b3bb', belly:'#f6f8f9', fin:'#7e8d94', finX:-.02 },
  orret:  { name:'Ørret',  acc:'en Ørret',  pts:50,  weight:4,  max:2, depth:[.30,.65], speed:[110,150], len:62,  hr:.28, effort:12, pull:.20, bite:.35, tol:45,  body:'#7d6c46', belly:'#ecdcaa', fin:'#b7894a', finX:-.02, spots:'#4a2a1a' },
  royer:  { name:'Røye',   acc:'en Røye',   pts:75,  weight:3.5, max:2, depth:[.70,.95], speed:[40,60],   len:60,  hr:.27, effort:13, pull:.18, bite:.35, tol:40,  body:'#4b6e7d', belly:'#ee6a30', fin:'#f6f0e0', finX:-.02 },
  gjedde: { name:'Gjedde', acc:'en Gjedde', pts:100, weight:1.2, max:1, depth:[.50,.85], speed:[60,90],   len:118, hr:.18, effort:18, pull:.20, bite:.25, tol:35,  body:'#4f6e30', belly:'#dcdba4', fin:'#7b8c3a', finX:-.27, spots:'#d9d98a' },
  // Nye innsjøfisker som låses opp for hvert nytt nivå (minLevel)
  harr:   { name:'Harr',   acc:'en Harr',   pts:40,  weight:10, max:2, minLevel:2, depth:[.15,.45], speed:[80,110],  len:50,  hr:.30, effort:11, pull:.18, bite:.6,  tol:70, body:'#7d7a9c', belly:'#d7d3e6', fin:'#7a4a9a', finX:-.02, spots:'#2a2540' },
  lake:   { name:'Lake',   acc:'en Lake',   pts:60,  weight:6,  max:2, minLevel:3, depth:[.75,1.0],  speed:[30,50],   len:76,  hr:.24, effort:14, pull:.18, bite:.4,  tol:40, body:'#6b6a3a', belly:'#cfc88a', fin:'#5a5a30', finX:-.1,  spots:'#3a3a1a' },
  al:     { name:'Ål',     acc:'en Ål',     pts:80,  weight:4,  max:1, minLevel:4, depth:[.80,1.0],  speed:[35,55],   len:105, hr:.11, effort:16, pull:.20, bite:.3,  tol:35, body:'#2d3a2a', belly:'#b5b05a', fin:'#2d3a2a', finX:-.1 },
  laks:   { name:'Laks',   acc:'en Laks',   pts:120, weight:3,  max:1, minLevel:5, depth:[.35,.70],  speed:[120,160], len:92,  hr:.26, effort:20, pull:.24, bite:.25, tol:35, body:'#7a8fa0', belly:'#f3e9e6', fin:'#6a7f90', finX:-.02, spots:'#202a35' },
  gulloret:{ name:'Gullørret', acc:'en Gullørret', pts:250, weight:1.5, max:1, minLevel:6, depth:[.40,.80], speed:[100,140], len:70, hr:.30, effort:24, pull:.26, bite:.15, tol:30, body:'#f2c230', belly:'#fff3b0', fin:'#ff9a1a', finX:-.02, spots:'#b8620a' },
  // Flere sjeldne storfisker – vanskelige å få, men gir mye poeng
  gjors:  { name:'Gjørs',  acc:'en Gjørs',  pts:150, weight:2.5, max:1, minLevel:4, depth:[.60,.95], speed:[70,100],  len:84,  hr:.22, effort:18, pull:.18, bite:.20, tol:32, body:'#7a8a5a', belly:'#e5e0b8', fin:'#6a7a4a', finX:-.05, stripes:true },
  stororret:{ name:'Storørret', acc:'en Storørret', pts:200, weight:1.8, max:1, minLevel:5, depth:[.45,.80], speed:[100,140], len:104, hr:.27, effort:20, pull:.20, bite:.15, tol:30, body:'#6b5a3a', belly:'#f0e0b0', fin:'#b87a3a', finX:-.02, spots:'#3a1a10' },
  kongegjedde:{ name:'Kongegjedde', acc:'en Kongegjedde', pts:300, weight:.8, max:1, minLevel:6, depth:[.55,.92], speed:[60,90], len:150, hr:.17, effort:22, pull:.20, bite:.12, tol:28, body:'#8a8a2a', belly:'#f2e7a0', fin:'#b5a030', finX:-.27, spots:'#f6ee9a' },
  frostfisk:{ name:'Frostfisken', acc:'Frostfisken', pts:500, weight:.5, max:1, minLevel:7, depth:[.30,.95], speed:[90,130], len:96, hr:.30, effort:24, pull:.20, bite:.10, tol:25, body:'#bfe9ff', belly:'#ffffff', fin:'#7fd0ff', finX:-.02, spots:'#ffffff' },
  stovel: { name:'Gammel støvel', acc:'en gammel støvel', pts:0, weight:4, max:1, depth:[.60,.95], speed:[12,22], len:38, hr:0, effort:5, pull:.05, bite:.8, body:'#6b4a2b', belly:'#4a3320', fin:'#000', finX:0 }
};
const FISH_KEYS = Object.keys(FISH);
FISH_KEYS.forEach(k => FISH[k].key = k);

const BOOT_JOKES = [
  'Å nei, en gammel støvel! Den har sett bedre dager.',
  'En støvel! Hvem mistet den her?',
  'Støvelen var full av vann. 0 poeng.',
  'Gammel støvel! Nesten like god som en gjedde…'
];

// Hudfarger (stegvis): normal, blek, lyseblå, knallblå
const SKIN = ['#f0c29a', '#ece0d7', '#a9d9f2', '#2f80ff'];
const BAR_COL = ['#ffb347', '#efe3c4', '#8fd3ff', '#2f80ff'];
const skinStage = c => c < 1.2 ? 0 : c < 2.4 ? 1 : c < 3.6 ? 2 : 3;

// ---------------------------------------------------------------------
// Hjelpefunksjoner
// ---------------------------------------------------------------------
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const fmt1 = n => n.toFixed(1).replace('.', ',');
// Seedet tilfeldighetsgenerator slik at bakgrunnen ser lik ut hver gang
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const canvas = $('game'), ctx = canvas.getContext('2d');
const stage = $('stage');
let scale = 1;
let bg = null, bgSky = null, bgNight = null, bgMount = null, bgForest = null, bgHills = null;   // forhåndstegnede lag (land/vann, dagshimmel, nattehimmel)

// ---------------------------------------------------------------------
// Lyd (Web Audio API – alt syntetiseres i koden)
// ---------------------------------------------------------------------
let AC = null, master = null, noiseBuf = null, muted = false;

function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain();
    master.gain.value = 0.5;
    master.connect(AC.destination);
    // Ett sekund hvit støy som gjenbrukes til alle støylyder
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}

// Enkel tone med frekvensglid og volumkurve
function tone(o) {
  if (!AC || muted) return;
  const t0 = AC.currentTime + (o.delay || 0), dur = o.dur || 0.15;
  const osc = AC.createOscillator(), g = AC.createGain();
  osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + dur);
  const v = o.vol || 0.15;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

// Filtrert støy (skrape, plask, slurp)
function noise(o) {
  if (!AC || muted) return;
  const t0 = AC.currentTime + (o.delay || 0), dur = o.dur || 0.15;
  const src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const fl = AC.createBiquadFilter(); fl.type = o.type || 'bandpass';
  fl.frequency.setValueAtTime(o.f, t0);
  if (o.f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + dur);
  fl.Q.value = o.q || 1;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(fl); fl.connect(g); g.connect(master);
  src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.02);
}

// Kontinuerlig vindlyd under snøstorm: filtrert støy med sakte svingende tonehøyde og vindkast
let wind = null;
function windStart() {
  if (!AC || wind) return;
  const src = AC.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = .7;
  const g = AC.createGain(); g.gain.value = 0;
  const lfo = AC.createOscillator(); lfo.frequency.value = .22;
  const lg = AC.createGain(); lg.gain.value = 380; lfo.connect(lg); lg.connect(bp.frequency);
  const lfo2 = AC.createOscillator(); lfo2.frequency.value = .13;
  const lg2 = AC.createGain(); lg2.gain.value = .07; lfo2.connect(lg2); lg2.connect(g.gain);
  src.connect(bp); bp.connect(g); g.connect(master);
  src.start(); lfo.start(); lfo2.start();
  wind = { src, g, lfo, lfo2 };
}
function windSet(v) { if (wind) wind.g.gain.setTargetAtTime(muted ? 0 : v, AC.currentTime, .3); }
function windStop() {
  if (!wind) return;
  const w = wind; wind = null;
  w.g.gain.setTargetAtTime(0, AC.currentTime, .3);
  setTimeout(() => { try { w.src.stop(); w.lfo.stop(); w.lfo2.stop(); } catch (e) {} }, 1500);
}

const sfx = {
  scrape(p) { noise({ dur: .08, vol: .28, f: 1400 + p * 1800, q: 2.5 }); tone({ f: 110 + p * 60, type: 'sawtooth', dur: .07, vol: .05 }); },
  splash()  { noise({ dur: .5, vol: .4, f: 3200, f2: 350, type: 'lowpass' }); tone({ f: 300, f2: 800, type: 'sine', dur: .12, vol: .1, delay: .05 }); },
  plop()    { tone({ f: 500, f2: 180, type: 'sine', dur: .12, vol: .15 }); noise({ dur: .15, vol: .12, f: 1800, f2: 500, type: 'lowpass' }); },
  holeDone(){ sfx.splash(); tone({ f: 660, type: 'triangle', dur: .15, vol: .12, delay: .1 }); tone({ f: 990, type: 'triangle', dur: .25, vol: .12, delay: .22 }); },
  bite()    { tone({ f: 880, type: 'triangle', dur: .12, vol: .22 }); tone({ f: 1318, type: 'triangle', dur: .18, vol: .22, delay: .1 }); tone({ f: 1760, type: 'sine', dur: .35, vol: .2, delay: .2 }); },
  crank()   { tone({ f: 320 + Math.random() * 120, f2: 180, dur: .05, vol: .09 }); noise({ dur: .03, vol: .08, f: 2500, q: 1 }); },
  slurp()   { noise({ dur: .4, vol: .35, f: 400, f2: 2000, q: 9 }); noise({ dur: .35, vol: .3, f: 1900, f2: 500, q: 9, delay: .45 });
              tone({ f: 240, f2: 190, type: 'triangle', dur: .4, vol: .15, delay: .85 }); },
  catchF(r) { const n = r ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047];
              n.forEach((f, i) => tone({ f, type: 'square', dur: .14, vol: .13, delay: i * .08 })); },
  boot()    { tone({ f: 260, f2: 120, type: 'sawtooth', dur: .3, vol: .15 }); tone({ f: 200, f2: 80, type: 'sawtooth', dur: .45, vol: .15, delay: .32 }); },
  lose()    { tone({ f: 500, f2: 150, type: 'square', dur: .35, vol: .14 }); noise({ dur: .2, vol: .15, f: 1200, f2: 300 }); },
  empty()   { tone({ f: 150, type: 'square', dur: .12, vol: .14 }); tone({ f: 130, type: 'square', dur: .18, vol: .14, delay: .15 }); },
  hole0()   { tone({ f: 200, f2: 100, type: 'triangle', dur: .4, vol: .15 }); },
  freeze()  { tone({ f: 700, f2: 50, type: 'sine', dur: 1.8, vol: .22 });
              for (let i = 0; i < 6; i++) noise({ dur: .05, vol: .25, f: 3000 + Math.random() * 3000, q: 4, type: 'highpass', delay: i * .22 }); },
  levelUp() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({ f, type: 'square', dur: .16, vol: .14, delay: i * .09 })); },
  tick()    { tone({ f: 900, f2: 700, type: 'triangle', dur: .04, vol: .06 }); },
  yip()     { tone({ f: 900, f2: 1500, type: 'square', dur: .08, vol: .1 }); tone({ f: 1100, f2: 1700, type: 'square', dur: .1, vol: .1, delay: .12 }); },
  bark()    { tone({ f: 440, f2: 250, type: 'sawtooth', dur: .12, vol: .18 }); tone({ f: 400, f2: 220, type: 'sawtooth', dur: .15, vol: .18, delay: .17 }); noise({ dur: .1, vol: .1, f: 900, q: 1.5 }); },
  steal()   { tone({ f: 500, f2: 120, type: 'sawtooth', dur: .35, vol: .14 }); noise({ dur: .2, vol: .15, f: 900, f2: 300 }); },
  shoo()    { noise({ dur: .25, vol: .25, f: 1500, f2: 4000, q: 2 }); tone({ f: 1400, f2: 1800, type: 'square', dur: .08, vol: .08, delay: .05 }); },
  gust()    { noise({ dur: 1.4, vol: .35, f: 250, f2: 1100, q: .8 }); tone({ f: 330, f2: 260, type: 'triangle', dur: .6, vol: .08 }); },
  jig()     { tone({ f: 820, f2: 1250, type: 'sine', dur: .07, vol: .12 }); tone({ f: 2400, type: 'triangle', dur: .04, vol: .05, delay: .03 }); noise({ dur: .06, vol: .06, f: 3500, q: 3 }); },
  click()   { tone({ f: 600, dur: .05, vol: .1 }); }
};

// ---------------------------------------------------------------------
// Tilstand
// ---------------------------------------------------------------------
// Landskap i bakgrunnen avhenger av nivå: 0 = fjell (nivå 1–2), 1 = skog (nivå 3–4), 2 = nordlys (nivå 5+)
const THEME_NAMES = ['Fjell', 'Skog', 'Nordlys'];
const themeFor = L => L >= 5 ? 2 : L >= 3 ? 1 : 0;
let themeCur = 0, themePrev = 0, themeT = 1;
let mode = 'title';        // 'title' | 'play' | 'frozen' | 'over'
let paused = false;
let clock = 0;             // tid som alltid går (til animasjon)

const keys = { left: false, right: false, up: false, down: false, space: false };

const game = {};           // nullstilles i resetGame()
const player = {};
let holes = [], fishes = [], parts = [], bubbles = [], popups = [], logs = [], flakes = [], stormFlakes = [], clouds = [];
let best = { score: 0 };

// Butikk: poeng fra rundene samles i en lommebok og brukes på bedre utstyr (lagres i nettleseren)
const SHOP = {
  rod:     { name: 'Fiskestang', tiers: [
    { name: 'Glassfiberstang', price: 300,  desc: '+15 % sveivekraft. Sjeldne fisker biter 20 % lettere og er 35 % vanligere' },
    { name: 'Teleskopstang',   price: 900,  desc: '+30 % sveivekraft, +10 % bitelyst. Sjeldne fisker biter 40 % lettere og er 70 % vanligere' },
    { name: 'Mesterstang',     price: 2000, desc: '+45 % sveivekraft, +20 % bitelyst. Sjeldne fisker biter 60 % lettere og er 105 % vanligere' } ] },
  jig:     { name: 'Pilk', tiers: [
    { name: 'Gullpilk',     price: 350,  desc: '+15 % pilkeeffekt. Sjeldne fisker biter 12 % lettere og er 25 % vanligere' },
    { name: 'Diamantpilk',  price: 1100, desc: '+30 % pilkeeffekt. Sjeldne fisker biter 24 % lettere og er 50 % vanligere' } ] },
  auger:   { name: 'Isbor', tiers: [
    { name: 'Kraftig isbor', price: 400,  desc: 'Bor hull på 1,9 sekunder' },
    { name: 'Motorbor',      price: 1200, desc: 'Bor hull på 1,2 sekunder' } ] },
  thermos: { name: 'Termos', tiers: [
    { name: 'Stor termos',   price: 500,  desc: '+1 kopp kaffe (4 totalt)' },
    { name: 'Dobbel termos', price: 1400, desc: '+2 kopper kaffe (5 totalt)' } ] },
  suit:    { name: 'Klær', tiers: [
    { name: 'Ullundertøy',         price: 600,  desc: 'Du fryser 10 % saktere' },
    { name: 'Isolert vinterdress', price: 1600, desc: 'Du fryser 20 % saktere' } ] }
};
let shop = { wallet: 0, rod: 0, jig: 0, auger: 0, thermos: 0, suit: 0 };
const ROD_COL = ['#7a5a36', '#3b9a6a', '#2f7fd0', '#d9a21a'];
const drillTime = () => [DRILL_TIME, 1.9, 1.2][shop.auger];
function loadShop() {
  try {
    const b = JSON.parse(localStorage.getItem('frostbitt_butikk'));
    if (b && typeof b === 'object') Object.keys(shop).forEach(k => { if (typeof b[k] === 'number') shop[k] = b[k]; });
  } catch (e) {}
}
function saveShop() { try { localStorage.setItem('frostbitt_butikk', JSON.stringify(shop)); } catch (e) {} }

function resetGame() {
  Object.assign(game, {
    time: 0, cold: 0, coffee: 3 + shop.thermos, coffeeMax: 3 + shop.thermos, rodCrank: [1, 1.15, 1.3, 1.45][shop.rod], rodBite: [1, 1, 1.1, 1.2][shop.rod], jigE: 0, jigOff: 0, lastJig: -9, score: 0, caught: {}, totalCaught: 0,
    fight: null, hookDepth: 0, hookVisY: ICE_BOT, napp: 0, flash: 0,
    noExitUntil: 0, spawnT: 2, freezeT: 0, lastStage: 0, hintFlash: 0,
    catchLog: [], catchVer: 0, wind: 'NORDAVIND', storm: 0, stormT: rnd(15, 30), stormI: 0, stormAlert: 0, hintMsg: '', hintMsgT: 0, seen: {}, speciesBonus: 0, shake: 0, endReason: '', dog: { x: KENNEL_X, dir: 1, state: 'idle', t: 0, runT: 0, moving: false }, pile: [], pileX: W / 2 - 70, fox: null, foxT: rnd(25, 35), stolen: 0, level: 1, banner: 0, bannerText: '', nibble: 0
  });
  FISH_KEYS.forEach(k => game.caught[k] = 0);
  windStop();
  themeCur = themePrev = 0; themeT = 1;
  Object.assign(player, {
    x: W / 2, dir: 1, state: 'walk', hole: null, moving: false, walkT: 0,
    sit: 0, drill: 0, drilling: false, scrapeT: 0, chipAcc: 0, drinkTimer: 0, tipX: 0, tipY: 0
  });
  holes = []; parts = []; popups = []; logs = []; bubbles = [];
  fishes = [];
  while (fishes.length < TARGET_FISH) {
    const k = pickFishKey();
    fishes.push(makeFish(k, false));
  }
}

function initAmbient() {
  flakes = [];
  for (let i = 0; i < 120; i++) flakes.push({ x: rnd(0, W), y: rnd(0, ICE_TOP), v: rnd(18, 48), s: Math.random() < .3 ? 3 : 2, ph: rnd(0, 6.28) });
  stormFlakes = [];
  for (let i = 0; i < 240; i++) stormFlakes.push({ x: rnd(-100, W), y: rnd(-20, ICE_TOP), v: rnd(220, 380), vx: rnd(260, 420), len: rnd(.03, .06) });
  clouds = [];
  for (let i = 0; i < 4; i++) clouds.push({ x: rnd(0, W), y: rnd(26, 84), v: rnd(4, 11), s: rnd(.8, 1.4) });
}

// ---------------------------------------------------------------------
// Logg, partikler og popups
// ---------------------------------------------------------------------
function log(text, col) { logs.unshift({ text, col: col || '#ffffff', t: 0 }); if (logs.length > 5) logs.pop(); }

function addPart(p) { parts.push(p); }
function chips(x, n) {
  for (let i = 0; i < n; i++) addPart({ x: x + rnd(-4, 4), y: ICE_TOP - 1, vx: rnd(-70, 70), vy: rnd(-130, -40), g: 420,
    life: rnd(.4, .8), max: .8, size: Math.random() < .5 ? 2 : 3, col: Math.random() < .5 ? '#ffffff' : '#bfe8ff' });
}
function splash(x, y, n) {
  for (let i = 0; i < n; i++) addPart({ x: x + rnd(-6, 6), y, vx: rnd(-60, 60), vy: rnd(-230, -80), g: 520,
    life: rnd(.4, .8), max: .8, size: 3, col: Math.random() < .5 ? '#9fdcff' : '#ffffff' });
}
function steam(x, y) {
  addPart({ x: x + rnd(-4, 4), y, vx: rnd(-6, 6), vy: rnd(-34, -18), g: 0, life: rnd(.7, 1.2), max: 1.2, size: 4, col: '#ffffff', soft: true });
}
function addBubble(x, y) { bubbles.push({ x, y, vy: rnd(-40, -20), r: rnd(1.5, 3.5), ph: rnd(0, 6.28) }); }
function popup(o) { popups.push(Object.assign({ t: 0, life: 1.6 }, o)); }

// ---------------------------------------------------------------------
// Fisk
// ---------------------------------------------------------------------
function pickFishKey() {
  const counts = {};
  fishes.forEach(f => counts[f.key] = (counts[f.key] || 0) + 1);
  let total = 0;
  const cand = FISH_KEYS.filter(k => (counts[k] || 0) < FISH[k].max && (FISH[k].minLevel || 1) <= game.level);
  // Bedre stang og pilk gjør at sjeldne arter er vanligere i innsjøen
  const wt = k => FISH[k].weight * (FISH[k].pts >= RARE_PTS ? 1 + .35 * shop.rod + .25 * shop.jig : 1);
  cand.forEach(k => total += wt(k));
  let r = Math.random() * total;
  for (const k of cand) { r -= wt(k); if (r <= 0) return k; }
  return cand[0] || 'abbor';
}

function makeFish(key, fromEdge) {
  const T = FISH[key];
  const f = {
    key, T, L: T.len * rnd(.92, 1.1), dir: Math.random() < .5 ? -1 : 1,
    speed: rnd(T.speed[0], T.speed[1]), phase: rnd(0, 6.28), t: rnd(0, 10),
    state: 'swim', cooldown: 0, hover: 0, flee: 0, turnT: rnd(6, 14), driftT: rnd(3, 8)
  };
  f.baseY = pickDepthY(T);
  f.y = f.baseY;
  f.x = fromEdge ? (f.dir > 0 ? -80 : W + 80) : rnd(40, W - 40);
  return f;
}
function pickDepthY(T) { return ICE_BOT + 16 + rnd(T.depth[0], T.depth[1]) * (MAXD - 40); }

// Oppdaterer en fisk. hook = {x,y} hvis snøret er i vannet, ellers null.
function updateFish(f, dt, hook) {
  f.t += dt;
  if (f.state === 'hooked') return;
  f.cooldown = Math.max(0, f.cooldown - dt);
  let spd = f.speed * (1 + .05 * (game.level - 1));
  if (f.flee > 0) { f.flee -= dt; spd *= 2.4; }
  let target = f.baseY, ease = 22, attracted = false;
  const T = f.T;

  if (hook && f.cooldown <= 0 && Math.abs(hook.x - f.x) < 230 + 140 * hook.e && Math.abs(hook.y - f.baseY) < (T.tol || 85) * (1 + .4 * hook.e) * (T.pts >= RARE_PTS ? 1 + .12 * shop.rod + .1 * shop.jig : 1)) {   // pilking lokker fisk fra lenger unna
    attracted = true;
    target = hook.y; ease = 45;
    const dxC = hook.x - f.x;
    // Snu mot kroken hvis den er bak fisken
    if (f.dir * dxC < 0 && Math.abs(dxC) > f.L * .5) f.dir = Math.sign(dxC);
    const desired = hook.x - f.dir * f.L * .5;            // sentrum når munnen er ved kroken
    const rem = f.dir * (desired - f.x);
    const s = rem > 0 ? Math.min(spd * .8, Math.max(10, rem * 1.2)) : 0;
    f.x += f.dir * s * dt;
    const mouthX = f.x + f.dir * f.L * .5;
    if (Math.abs(mouthX - hook.x) < 16 && Math.abs(f.y - hook.y) < 16) {
      f.hover += dt; game.nibble = 1;
      if (Math.random() < T.bite * biteFactor(hook.e) * (game.level >= 4 && T.pts >= RARE_PTS ? 1.2 : 1) * (T.pts >= RARE_PTS ? 1 + .2 * shop.rod + .12 * shop.jig : 1) / (1 + .2 * (game.level - 1)) * dt) { startFight(f); return; }   // blinkende pilk: +20 % på sjeldne fisker   // biter sjeldnere på høyere nivå
      if (f.hover > (T.pts >= RARE_PTS ? 2.5 + .4 * (shop.rod + shop.jig) : 4)) { f.cooldown = 8; f.hover = 0; f.dir = -f.dir; }   // mistet interessen
    } else f.hover = Math.max(0, f.hover - dt);
  }

  if (!attracted) {
    f.hover = 0;
    f.x += f.dir * spd * dt;
    if (f.x < -90) f.dir = 1;
    if (f.x > W + 90) f.dir = -1;
    f.turnT -= dt;
    if (f.turnT <= 0) { if (Math.random() < .4) f.dir = -f.dir; f.turnT = rnd(6, 14); }
    f.driftT -= dt;
    if (f.driftT <= 0) { f.baseY = pickDepthY(T); f.driftT = rnd(4, 9); }
  }
  f.y += clamp(target - f.y, -ease * dt, ease * dt);
}

function maintainFish(dt) {
  game.spawnT -= dt;
  if (game.spawnT > 0) return;
  game.spawnT = 2.5 * (1 + .6 * (game.level - 1));   // lengre ventetid mellom nye fisker på høyere nivå
  if (fishes.length < TARGET_FISH) fishes.push(makeFish(pickFishKey(), true));
}

// ---------------------------------------------------------------------
// Spillogikk
// ---------------------------------------------------------------------
const frontX = () => player.x + player.dir * FRONT;
// Nærmeste hull som ikke er tomt (tomme, tilfrosne hull hindrer ikke nye hull)
function nearHole(x, r) {
  let b = null, bd = r;
  for (const h of holes) { if (h.empty) continue; const d = Math.abs(h.x - x); if (d < bd) { bd = d; b = h; } }
  return b;
}
function findHole(x, r) {
  let b = null, bd = r;
  for (const h of holes) { const d = Math.abs(h.x - x); if (d < bd) { bd = d; b = h; } }
  return b;
}

function finishHole(x) {
  holes = holes.filter(h => !(h.empty && Math.abs(h.x - x) < 30));     // bor gjennom et tilfrosset hull = nytt hull
  holes.push({ x, catches: Math.random() < .5 ? 2 : 3, empty: false, freeze: 0 });
  player.drill = 0;
  splash(x, ICE_TOP, 16);
  sfx.holeDone();
  log('Hullet er klart! Trykk ↓ for å fiske.', '#9fe3ff');
}

function enterFishing(h) {
  player.state = 'fish'; player.hole = h;
  game.hookDepth = 0; game.fight = null;
  sfx.plop(); splash(h.x, ICE_TOP, 4);
}
// Pilking: rykk kroken opp og la den synke i jevn rytme – det lokker fisken til å bite
function jig() {
  if (player.state !== 'fish' || game.fight || mode !== 'play' || paused) return;
  const gap = game.time - game.lastJig; game.lastJig = game.time;
  const gain = (gap < .25 ? .1 : gap < 1.4 ? .5 : .3) * [1, 1.15, 1.3][shop.jig] * (shop.rod >= 3 ? 1.3 : 1);
  game.jigE = Math.min(1, game.jigE + gain);
  game.jigOff = Math.min(30, game.hookDepth);
  sfx.jig();
  const y = ICE_BOT + game.hookDepth - game.jigOff;
  addBubble(player.hole.x + rnd(-3, 3), y + 6); if (Math.random() < .5) addBubble(player.hole.x + rnd(-4, 4), y + 14);
}
// Bitelyst-faktor: uten pilking er den lav, med pilking i rytme er den høy
const biteFactor = e => (.4 + 2.2 * e) * (1 + [0, .15, .3][shop.jig] * e) * game.rodBite;

function exitFishing() {
  player.state = 'walk'; player.hole = null;
  game.hookDepth = 0; game.fight = null; game.jigE = 0; game.jigOff = 0;
}

function tryDrink() {
  if (mode !== 'play' || paused || player.drinkTimer > 0) return;
  if (game.coffee <= 0) { log('Termosen er tom! Ingen mer kaffe…', '#ff8f8f'); sfx.empty(); return; }
  game.coffee--;
  game.cold = Math.max(0, game.cold - COFFEE_HEAT);
  game.lastStage = skinStage(game.cold);
  player.drinkTimer = 1.2;
  sfx.slurp();
  log('Mmm… varm kaffe! Du føler deg bedre. (' + game.coffee + ' igjen)', '#ffd08a');
}

function startFight(f) {
  const hookY = ICE_BOT + game.hookDepth - game.jigOff;
  game.hookDepth = hookY - ICE_BOT; game.jigOff = 0;
  f.state = 'hooked';
  f.x = player.hole.x; f.y = hookY;
  game.fight = { fish: f, progress: .3, vis: .3, grace: .9, thrash: 0, thrashT: rnd(1.5, 3), biteY: hookY, pulse: 0 };
  game.napp = 1.1; game.flash = .25; game.shake = .35;
  sfx.bite();
  log('NAPP!', '#ffe14a');
}

function crank() {
  const fg = game.fight; if (!fg) return;
  fg.progress += (game.level >= 6 ? 1.2 : 1) * game.rodCrank / fg.fish.T.effort;     // karbonstang: +20 % sveivekraft
  fg.pulse = 1;
  sfx.crank();
  if (Math.random() < .5) addBubble(player.hole.x + rnd(-6, 6), game.hookVisY + rnd(0, 20));
}

function updateFight(dt) {
  const fg = game.fight, T = fg.fish.T;
  fg.pulse = Math.max(0, fg.pulse - dt * 6);
  if (fg.grace > 0) fg.grace -= dt;
  else {
    fg.thrashT -= dt;
    if (fg.thrashT <= 0) { fg.thrash = .5; fg.thrashT = rnd(1.5, 3.5); }
    fg.progress -= T.pull * (1 + .06 * (game.level - 1)) * (fg.thrash > 0 ? 1.8 : 1) * dt;
  }
  if (fg.thrash > 0) fg.thrash -= dt;
  fg.vis += (fg.progress - fg.vis) * Math.min(1, dt * 10);
  if (Math.random() < dt * 8) addBubble(player.hole.x + rnd(-8, 8), game.hookVisY + rnd(10, fg.fish.L));
  if (fg.progress >= 1) catchFish();
  else if (fg.progress <= 0) fishEscapes();
}

function catchFish() {
  const fg = game.fight, f = fg.fish, T = f.T, h = player.hole;
  fishes.splice(fishes.indexOf(f), 1);
  game.fight = null;
  const oldScore = game.score;
  game.score += T.pts;
  const rare = T.pts >= RARE_PTS;
  let gain = rare ? 1 : 0;
  while (game.score >= levelNeed(game.level + gain)) gain++;
  game.caught[f.key]++; game.totalCaught++;
  if (f.key !== 'stovel' && !game.seen[f.key]) {                  // artsjeger: samle ulike arter
    game.seen[f.key] = true;
    const ns = Object.keys(game.seen).length;
    if (ns === 5) log('Artsjeger! 5 arter fanget – bonus +250p ved rundens slutt.', '#ffd86b');
    else if (ns < 5) log('Ny art: ' + T.name + ' (' + ns + '/5 arter)', '#cfe9f8');
  }
  game.catchLog.push({ key: f.key, pts: T.pts, stolen: false }); game.catchVer++;
  game.pile.push(f.key);                         // fangsten havner i haugen ved siden av fiskeren
  const isBoot = f.key === 'stovel';
  if (isBoot) {
    log(BOOT_JOKES[(Math.random() * BOOT_JOKES.length) | 0], '#c9b08a');
    sfx.boot();
  } else {
    log('Du fikk ' + T.acc + '! +' + T.pts + 'p', T.pts >= 50 ? '#7dff9b' : '#ffffff');
    sfx.catchF(T.pts >= 50);
  }
  if (gain > 0) levelUp(gain, rare);
  sfx.plop(); splash(h.x, ICE_TOP, 10);
  popup({ x: h.x, y: ICE_TOP - 30, key: f.key, text: isBoot ? '0p… støvel!' : '+' + T.pts + 'p', L: Math.min(78, f.L * .9), life: 1.7 });
  if (!isBoot) h.catches--;
  game.noExitUntil = game.time + 1;
  if (h.catches <= 0) {
    h.empty = true;
    log('Hullet er tomt! Bor et nytt hull et annet sted.', '#ff9f6b');
    sfx.hole0();
    exitFishing();
  } else {
    game.hookDepth = 0;
  }
}

function levelUp(n, rare) {
  const old = game.level;
  game.level += n;
  game.banner = 3.5;
  // Utstyr oppgraderes automatisk
  const gained = [], names = [];
  if (old < 4 && game.level >= 4) { gained.push('Blinkende pilk (+20 % bitelyst på sjeldne fisker)'); names.push('Blinkende pilk'); }
  if (old < 6 && game.level >= 6) { gained.push('Karbonstang (+20 % sveivekraft)'); names.push('Karbonstang'); }
  if (gained.length) {
    game.hintMsg = 'Utstyr oppgradert: ' + (gained.length > 1 ? names.join(' + ') : gained[0]) + '!';
    game.hintMsgT = 5;
    log('Utstyr oppgradert: ' + names.join(' + ') + '!', '#ffd86b');
  }
  if (old < 3 && game.level >= 3) log('Fra nå av kan det komme snøstormer!', '#bfe3ff');
  game.bannerText = rare ? 'Sjelden fisk!' : game.score + ' poeng!';
  log('NYTT NIVÅ! Du er nå på nivå ' + game.level + '.', '#7dff9b');
  if (themeFor(old) !== themeFor(game.level)) {
    log('Nytt landskap: ' + THEME_NAMES[themeFor(game.level)] + '!', '#9fd2ee');
    game.bannerText += '  Landskap: ' + THEME_NAMES[themeFor(game.level)];
  }
  // Nye fiskeslag dukker opp i innsjøen
  const fresh = FISH_KEYS.filter(k => FISH[k].minLevel > old && FISH[k].minLevel <= game.level);
  if (fresh.length) {
    const names = fresh.map(k => FISH[k].name).join(' og ');
    log('Ny fisk i innsjøen: ' + names + '!', '#ffd86b');
    game.bannerText += '  Ny fisk: ' + names;
    fresh.forEach(k => fishes.push(makeFish(k, true)));
  }
  sfx.levelUp();
}

function fishEscapes() {
  const fg = game.fight, f = fg.fish, h = player.hole;
  f.state = 'swim'; f.cooldown = 10; f.flee = 2;
  f.dir = Math.random() < .5 ? -1 : 1;
  f.x = h.x - f.dir * f.L * .5;
  f.y = clamp(game.hookVisY + f.L * .5, ICE_BOT + 20, ICE_BOT + MAXD - 10);
  f.baseY = f.y;
  game.hookDepth = clamp(fg.biteY - ICE_BOT, 0, MAXD);
  game.fight = null;
  log('Fisken slapp!', '#ff8f8f');
  sfx.lose();
}

// Avslutningssekvens: reason = 'frozen' (frøs i hjel) eller 'time' (tiden er ute)
function beginEnding(reason) {
  mode = 'frozen';
  game.endReason = reason;
  game.storm = 0; windStop();
  game.fox = null;
  game.freezeT = 0;
  game.fight = null;
  player.state = 'walk'; player.hole = null; player.drill = 0; player.moving = false;
  if (reason === 'frozen') sfx.freeze(); else sfx.levelUp();
}

function saveBest() { try { localStorage.setItem('frostbitt_rekord', JSON.stringify(best)); } catch (e) {} }
function loadBest() {
  try { const b = JSON.parse(localStorage.getItem('frostbitt_rekord')); if (b && typeof b.score === 'number') best = b; } catch (e) {}
}

// ---------------------------------------------------------------------
// Toppliste (lagres lokalt i nettleseren)
// ---------------------------------------------------------------------
const LB_KEY = 'frostbitt_toppliste', NAME_KEY = 'frostbitt_navn';
let board = [], lastName = 'Spiller', currentEntry = null;

function loadBoard() {
  try {
    const b = JSON.parse(localStorage.getItem(LB_KEY));
    if (Array.isArray(b)) board = b.filter(e => e && typeof e.score === 'number').slice(0, 10);
    lastName = localStorage.getItem(NAME_KEY) || lastName;
  } catch (e) {}
}
function saveBoard() {
  try { localStorage.setItem(LB_KEY, JSON.stringify(board)); localStorage.setItem(NAME_KEY, lastName); } catch (e) {}
}
function addToBoard(entry) {
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  board = board.slice(0, 10);
  saveBoard();
  return board.indexOf(entry) >= 0 ? entry : null;
}
function renderBoard(el, mine) {
  el.textContent = '';
  if (!board.length) {
    const n = document.createElement('div'); n.className = 'none'; n.textContent = 'Ingen resultater ennå'; el.appendChild(n);
    return;
  }
  board.forEach((e, i) => {
    const r = document.createElement('div'); r.className = 'lbr' + (e === mine ? ' me' : '');
    [['rk', String(i + 1).padStart(2, '0')], ['nm', e.name], ['fs', e.fish + ' fisk'], ['sc', String(e.score)]].forEach(([c, t]) => {
      const sp = document.createElement('span'); sp.className = c; sp.textContent = t; r.appendChild(sp);
    });
    r.title = 'Nivå ' + e.level;
    el.appendChild(r);
  });
}
const refreshBoard = () => renderBoard($('lbSide'), currentEntry);

function endGame() {
  mode = 'over';
  // Artsjeger-bonus: minst 5 ulike arter (ekskludert støvel)
  const species = Object.keys(game.seen).length;
  game.speciesBonus = species >= 5 ? 250 : 0;
  game.score += game.speciesBonus;
  shop.wallet += game.score; saveShop();                   // poengene fra runden havner i lommeboken
  let isNew = false;
  if (game.score > best.score) { best = { score: game.score, fish: game.totalCaught }; saveBest(); isNew = true; }
  $('eTitle').textContent = game.endReason === 'frozen' ? 'Du frøs i hjel!' : 'Tiden er ute!';
  currentEntry = game.score > 0 ? addToBoard({ name: lastName, score: game.score, level: game.level, fish: game.totalCaught }) : null;
  $('nameIn').value = lastName;
  $('nameIn').parentNode.style.display = currentEntry ? '' : 'none';
  refreshBoard();
  $('eScore').textContent = game.score;
  $('eLevel').textContent = 'Du nådde nivå ' + game.level;
  $('eNew').textContent = isNew ? '★ NY REKORD! ★' : '';
  let html = '';
  FISH_KEYS.forEach(k => {
    const n = game.caught[k];
    if (n > 0) html += '<tr><td><span class="dot" style="background:' + FISH[k].body + '"></span>' + FISH[k].name +
      '</td><td>×' + n + '</td><td>' + n * FISH[k].pts + 'p</td></tr>';
  });
  if (game.speciesBonus) html += '<tr><td style="color:#7dff9b"><b>Artsjeger-bonus</b> (' + species + ' arter)</td><td></td><td style="color:#7dff9b"><b>+' + game.speciesBonus + 'p</b></td></tr>';
  $('eBonus').textContent = game.speciesBonus ? '★ Artsjeger-bonus: +' + game.speciesBonus + 'p ★'
    : (species > 0 ? 'Arter fanget: ' + species + ' / 5 – fang 5 ulike for +250p' : '');
  $('eTable').innerHTML = html
    ? '<table>' + html + '<tr><td><b>Totalt</b></td><td><b>×' + game.totalCaught + '</b></td><td><b>' + game.score + 'p</b></td></tr></table>'
    : '<div class="empty">Ingen fangst denne gangen…</div>';
  if (game.stolen > 0) $('eTable').insertAdjacentHTML('beforeend', '<div class="empty">Reven stjal ' + game.stolen + ' fisk fra deg…</div>');
  $('eWallet').textContent = '+' + game.score + ' p til lommeboken  ·  ' + walletText();
  $('eRec').textContent = 'Personlig rekord: ' + best.score + ' poeng';
  $('ovEnd').classList.add('show');
}

function startGame() {
  initAudio();
  resetGame();
  mode = 'play'; paused = false;
  $('ovTitle').classList.remove('show');
  $('ovEnd').classList.remove('show');
  log('Velkommen! Hold SPACE for å bore et hull.', '#9fe3ff');
  sfx.click();
}

function walletText() { return 'Lommebok: ' + shop.wallet + ' p'; }

function renderShop() {
  $('walletVal').textContent = shop.wallet;
  const list = $('shopList'); list.textContent = '';
  Object.keys(SHOP).forEach(key => {
    const cat = SHOP[key], lvl = shop[key], next = cat.tiers[lvl];
    const row = document.createElement('div'); row.className = 'shopRow';
    const info = document.createElement('div'); info.className = 'shopInfo';
    const nm = document.createElement('div'); nm.className = 'shopName';
    nm.textContent = cat.name + ' · ' + (lvl ? cat.tiers[lvl - 1].name : 'Standard');
    const ds = document.createElement('div'); ds.className = 'shopDesc';
    ds.textContent = next ? next.name + ': ' + next.desc : 'Du har det beste utstyret!';
    info.appendChild(nm); info.appendChild(ds); row.appendChild(info);
    if (next) {
      const b = document.createElement('button'); b.className = 'buy'; b.textContent = 'Kjøp  ' + next.price + ' p';
      b.disabled = shop.wallet < next.price;
      b.addEventListener('click', () => { buyItem(key); });
      row.appendChild(b);
    } else { const m = document.createElement('span'); m.className = 'maxed'; m.textContent = 'MAKS'; row.appendChild(m); }
    list.appendChild(row);
  });
}
function buyItem(key) {
  const next = SHOP[key].tiers[shop[key]];
  if (!next || shop.wallet < next.price) return;
  initAudio();
  shop.wallet -= next.price; shop[key]++;
  saveShop(); sfx.catchF(true);
  renderShop();
}
let shopFrom = 'title';
function openShop(from) {
  shopFrom = from;
  $('ovTitle').classList.remove('show'); $('ovEnd').classList.remove('show');
  renderShop();
  $('ovShop').classList.add('show');
}
function closeShop() {
  $('ovShop').classList.remove('show');
  if (shopFrom === 'end') { $('eWallet').textContent = walletText() + ' – bruk dem i butikken'; $('ovEnd').classList.add('show'); }
  else { showTitle(); $('ovTitle').classList.add('show'); }
}

function showTitle() {
  refreshBoard();
  $('titleRec').textContent = (best.score > 0 ? 'Personlig rekord: ' + best.score + ' poeng  ·  ' : '') + walletText();
}

// Temperatur ute (°C): blir kaldere utover runden. Kaldere ute = du fryser fortere.
const outsideTemp = () => -8 - 12 * clamp(game.time / ROUND_TIME, 0, 1) + Math.sin(game.time * .08) * 1.5;
const coldRate = () => (1 + clamp((-outsideTemp() - 8) / 16, 0, 1)) * (game.storm > 0 ? 1.25 : 1) * [1, .9, .8][shop.suit];   // snøstorm: 25 % raskere kulde

// ---------------------------------------------------------------------
// Fangsthaug (på en pulk) og reven som prøver å stjele fisk
// ---------------------------------------------------------------------
const stealable = () => game.pile.some(k => k !== 'stovel');

function updatePile(dt) {
  const p = player;
  let side = game.pileX < p.x ? -1 : 1;
  if (p.x > W - 280) side = -1; else if (p.x < 160) side = 1;      // hold haugen unna kantene
  const dist = clamp(Math.abs(game.pileX - p.x), 86, 110);
  const want = clamp(p.x + side * dist, 50, W - 120);
  game.pileX += clamp(want - game.pileX, -260 * dt, 260 * dt);      // haugen dras etter fiskeren
}

function spawnFox() {
  const side = Math.random() < .5 ? -1 : 1;
  game.fox = { x: side < 0 ? -60 : W + 60, dir: -side, state: 'in', t: 0, loot: null, runT: 0 };
  log('En rev lister seg mot fangsten din! Trykk F!', '#ff9f6b');
  sfx.yip();
}

function foxLeaves() {
  game.fox = null;
  game.foxT = rnd(30, 50) * Math.max(.6, 1 - .06 * (game.level - 1));   // oftere besøk på høyere nivå
}

function shoo() {
  const f = game.fox;
  if (mode !== 'play' || paused || !f || (f.state !== 'in' && f.state !== 'sniff')) return;
  f.state = 'scared';
  f.dir = f.x < game.pileX ? -1 : 1;
  log('Du jaget bort reven!', '#7dff9b');
  popup({ x: f.x, y: ICE_TOP - 50, key: null, text: 'Hysj!', life: 1 });
  sfx.shoo();
}

// Hunden sover i hundehuset. Når reven kommer løper den ut og jager den bort, og så går den inn igjen.
function updateDog(dt) {
  const d = game.dog, f = game.fox;
  const fx = f && (f.state === 'in' || f.state === 'sniff') ? f : null;
  const door = KENNEL_X - 26;                                   // utenfor inngangen
  d.moving = false;
  if (d.state === 'idle') {
    d.x = KENNEL_X;
    if (fx) { d.state = 'alert'; d.t = rnd(.5, .8); d.dir = -1; sfx.bark(); }
  } else if (d.state === 'alert') {                             // kommer ut av huset
    if (d.x > door) { d.x = Math.max(door, d.x - 90 * dt); d.moving = true; d.runT += dt * 12; }
    if (!fx) { d.state = 'return'; return; }
    d.dir = Math.sign(fx.x - d.x) || d.dir;
    d.t -= dt;
    if (d.t <= 0 && d.x <= door) { d.state = 'chase'; log('Hunden har sett reven!', '#ffd08a'); }
  } else if (d.state === 'chase') {
    if (!fx) { d.state = 'return'; return; }
    d.dir = Math.sign(fx.x - d.x) || d.dir;
    d.x = clamp(d.x + d.dir * 400 * dt, -30, W + 30);
    d.moving = true; d.runT += dt * 20;
    if (Math.abs(fx.x - d.x) < 42) {
      fx.state = 'scared'; fx.dir = Math.sign(fx.x - d.x) || 1;
      log('Hunden jaget bort reven!', '#7dff9b');
      popup({ x: d.x, y: ICE_TOP - 46, key: null, text: 'Voff!', life: 1.1 });
      sfx.bark(); sfx.shoo(); game.shake = .25;
      d.state = 'return';
    }
  } else {                                                      // tilbake til hundehuset
    const dx = KENNEL_X - d.x;
    if (Math.abs(dx) < 6) { d.state = 'idle'; d.x = KENNEL_X; }
    else { d.dir = Math.sign(dx); d.x += d.dir * Math.min(Math.abs(dx), 300 * dt); d.moving = true; d.runT += dt * 16; }
  }
}

function updateFox(dt) {
  if (!game.fox) {
    game.foxT -= dt;
    if (game.foxT <= 0) { if (stealable()) spawnFox(); else game.foxT = 4; }
    return;
  }
  const f = game.fox;
  f.t += dt;
  if (f.state === 'in') {
    const tgt = game.pileX + (f.x < game.pileX ? -1 : 1) * 54;
    f.dir = Math.sign(tgt - f.x) || f.dir;
    f.x += f.dir * 150 * dt; f.runT += dt * 15;
    if (Math.abs(tgt - f.x) < 5) { f.state = 'sniff'; f.t = 0; f.dir = f.x < game.pileX ? 1 : -1; }
  } else if (f.state === 'sniff') {
    if (f.t > 1.5) {
      const idx = [];
      game.pile.forEach((k, i) => { if (k !== 'stovel') idx.push(i); });
      if (!idx.length) { f.state = 'scared'; f.dir = f.x < W / 2 ? -1 : 1; return; }
      const i = idx[(Math.random() * idx.length) | 0], key = game.pile.splice(i, 1)[0], T = FISH[key];
      game.score = Math.max(0, game.score - T.pts);
      game.caught[key]--; game.totalCaught--; game.stolen++;
      for (let j = game.catchLog.length - 1; j >= 0; j--) if (game.catchLog[j].key === key && !game.catchLog[j].stolen) { game.catchLog[j].stolen = true; game.catchVer++; break; }
      f.loot = key; f.state = 'out'; f.dir = f.x < W / 2 ? -1 : 1;
      log('Reven stjal ' + T.acc + '! −' + T.pts + 'p', '#ff6a5a');
      popup({ x: game.pileX, y: ICE_TOP - 70, key: null, text: '−' + T.pts + 'p', life: 1.4 });
      sfx.steal(); game.shake = .5;
    }
  } else {
    f.x += f.dir * (f.state === 'scared' ? 340 : 280) * dt; f.runT += dt * 22;
    if (f.x < -90 || f.x > W + 90) foxLeaves();
  }
}

// Snøstorm: fra nivå 3 blåser det av og til opp i 20 sekunder
function startStorm() {
  game.storm = 20; game.stormAlert = 3;
  log('SNØSTORM! Du fryser 25 % raskere – drikk kaffe!', '#bfe3ff');
  sfx.gust(); windStart();
}
function updateStorm(dt) {
  game.stormAlert = Math.max(0, game.stormAlert - dt);
  if (game.storm > 0) {
    game.storm -= dt;
    if (game.storm <= 0) { game.storm = 0; game.stormT = rnd(40, 70); windStop(); log('Stormen løyer. Nå kan du puste ut.', '#9fd2ee'); }
  } else if (game.level >= 3) {
    game.stormT -= dt;
    if (game.stormT <= 0) startStorm();
  }
}

// Oppdaterer selve spillet (når mode === 'play')
function updatePlay(dt) {
  const p = player;
  game.time += dt;
  game.cold += dt / GAME_HOUR * coldRate();
  updateStorm(dt);
  game.hintMsgT = Math.max(0, game.hintMsgT - dt);

  // Stegvise meldinger når fiskeren blir kaldere
  const st = skinStage(game.cold);
  if (st > game.lastStage) {
    game.lastStage = st;
    if (st === 1) log('Du begynner å fryse… ansiktet blir blekt.', '#e8ddd0');
    if (st === 2) log('Fingrene dine blir lyseblå! Du trenger kaffe!', '#8fd3ff');
    if (st === 3) log(game.coffee > 0 ? 'Du er knallblå! Drikk kaffe NÅ (K)!' : 'Du er knallblå og termosen er tom!', '#4d95ff');
  }
  if (game.cold >= MAX_COLD) { beginEnding('frozen'); return; }
  if (game.time >= ROUND_TIME) { beginEnding('time'); return; }

  p.drinkTimer = Math.max(0, p.drinkTimer - dt);
  p.sit = clamp(p.sit + (p.state === 'fish' ? 1 : -1) * dt * 5, 0, 1);
  if (p.drinkTimer > 0 && Math.random() < dt * 14) steam(p.x + p.dir * 8 * SC, ICE_TOP - 60 * SC);
  game.napp = Math.max(0, game.napp - dt);
  game.banner = Math.max(0, game.banner - dt);
  game.flash = Math.max(0, game.flash - dt);

  // --- Bevegelse ---
  const mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  p.moving = false;
  if (p.state === 'walk' && p.drinkTimer <= 0 && mx) {
    p.dir = mx;
    p.x = clamp(p.x + mx * WALK_SPEED * dt, 30, W - 110);   // litt luft mot termometeret
    p.moving = true; p.walkT += dt * 11;
    p.drill = 0;
  } else if (p.state === 'fish' && !game.fight && mx) {
    exitFishing();                                  // gå videre = hiv inn snøret
  }

  // --- Boring ---
  const fx = frontX();
  const near = nearHole(fx, 40);                       // bor så mange hull du vil, så lenge de ikke ligger oppå hverandre
  p.drilling = false;
  if (p.state === 'walk' && !p.moving && p.drinkTimer <= 0 && keys.space && !near) {
    p.drilling = true;
    p.drill += dt / drillTime();
    p.scrapeT -= dt;
    if (p.scrapeT <= 0) { sfx.scrape(p.drill); p.scrapeT = .085; }
    p.chipAcc += dt * 45;
    while (p.chipAcc >= 1) { chips(fx, 1); p.chipAcc--; }
    if (p.drill >= 1) finishHole(fx);
  }
  if (!p.drilling) p.drill = Math.max(0, p.drill - dt * .8);

  // --- Gå ned til hullet og begynn å fiske ---
  if (p.state === 'walk' && !p.moving && p.drinkTimer <= 0 && keys.down && p.drill <= 0) {
    const h = findHole(fx, 16);
    if (h && !h.empty) enterFishing(h);
  }

  // --- Fiske ---
  if (p.state === 'fish') {
    const h = p.hole;
    p.x += ((h.x - p.dir * FRONT) - p.x) * Math.min(1, dt * 10);
    if (game.fight) updateFight(dt);
    else {
      const dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      game.hookDepth = clamp(game.hookDepth + dy * HOOK_SPEED * dt, 0, MAXD);
      game.jigE = Math.max(0, game.jigE - .5 * dt);
      game.jigOff = Math.max(0, game.jigOff - 75 * dt);          // kroken synker tilbake etter rykket
    }
  }
  updatePile(dt);
  updateDog(dt);
  updateFox(dt);
  game.hookVisY = ICE_BOT + game.hookDepth - game.jigOff;
  if (game.fight) {
    const fg = game.fight;
    const lift = (fg.vis - .3) / .7;
    game.hookVisY = clamp(fg.biteY + (ICE_BOT + 6 - fg.biteY) * lift, ICE_BOT + 6, ICE_BOT + MAXD);
  }
}

function updateWorld(dt) {
  clock += dt;
  const th = themeFor(game.level);
  if (th !== themeCur) { themePrev = themeCur; themeCur = th; themeT = 0; }
  themeT = Math.min(1, themeT + dt * .7);
  game.shake = Math.max(0, game.shake - dt * 2);
  game.nibble = 0;
  let hook = null;
  if (mode === 'play' && player.state === 'fish' && !game.fight)
    hook = { x: player.hole.x, y: ICE_BOT + game.hookDepth - game.jigOff, e: game.jigE };

  for (let i = 0; i < fishes.length; i++) {
    updateFish(fishes[i], dt, hook);
    if (game.fight) hook = null;       // en fisk har bitt – de andre mister interessen
  }
  maintainFish(dt);
  if (game.nibble && Math.random() < dt * 5) sfx.tick();

  // Hull som er tomme fryser igjen
  for (const h of holes) if (h.empty && h.freeze < 1) h.freeze = Math.min(1, h.freeze + dt / 3);

  // Partikler
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i];
    q.life -= dt;
    if (q.life <= 0) { parts.splice(i, 1); continue; }
    q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
  }
  // Bobler
  if (Math.random() < dt * 2) addBubble(rnd(20, W - 20), ICE_BOT + MAXD + rnd(-5, 10));
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.y += b.vy * dt; b.x += Math.sin(clock * 3 + b.ph) * 8 * dt;
    if (b.y < ICE_BOT + 4) bubbles.splice(i, 1);
  }
  // Popups
  for (let i = popups.length - 1; i >= 0; i--) { popups[i].t += dt; if (popups[i].t > popups[i].life) popups.splice(i, 1); }
  // Logg
  for (const l of logs) l.t += dt;
  // Snøstorm: glatt inn/ut, vindlyd og skråstilte, tette snøfnugg
  game.stormI += clamp((mode === 'play' && game.storm > 0 ? 1 : 0) - game.stormI, -dt * .7, dt * .7);
  windSet(game.stormI * .28);
  if (game.stormI > .01) {
    for (const f of stormFlakes) {
      f.y += f.v * dt; f.x += f.vx * dt;
      if (f.y > ICE_TOP + 6 || f.x > W + 20) { f.y = rnd(-60, -4); f.x = rnd(-160, W); }
    }
  }
  // Snø og skyer
  for (const f of flakes) {
    f.y += f.v * (1 + game.stormI) * dt; f.x += Math.sin(clock * 1.3 + f.ph) * 14 * dt + (6 + game.stormI * 170) * dt;
    if (f.y > ICE_TOP) { f.y = -4; f.x = rnd(0, W); }
    if (f.x > W + 4) f.x = -4;
  }
  for (const c of clouds) { c.x += c.v * dt; if (c.x > W + 120) c.x = -160; }
}

function update(dt) {
  if (paused) { windSet(0); return; }
  if (mode === 'play') updatePlay(dt);
  else if (mode === 'frozen') {
    game.freezeT += dt;
    if (game.freezeT > 3) endGame();
  }
  updateWorld(dt);
}

// ---------------------------------------------------------------------
// Tegning: bakgrunn (forhåndstegnet i oppløsning som passer skjermen)
// ---------------------------------------------------------------------
function spruce(c, x, base, h, col) {
  const w = h * .5;
  c.fillStyle = '#4a3424'; c.fillRect(x - h * .04, base - h * .12, h * .08, h * .12);
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const top = base - h + i * h * .2, th = h * .4;
    const hw = (w / 2) * (.35 + .65 * (i + 1) / tiers);
    c.fillStyle = col;
    c.beginPath(); c.moveTo(x, top); c.lineTo(x - hw, top + th); c.lineTo(x + hw, top + th); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.92)';
    c.beginPath(); c.moveTo(x, top); c.lineTo(x - hw * .72, top + th * .62); c.lineTo(x - hw * .3, top + th * .5);
    c.lineTo(x, top + th * .7); c.lineTo(x + hw * .3, top + th * .5); c.lineTo(x + hw * .72, top + th * .62); c.closePath(); c.fill();
  }
}

function mountain(c, cx, base, w, h, col) {
  c.fillStyle = col;
  c.beginPath(); c.moveTo(cx - w / 2, base); c.lineTo(cx, base - h); c.lineTo(cx + w / 2, base); c.closePath(); c.fill();
  // skygge på høyre side
  c.fillStyle = 'rgba(30,60,110,.2)';
  c.beginPath(); c.moveTo(cx, base - h); c.lineTo(cx + w / 2, base); c.lineTo(cx + w * .05, base); c.closePath(); c.fill();
  // snøhette med takket kant
  const t = .36, ly = base - h + h * t, hw = w / 2 * t;
  c.fillStyle = '#f6fbff';
  c.beginPath(); c.moveTo(cx, base - h); c.lineTo(cx - hw, ly);
  c.lineTo(cx - hw * .55, ly - h * .05); c.lineTo(cx - hw * .2, ly + h * .04); c.lineTo(cx + hw * .15, ly - h * .04);
  c.lineTo(cx + hw * .55, ly + h * .03); c.lineTo(cx + hw, ly); c.closePath(); c.fill();
}

function buildBackground() {
  bg = document.createElement('canvas');
  bg.width = canvas.width; bg.height = canvas.height;
  const c = bg.getContext('2d');
  c.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  const R = mulberry32(1337);

  // Hjelper: nytt lag i samme oppløsning
  const mk = () => { const cv = document.createElement('canvas'); cv.width = canvas.width; cv.height = canvas.height;
    const x = cv.getContext('2d'); x.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0); return [cv, x]; };

  // Dagshimmel med sol og glød
  let cx2;
  [bgSky, cx2] = mk();
  let g = cx2.createLinearGradient(0, 0, 0, 230);
  g.addColorStop(0, '#5d9ccf'); g.addColorStop(.55, '#bcdcee'); g.addColorStop(1, '#f6eedc');
  cx2.fillStyle = g; cx2.fillRect(0, 0, W, ICE_TOP);
  g = cx2.createRadialGradient(840, 130, 4, 840, 130, 110);
  g.addColorStop(0, 'rgba(255,248,205,.95)'); g.addColorStop(.25, 'rgba(255,246,200,.5)'); g.addColorStop(1, 'rgba(255,246,200,0)');
  cx2.fillStyle = g; cx2.fillRect(700, 20, 280, 220);
  cx2.fillStyle = '#fffbe0'; cx2.beginPath(); cx2.arc(840, 130, 20, 0, 6.3); cx2.fill();

  // Nattehimmel med stjerner og måne (tones inn utover runden)
  [bgNight, cx2] = mk();
  g = cx2.createLinearGradient(0, 0, 0, 235);
  g.addColorStop(0, '#040a22'); g.addColorStop(.5, '#10224f'); g.addColorStop(.85, '#3b2f66'); g.addColorStop(1, '#a8627a');
  cx2.fillStyle = g; cx2.fillRect(0, 0, W, ICE_TOP);
  for (let i = 0; i < 150; i++) {
    cx2.fillStyle = 'rgba(255,255,255,' + (.3 + R() * .7) + ')';
    const sz = R() < .12 ? 2 : 1;
    cx2.fillRect(Math.floor(R() * W), Math.floor(R() * 190), sz, sz);
  }
  g = cx2.createRadialGradient(840, 120, 4, 840, 120, 90);
  g.addColorStop(0, 'rgba(210,225,255,.5)'); g.addColorStop(1, 'rgba(210,225,255,0)');
  cx2.fillStyle = g; cx2.fillRect(740, 30, 200, 180);
  cx2.fillStyle = '#eef3ff'; cx2.beginPath(); cx2.arc(840, 120, 16, 0, 6.3); cx2.fill();
  cx2.fillStyle = 'rgba(150,170,210,.45)'; cx2.beginPath(); cx2.arc(835, 116, 4, 0, 6.3); cx2.arc(846, 126, 3, 0, 6.3); cx2.fill();

  // Landskap bak strandkanten – tre varianter som byttes mellom etter nivå
  // 0: Fjell (to lag)
  let cm;
  [bgMount, cm] = mk();
  for (let x = -60; x < W + 120; x += 150) mountain(cm, x + R() * 40, 218, 280 + R() * 100, 95 + R() * 30, '#9bb8d3');
  for (let x = -20; x < W + 120; x += 190) mountain(cm, x + R() * 60, 226, 250 + R() * 90, 58 + R() * 34, '#7b98b8');

  // 1: Skog – tre rekker med gran i dis, lysere lenger bak
  [bgForest, cm] = mk();
  const rows = [
    { base: 198, hMin: 62, hMax: 96, step: 20, col: '#4a7770', ground: '#c6d9e6', fog: .32 },
    { base: 207, hMin: 58, hMax: 88, step: 24, col: '#35624f', ground: '#d3e3ee', fog: .22 },
    { base: 215, hMin: 50, hMax: 80, step: 28, col: '#254c3d', ground: '#dfecf5', fog: .1 }
  ];
  rows.forEach(r => {
    cm.fillStyle = r.ground; cm.fillRect(0, r.base - 4, W, 60);
    for (let x = -10; x < W + 20; x += r.step) spruce(cm, x + R() * r.step * .8, r.base + R() * 6, r.hMin + R() * (r.hMax - r.hMin), r.col);
    const fg = cm.createLinearGradient(0, r.base - 90, 0, r.base + 8);
    fg.addColorStop(0, 'rgba(225,238,248,0)'); fg.addColorStop(1, 'rgba(225,238,248,' + r.fog + ')');
    cm.fillStyle = fg; cm.fillRect(0, r.base - 90, W, 98);
  });

  // 2: Nordlys – mørke åser mot stjernehimmelen
  [bgHills, cm] = mk();
  [['#14264a', 196, .006, 12], ['#0d1a36', 210, .011, 8]].forEach(([col, base, f, amp], i) => {
    cm.fillStyle = col; cm.beginPath(); cm.moveTo(0, ICE_TOP);
    for (let x = 0; x <= W; x += 8) cm.lineTo(x, base + Math.sin(x * f + i * 2) * amp + Math.sin(x * f * 2.7 + i) * amp * .5);
    cm.lineTo(W, ICE_TOP); cm.closePath(); cm.fill();
    cm.strokeStyle = 'rgba(190,220,255,.3)'; cm.lineWidth = 1.5; cm.beginPath();
    for (let x = 0; x <= W; x += 8) { const y = base + Math.sin(x * f + i * 2) * amp + Math.sin(x * f * 2.7 + i) * amp * .5; if (x) cm.lineTo(x, y); else cm.moveTo(x, y); }
    cm.stroke();
  });

  // Snødekt strandkant
  g = c.createLinearGradient(0, 205, 0, ICE_TOP);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d8e9f4');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(0, ICE_TOP);
  for (let x = 0; x <= W; x += 8) c.lineTo(x, 214 + Math.sin(x * .011) * 5 + Math.sin(x * .029 + 1) * 3);
  c.lineTo(W, ICE_TOP); c.closePath(); c.fill();

  // Hytte på andre siden
  c.fillStyle = '#a13a2e'; c.fillRect(655, 196, 46, 26);
  c.fillStyle = '#6c2820'; c.fillRect(655, 214, 46, 3);
  c.fillStyle = '#ffe28a'; c.fillRect(664, 203, 9, 9); c.fillRect(682, 203, 9, 9);
  c.fillStyle = '#4a3a34'; c.fillRect(690, 180, 6, 14);
  c.fillStyle = '#3d2c2c'; c.beginPath(); c.moveTo(649, 197); c.lineTo(678, 177); c.lineTo(707, 197); c.closePath(); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(653, 195); c.lineTo(678, 179); c.lineTo(703, 195); c.lineTo(696, 195); c.lineTo(678, 184); c.lineTo(660, 195); c.closePath(); c.fill();

  // Graner (bakerst = minst)
  const cols = ['#1d4a3a', '#245a40', '#1a4034'];
  const trees = [];
  for (let i = 0; i < 46; i++) {
    const x = R() * W;
    if (x > 640 && x < 715) continue;                       // plass til hytta
    trees.push({ x, base: 208 + R() * 28, h: 30 + R() * 46 });
  }
  trees.sort((a, b) => a.base - b.base);
  trees.forEach(t => spruce(c, t.x, t.base, t.h, cols[(R() * 3) | 0]));

  // Isflaten sett i tverrsnitt
  const th = ICE_BOT - ICE_TOP;
  g = c.createLinearGradient(0, ICE_TOP, 0, ICE_BOT);
  g.addColorStop(0, '#e6f6fd'); g.addColorStop(.5, '#a8d9ee'); g.addColorStop(1, '#6db0d2');
  c.fillStyle = g; c.fillRect(0, ICE_TOP, W, th);
  c.fillStyle = '#ffffff'; c.fillRect(0, ICE_TOP, W, 6);
  for (let x = 0; x < W; x += 8) { const h = Math.floor(R() * 4); c.fillRect(x, ICE_TOP - h, 8, h); }
  c.fillStyle = 'rgba(120,170,200,.35)'; c.fillRect(0, ICE_TOP + 6, W, 2);
  for (let i = 0; i < 26; i++) { c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(R() * W, ICE_TOP + 10 + R() * (th - 14), 20 + R() * 60, 1.5); }
  for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(R() * W, ICE_TOP + 10 + R() * (th - 14), 1 + R() * 2, 0, 6.3); c.fill(); }
  c.strokeStyle = 'rgba(40,100,150,.35)'; c.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    let x = R() * W, y = ICE_TOP + 8;
    c.beginPath(); c.moveTo(x, y);
    while (y < ICE_BOT - 2) { x += (R() - .5) * 10; y += 5 + R() * 6; c.lineTo(x, y); }
    c.stroke();
  }

  // Vannet
  g = c.createLinearGradient(0, ICE_BOT, 0, H);
  g.addColorStop(0, '#2a85b3'); g.addColorStop(.45, '#14598a'); g.addColorStop(1, '#0a3560');
  c.fillStyle = g; c.fillRect(0, ICE_BOT, W, H - ICE_BOT);
  // istapper under isen
  c.fillStyle = '#8cc8e2';
  for (let x = 0; x < W; x += 10 + R() * 8) {
    const h = 3 + R() * 12, w = 4 + R() * 5;
    c.beginPath(); c.moveTo(x, ICE_BOT - 1); c.lineTo(x + w, ICE_BOT - 1); c.lineTo(x + w / 2, ICE_BOT + h); c.closePath(); c.fill();
  }
  // bunn med stein og tang
  c.fillStyle = '#18384a';
  c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W; x += 10) c.lineTo(x, 570 + Math.sin(x * .02) * 5 + Math.sin(x * .07) * 2);
  c.lineTo(W, H); c.closePath(); c.fill();
  c.fillStyle = '#0f2a3a'; c.fillRect(0, 588, W, 12);
  for (let i = 0; i < 16; i++) {
    c.fillStyle = i % 2 ? '#24566d' : '#1d4659';
    c.beginPath(); c.ellipse(R() * W, 580 + R() * 12, 10 + R() * 22, 5 + R() * 8, 0, 0, 6.3); c.fill();
  }
  c.lineWidth = 3; c.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const x = R() * W, hh = 20 + R() * 36;
    c.strokeStyle = i % 2 ? 'rgba(40,130,90,.7)' : 'rgba(30,100,80,.75)';
    c.beginPath(); c.moveTo(x, 580);
    c.quadraticCurveTo(x + (R() - .5) * 20, 580 - hh * .5, x + (R() - .5) * 16, 580 - hh); c.stroke();
  }
}

// ---------------------------------------------------------------------
// Tegning: fisk
// ---------------------------------------------------------------------
function bodyPath(c, L, H, wag) {
  c.beginPath();
  c.moveTo(L * .5, 0);
  c.bezierCurveTo(L * .36, -H * .55, -L * .1, -H * .62, -L * .3, -H * .14);
  c.lineTo(-L * .5, -H * .46 + wag);
  c.lineTo(-L * .43, wag * .6);
  c.lineTo(-L * .5, H * .46 + wag);
  c.lineTo(-L * .3, H * .14);
  c.bezierCurveTo(-L * .1, H * .62, L * .36, H * .55, L * .5, 0);
  c.closePath();
}

function drawBoot(c, L, mode) {
  c.save();
  c.rotate(-.2);
  c.beginPath();
  c.moveTo(-L * .25, -L * .5); c.lineTo(L * .08, -L * .5); c.lineTo(L * .1, L * .1);
  c.lineTo(L * .48, L * .18); c.lineTo(L * .52, L * .46); c.lineTo(-L * .3, L * .46); c.closePath();
  c.fillStyle = mode === 'shadow' ? SHADOW : '#6b4a2b'; c.fill();
  if (mode !== 'shadow') {
    c.fillStyle = '#3a2716'; c.fillRect(-L * .3, L * .36, L * .82, L * .1);
    c.fillStyle = '#8a6540'; c.fillRect(-L * .25, -L * .5, L * .33, L * .08);
    c.fillStyle = '#d9c9a8';
    for (let i = 0; i < 3; i++) c.fillRect(-L * .02, -L * .3 + i * L * .12, L * .1, L * .04);
  }
  c.restore();
}

// mode: 'shadow' (silhuett under isen) eller 'color' (fanget/bitt)
function drawFish(c, T, L, mode, t, wagAmp) {
  if (T.key === 'stovel') { drawBoot(c, L, mode); return; }
  const Hh = L * T.hr, wag = Math.sin(t * 9) * Hh * .16 * (wagAmp || 1);
  const fx = T.finX;
  const fin = () => {
    c.beginPath(); c.moveTo(L * (fx + .16), -Hh * .4); c.lineTo(L * (fx - .02), -Hh * .85); c.lineTo(L * (fx - .2), -Hh * .34); c.closePath();
  };
  if (mode === 'shadow') {
    c.fillStyle = SHADOW;
    fin(); c.fill();
    bodyPath(c, L, Hh, wag); c.fill();
    return;
  }
  c.fillStyle = T.fin; fin(); c.fill();
  const g = c.createLinearGradient(0, -Hh * .5, 0, Hh * .5);
  g.addColorStop(0, T.body); g.addColorStop(.55, T.body); g.addColorStop(.62, T.belly); g.addColorStop(1, T.belly);
  bodyPath(c, L, Hh, wag); c.fillStyle = g; c.fill();
  c.save(); bodyPath(c, L, Hh, wag); c.clip();
  if (T.stripes) { c.fillStyle = 'rgba(30,50,10,.55)'; for (let i = 0; i < 5; i++) c.fillRect(-L * .22 + i * L * .1, -Hh * .6, L * .035, Hh * .95); }
  if (T.spots) {
    c.fillStyle = T.spots;
    for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(-L * .3 + (i % 5) * L * .14, (i % 2 ? -1 : 1) * Hh * .12 - Hh * .05, Math.max(1.5, L * .02), 0, 6.3); c.fill(); }
  }
  c.restore();
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(L * .27, -Hh * .3, 1.5, Hh * .6);   // gjellelokk
  c.fillStyle = '#fff'; c.beginPath(); c.arc(L * .38, -Hh * .08, Math.max(2, L * .028), 0, 6.3); c.fill();
  c.fillStyle = '#000'; c.beginPath(); c.arc(L * .385, -Hh * .08, Math.max(1, L * .014), 0, 6.3); c.fill();
}

// ---------------------------------------------------------------------
// Tegning: fiskeren
// ---------------------------------------------------------------------
function rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }
function limb(c, x1, y1, x2, y2, w, col) {
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'butt';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
}

function drawFisher() {
  const c = ctx, p = player, cold = game.cold;
  const frozen = (mode === 'frozen' || mode === 'over') && game.endReason === 'frozen';
  const stage = frozen ? 3 : skinStage(cold);
  const skin = SKIN[stage];
  const amp = frozen ? 0 : cold < 1.2 ? 0 : Math.min(2.4, .6 + (cold - 1.2) * .5);
  const shx = Math.sin(clock * 80) * amp, shy = Math.abs(Math.sin(clock * 61)) * amp * .3;
  const JACKET = '#2a2f3a', JACKET_D = '#1d212a', ORANGE = '#f08a24';   // skuterdress

  // Skygge på isen
  c.fillStyle = 'rgba(40,80,120,.22)';
  c.beginPath(); c.ellipse(p.x, ICE_TOP + 1, 20, 3, 0, 0, 6.3); c.fill();

  c.save();
  c.translate(Math.round(p.x + shx), ICE_TOP + shy);
  c.scale(p.dir * SC, SC);

  // Håndposisjoner
  let fh = { x: 2, y: -22 }, bh = { x: -2, y: -22 };
  if (p.moving) { const s = Math.sin(p.walkT); fh.x = 2 - s * 5; bh.x = -2 + s * 5; }
  const drilling = p.drill > .001 && !frozen;
  let handleY = 0;
  if (drilling) {
    const d = p.drill * (ICE_BOT - ICE_TOP) / SC;
    handleY = d - 58;
    const a = Math.cos(clock * 14);
    fh = { x: LOCAL_FRONT + 8 * a, y: handleY };
    bh = { x: LOCAL_FRONT - 8 * a, y: handleY };
  } else if (p.state === 'fish') {
    fh = { x: 13, y: -33 }; bh = { x: 6, y: -30 };
  }
  // Drikker kaffe: bakre hånd løftes til munnen
  let cup = null;
  if (p.drinkTimer > 0) {
    const u = 1 - p.drinkTimer / 1.2;
    const e = clamp(Math.min(u / .3, (1 - u) / .2, 1), 0, 1);
    cup = { x: lerp(14, 8, e), y: lerp(-26, -47, e) };
    bh = { x: cup.x - 2, y: cup.y + 3 };
  }

  // Borret
  if (drilling) {
    const d = p.drill * (ICE_BOT - ICE_TOP) / SC;
    rect(c, LOCAL_FRONT - 2, d - 58, 4, 58, '#a9b6c2');
    c.fillStyle = '#5c6874';
    const off = (clock * 40) % 8;
    for (let y = d - 24 + off; y < d; y += 8) c.fillRect(LOCAL_FRONT - 3, y, 6, 3);
    const a = Math.cos(clock * 14);
    rect(c, LOCAL_FRONT - 9 * Math.abs(a) - 1, handleY - 2, 18 * Math.abs(a) + 2, 4, '#6b4a2b');
  }

  // Campingstol (når fiskeren sitter og fisker)
  const dy = 6 * p.sit;
  if (p.sit > .02 && !frozen) {
    const CH = '#2e6fb0', FR = '#3a3f45';
    c.strokeStyle = FR; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-13, 0); c.lineTo(11, -10); c.moveTo(11, 0); c.lineTo(-13, -10); c.stroke();   // X-ramme
    c.fillStyle = CH; c.beginPath(); c.moveTo(-14, -10); c.lineTo(-10, -10); c.lineTo(-12, -36); c.lineTo(-17, -36); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-14, -10); c.lineTo(-17, -37); c.stroke();
    rect(c, -14, -10, 26, 3, CH);
    rect(c, -14, -8, 26, 1, '#1d4a7a');
  }

  // Ben og støvler
  if (p.sit > .5) {
    rect(c, -6, -15, 15, 5, JACKET);                    // lår
    rect(c, 5, -15, 5, 12, '#323845');                  // legg
    rect(c, 5, -9, 5, 2, '#ffd34d');                    // refleks
    rect(c, 4, -4, 11, 4, '#15171c'); rect(c, 4, -1, 11, 1.5, '#6b7078');   // kraftig støvel
  } else {
    const ls = p.moving ? Math.sin(p.walkT) * 4 : 0;
    rect(c, -6 + ls, -18, 5, 12, JACKET); rect(c, -6 + ls, -12, 5, 2, '#ffd34d');
    rect(c, -8 + ls, -6, 9, 6, '#15171c'); rect(c, -8 + ls, -1.5, 9, 1.5, '#6b7078');
    rect(c, 1 - ls, -18, 5, 12, '#323845'); rect(c, 1 - ls, -12, 5, 2, '#ffd34d');
    rect(c, -1 - ls, -6, 10, 6, '#1d2026'); rect(c, -1 - ls, -1.5, 10, 1.5, '#6b7078');
  }
  c.save(); c.translate(0, dy);                         // overkroppen senkes når man setter seg

  // Bakre arm
  limb(c, -3, -38, bh.x, bh.y, 6, JACKET_D);
  limb(c, -3, -38, -3 + (bh.x + 3) * .35, -38 + (bh.y + 38) * .35, 6, '#c26c16');
  rect(c, bh.x - 2.5, bh.y - 2.5, 5, 5, skin);

  // Kropp, belte, refleks og skjerf
  rect(c, -9, -40, 18, 24, JACKET);
  rect(c, -9, -40, 18, 9, ORANGE);                      // oransje overdel
  rect(c, -9, -29, 18, 2, '#ffd34d');                   // reflekstriper
  rect(c, -9, -21, 18, 2, '#ffd34d');
  rect(c, 0, -31, 1.5, 15, '#55606e');                  // glidelås
  rect(c, 4, -26, 4, 4, '#1d212a');                     // brystlomme
  rect(c, -8, -43, 16, 4, JACKET); rect(c, -8, -43, 16, 1.5, ORANGE);   // høy krage

  // Hode
  rect(c, -6, -57, 12, 14, skin);
  rect(c, 6, -52, 2, 3, skin);                                      // nese
  if (stage >= 3) rect(c, 6, -50, 2, 3, '#d6f3ff');                 // isdrope på nesen
  if (frozen) { rect(c, 2, -52, 3, 1, '#102030'); rect(c, 1, -46, 4, 1, '#102030'); }
  else {
    rect(c, 2, -52, 2, 2, '#1a1a1a');
    rect(c, 1, -46, 4, 1, stage >= 2 ? '#1c3f8a' : '#8a4a3a');      // munn (blå lepper når kald)
  }
  if (stage === 0) rect(c, -1, -48, 2, 1, 'rgba(255,120,120,.5)');
  // Pelslue med øreklaffer
  const FUR = '#7b5333', FUR_L = '#a07848', FUR_D = '#573820';
  c.fillStyle = FUR; c.beginPath(); c.ellipse(0, -62, 10.5, 8, 0, 0, 6.3); c.fill();
  rect(c, -10, -61, 20, 6, FUR_L);
  c.fillStyle = FUR_L;
  for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-9 + i * 4.5, -55); c.lineTo(-6.75 + i * 4.5, -53); c.lineTo(-4.5 + i * 4.5, -55); c.closePath(); c.fill(); }
  rect(c, -9, -58, 9, 15, FUR);                                    // øreklaff
  c.fillStyle = FUR_L;
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-9 + i * 3, -43); c.lineTo(-7.5 + i * 3, -40); c.lineTo(-6 + i * 3, -43); c.closePath(); c.fill(); }
  c.fillStyle = FUR_D;
  [[-6, -66], [2, -68], [6, -64], [-3, -60], [4, -59], [-7, -52], [-4, -47], [-2, -56]].forEach(([fx2, fy2]) => c.fillRect(fx2, fy2, 2, 2));
  if (stage >= 2) { c.fillStyle = 'rgba(255,255,255,.85)'; [[-5, -67], [3, -66], [-8, -58], [7, -61], [-3, -50]].forEach(([fx2, fy2]) => c.fillRect(fx2, fy2, 1.5, 1.5)); }

  // Fiskestang
  if (p.state === 'fish' && !frozen) {
    const fg = game.fight;
    const bend = fg ? 5 + fg.progress * 0 + Math.sin(clock * 25) * (fg.thrash > 0 ? 3 : 1.2) + fg.pulse * 3 : Math.sin(clock * 2) * .8;
    const tipY = -62 + bend;
    c.strokeStyle = ROD_COL[shop.rod]; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(10, -31); c.quadraticCurveTo(24, -50 + bend * .5, 34, tipY); c.stroke();
    c.fillStyle = '#8a98a6'; c.beginPath(); c.arc(13, -29, 3, 0, 6.3); c.fill();
    p.tipX = p.x + p.dir * 34 * SC; p.tipY = ICE_TOP + (tipY + dy) * SC;
  }

  // Fremre arm
  limb(c, 3, -38, fh.x, fh.y, 6, JACKET);
  limb(c, 3, -38, 3 + (fh.x - 3) * .35, -38 + (fh.y + 38) * .35, 6, ORANGE);
  rect(c, fh.x - 2.5, fh.y - 2.5, 5, 5, skin);

  // Kaffekopp
  if (cup) {
    rect(c, cup.x - 1, cup.y - 4, 7, 8, '#f5f1e8');
    rect(c, cup.x - 1, cup.y - 4, 7, 2, '#5b3416');
    c.strokeStyle = '#f5f1e8'; c.lineWidth = 1.5; c.beginPath(); c.arc(cup.x + 7, cup.y, 2.5, -1.5, 1.5); c.stroke();
  }

  c.restore();

  // Isblokk når fiskeren fryser helt
  if (frozen) {
    const a = Math.min(.8, game.freezeT * .9);
    c.fillStyle = 'rgba(150,220,255,' + a + ')'; c.fillRect(-18, -78, 36, 82);
    c.fillStyle = 'rgba(255,255,255,' + a * .7 + ')'; c.fillRect(-15, -75, 4, 60); c.fillRect(-15, -75, 20, 3);
    c.strokeStyle = 'rgba(255,255,255,' + a + ')'; c.lineWidth = 2; c.strokeRect(-18, -78, 36, 82);
    c.fillStyle = 'rgba(190,235,255,' + a + ')';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-15 + i * 9, 4); c.lineTo(-11 + i * 9, 4); c.lineTo(-13 + i * 9, 10 + (i % 2) * 5); c.closePath(); c.fill(); }
  }
  c.restore();
}

// ---------------------------------------------------------------------
// Tegning: scene
// ---------------------------------------------------------------------
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function txt(s, x, y, size, col, align, out) {
  ctx.font = 'bold ' + size + 'px ' + FONT;
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  if (out !== null) {
    ctx.lineWidth = Math.max(2, size / 5); ctx.strokeStyle = out || 'rgba(5,15,30,.75)'; ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}

function drawCloud(c) {
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  const s = 8 * c.s;
  ctx.fillRect(c.x, c.y, s * 8, s);
  ctx.fillRect(c.x + s, c.y - s, s * 5, s);
  ctx.fillRect(c.x + s * 2, c.y - s * 2, s * 2, s);
  ctx.fillRect(c.x + s * 2, c.y + s, s * 4, s * .6);
}

// Hullformen i tverrsnitt: svakt traktformet (videre i toppen), og med rund bunn mens det bores
function holeShape(x, hw, d, round) {
  const th = (ICE_BOT - ICE_TOP) * d, n = 10;
  const wall = t => hw + 4 * Math.pow(1 - t, 2.2);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const t = i / n, px = x - wall(t), py = ICE_TOP + th * t; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
  if (round) ctx.quadraticCurveTo(x, ICE_TOP + th + hw * 1.1, x + hw, ICE_TOP + th);
  for (let i = n; i >= 0; i--) { const t = i / n; ctx.lineTo(x + wall(t), ICE_TOP + th * t); }
  ctx.closePath();
}

function drawHoles() {
  const th = ICE_BOT - ICE_TOP, hw = HOLE_W / 2;
  for (const h of holes) {
    const x = h.x;
    // vannfylt sjakt gjennom isen
    holeShape(x, hw, 1, false);
    const g = ctx.createLinearGradient(0, ICE_TOP, 0, ICE_BOT);
    g.addColorStop(0, '#2b8fc0'); g.addColorStop(1, '#1d6f9c');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x - hw - 5, ICE_TOP, 6, th);        // lys vegg
    ctx.fillStyle = 'rgba(8,40,80,.38)'; ctx.fillRect(x + hw - 4, ICE_TOP, 9, th);           // skygge på motsatt vegg
    if (h.empty) {
      ctx.fillStyle = '#dff3fc'; ctx.fillRect(x - hw - 5, ICE_TOP, HOLE_W + 10, Math.ceil(th * h.freeze));
      if (h.freeze >= 1) {
        ctx.strokeStyle = 'rgba(70,130,170,.6)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 10, ICE_TOP + 3); ctx.lineTo(x - 1, ICE_TOP + 14); ctx.lineTo(x - 5, ICE_TOP + 24);
        ctx.moveTo(x - 1, ICE_TOP + 14); ctx.lineTo(x + 9, ICE_TOP + 18); ctx.stroke();
      }
    }
    ctx.restore();
    // rund åpning i overflaten
    const frozen = h.empty && h.freeze > .6;
    ctx.beginPath(); ctx.ellipse(x, ICE_TOP + 1, hw + 4, 4.2, 0, 0, 6.3);
    ctx.fillStyle = frozen ? '#e8f7ff' : '#0f4a72'; ctx.fill();
    if (!frozen) {
      ctx.strokeStyle = 'rgba(160,220,255,.5)'; ctx.lineWidth = 1;
      const rp = .55 + .3 * Math.sin(clock * 2 + x);
      ctx.beginPath(); ctx.ellipse(x, ICE_TOP + 1.5, (hw + 2) * rp, 2.4 * rp, 0, 0, 6.3); ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, ICE_TOP + 1, hw + 4, 4.2, 0, 0, 6.3); ctx.stroke();
    // avrundede snøkanter
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(x - hw - 6, ICE_TOP - .5, 8, 3.6, 0, 0, 6.3); ctx.ellipse(x + hw + 6, ICE_TOP - .5, 8, 3.6, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(170,205,230,.5)';
    ctx.beginPath(); ctx.ellipse(x + hw + 7, ICE_TOP + .5, 6, 2, 0, 0, 6.3); ctx.fill();
  }
  // Hullet som bores akkurat nå (smalt og rundt, vokser mot overflaten)
  if (player.drill > .001 && mode === 'play') {
    const f = player.drill, x = frontX();
    holeShape(x, 5, f, true); ctx.fillStyle = '#0f4468'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, ICE_TOP + 1, 4 + (hw) * f, 1.5 + 2.7 * f, 0, 0, 6.3);
    ctx.fillStyle = '#0f3d60'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

function drawLightRays() {
  for (const h of holes) {
    if (h.empty) continue;
    const a = .2 + Math.sin(clock * 1.5 + h.x) * .04;
    const g = ctx.createLinearGradient(0, ICE_BOT, 0, ICE_BOT + 280);
    g.addColorStop(0, 'rgba(210,240,255,' + a + ')'); g.addColorStop(1, 'rgba(210,240,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(h.x - HOLE_W / 2, ICE_BOT); ctx.lineTo(h.x + HOLE_W / 2, ICE_BOT);
    ctx.lineTo(h.x + HOLE_W / 2 + 80, ICE_BOT + 280); ctx.lineTo(h.x - HOLE_W / 2 - 80, ICE_BOT + 280);
    ctx.closePath(); ctx.fill();
  }
}

function drawFishes() {
  for (const f of fishes) {
    if (f.state === 'hooked') continue;
    const wob = Math.sin(f.t * 1.5 + f.phase) * 5;
    ctx.save();
    ctx.translate(f.x, f.y + wob);
    ctx.scale(f.dir, 1);
    ctx.rotate(Math.sin(f.t * 1.5 + f.phase) * .05);
    drawFish(ctx, f.T, f.L, 'shadow', f.t, f.flee > 0 ? 2 : 1);
    ctx.restore();
  }
}

function drawLineAndHook() {
  const p = player;
  if (p.state !== 'fish' || !p.hole) return;
  const h = p.hole, hy = game.hookVisY, fg = game.fight;
  // Snøret
  ctx.strokeStyle = 'rgba(240,248,255,.95)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(p.tipX, p.tipY); ctx.lineTo(h.x, ICE_TOP); ctx.lineTo(h.x + (fg ? Math.sin(clock * 30) * 1.5 : game.nibble ? Math.sin(clock * 45) * 1.6 : 0), hy); ctx.stroke();
  // Fisk som henger på kroken
  if (fg) {
    const f = fg.fish;
    ctx.save();
    ctx.translate(h.x, hy + f.L * .5);
    ctx.rotate(-Math.PI / 2 + Math.sin(clock * 18) * (fg.thrash > 0 ? .5 : .22));
    ctx.translate(0, 0);
    drawFish(ctx, f.T, f.L, 'color', clock * 2.2, 2.5);
    ctx.restore();
  }
  // Krok med agn (fra nivå 4: blinkende pilk med glimt)
  ctx.strokeStyle = '#d0d8e0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(h.x, hy); ctx.lineTo(h.x, hy + 6); ctx.arc(h.x - 3, hy + 6, 3, 0, Math.PI); ctx.stroke();
  {
    ctx.fillStyle = ['#dbe8f4', '#f0c24a', '#bfefff'][shop.jig]; ctx.beginPath(); ctx.ellipse(h.x - 3, hy + 12, 2.4, 5, .25, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#ff8a2a'; ctx.fillRect(h.x - 4.5, hy + 11, 3, 1.5);
    const gl = Math.max(game.level >= 4 ? Math.max(0, Math.sin(clock * 4.5)) : 0, game.jigE * Math.abs(Math.sin(clock * 9)));
    if (gl > .05) {
      const gx = h.x - 3, gy = hy + 11;
      const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 16);
      rg.addColorStop(0, 'rgba(255,255,255,' + (.55 * gl) + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg; ctx.fillRect(gx - 16, gy - 16, 32, 32);
      ctx.strokeStyle = 'rgba(255,255,255,' + gl + ')'; ctx.lineWidth = 1.3;
      const L2 = 3 + 7 * gl;
      ctx.beginPath(); ctx.moveTo(gx - L2, gy); ctx.lineTo(gx + L2, gy); ctx.moveTo(gx, gy - L2); ctx.lineTo(gx, gy + L2); ctx.stroke();
    }
  }
}

function drawBubbles() {
  ctx.strokeStyle = 'rgba(200,235,255,.6)'; ctx.lineWidth = 1;
  for (const b of bubbles) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.3); ctx.stroke(); }
}

function drawParts() {
  for (const q of parts) {
    const a = clamp(q.life / q.max, 0, 1);
    ctx.globalAlpha = q.soft ? a * .55 : a;
    ctx.fillStyle = q.col;
    if (q.soft) { ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1.5 - a * .5), 0, 6.3); ctx.fill(); }
    else ctx.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size);
  }
  ctx.globalAlpha = 1;
}

function drawSnow() {
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (const f of flakes) ctx.fillRect(Math.round(f.x), Math.round(f.y), f.s, f.s);
  if (game.stormI > .01) {                       // tette, skråstilte fnugg
    ctx.strokeStyle = 'rgba(255,255,255,' + (.75 * game.stormI) + ')'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const f of stormFlakes) { ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * f.len, f.y - f.v * f.len); }
    ctx.stroke();
  }
}

// Hvit dis og vindstriper over landskapet under storm
function drawStormHaze() {
  const a = game.stormI;
  if (a < .01) return;
  const g = ctx.createLinearGradient(0, 0, 0, ICE_TOP + 20);
  g.addColorStop(0, 'rgba(225,236,248,' + (.18 * a) + ')'); g.addColorStop(1, 'rgba(225,236,248,' + (.42 * a) + ')');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, ICE_TOP + 20);
  ctx.strokeStyle = 'rgba(255,255,255,' + (.18 * a) + ')'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const y = 90 + i * 18, x = ((clock * (500 + i * 40) + i * 170) % (W + 300)) - 150;
    ctx.moveTo(x, y); ctx.lineTo(x + 130 + (i % 3) * 40, y - 5);
  }
  ctx.stroke();
}

// Lite varsel og nedtelling under snøstorm
function drawStormUI() {
  if (game.storm <= 0) return;
  panel(W - 222, 40, 206, 26, 13, 'rgba(191,227,255,.7)', 'rgba(20,50,80,.85)');
  const cx = W - 206, cy = 53;
  ctx.strokeStyle = '#dff1ff'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.moveTo(cx - Math.cos(a) * 6, cy - Math.sin(a) * 6); ctx.lineTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); }
  ctx.stroke();
  txt('SNØSTORM  ' + Math.ceil(game.storm) + ' s  ·  +25 % kulde', W - 194, 57, 11, '#dff1ff', 'left', null);
  if (game.stormAlert > 0) {
    ctx.globalAlpha = clamp(game.stormAlert, 0, 1);
    ctx.save(); ctx.shadowColor = 'rgba(160,210,255,.9)'; ctx.shadowBlur = 18;
    txt('SNØSTORM!', W / 2, 190 + Math.sin(clock * 10) * 2, 30, '#e6f4ff', 'center', 'rgba(20,50,90,.8)');
    ctx.restore(); ctx.globalAlpha = 1;
  }
}

function drawPopups() {
  for (const p of popups) {
    const u = p.t / p.life, a = u < .75 ? 1 : 1 - (u - .75) / .25;
    ctx.globalAlpha = a;
    const y = p.y - Math.min(1, p.t * 2.5) * 50 - p.t * 14;
    ctx.save();
    ctx.translate(p.x, y);
    ctx.rotate(Math.sin(p.t * 12) * .15);
    ctx.scale(Math.min(1, .4 + p.t * 3), Math.min(1, .4 + p.t * 3));
    if (p.key) drawFish(ctx, FISH[p.key], p.L, 'color', p.t * 3, 1);
    ctx.restore();
    txt(p.text, p.x, p.key ? y - 26 : y, 22, p.key ? '#ffe14a' : (p.text[0] === '−' ? '#ff6a5a' : '#7dff9b'), 'center');
  }
  ctx.globalAlpha = 1;
}

// Pil over hull som er innen rekkevidde
function drawPile() {
  const c = ctx, x = game.pileX, p = player, n = game.pile.length;
  const y0 = ICE_TOP;
  // rep fra pulken til fiskeren
  const ex = x + (p.x > x ? 1 : -1) * 46;
  c.strokeStyle = '#6b4a2b'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(ex, y0 - 3); c.quadraticCurveTo((ex + p.x) / 2, y0 + 2, p.x, y0 - 20); c.stroke();
  // pulk
  rect(c, x - 48, y0 - 6, 96, 5, '#b33a2a');
  rect(c, x - 48, y0 - 1, 96, 2, '#3a3f45');
  rect(c, x - 51, y0 - 5, 4, 5, '#3a3f45'); rect(c, x + 47, y0 - 5, 4, 5, '#3a3f45');
  // fisk i haug (pyramide, de 15 siste vises)
  const vis = Math.min(n, 15), start = n - vis;
  let i = 0;
  for (let r = 0; r < 5 && i < vis; r++) {
    const cnt = 5 - r;
    for (let k = 0; k < cnt && i < vis; k++, i++) {
      const idx = start + i, T = FISH[game.pile[idx]];
      c.save();
      c.translate(x + (k - (cnt - 1) / 2) * 17, y0 - 11 - r * 7);
      c.rotate(((idx * 37) % 7 - 3) * .09);
      c.scale(idx % 2 ? 1 : -1, 1);
      drawFish(c, T, clamp(T.len * .45, 24, 42), 'color', 0, 0);
      c.restore();
    }
  }
  if (n > 0) txt('×' + n, x, y0 - 62, 14, '#ffe14a', 'center');
}

// Hundehus med saltak, rund døråpning og snø på taket
function doorPath(c, x, y) {
  c.beginPath(); c.moveTo(x - 10, y); c.lineTo(x - 10, y - 14); c.arc(x, y - 14, 10, Math.PI, 0); c.lineTo(x + 10, y);
}
function drawKennel() {
  const c = ctx, x = 0, y = 0;
  c.save();
  c.translate(KENNEL_X, KENNEL_Y); c.scale(KENNEL_S, KENNEL_S);
  c.fillStyle = 'rgba(40,80,120,.22)'; c.beginPath(); c.ellipse(x, y + 1, 38, 3, 0, 0, 6.3); c.fill();
  c.fillStyle = '#a2673a'; c.fillRect(x - 26, y - 30, 52, 30);
  c.strokeStyle = 'rgba(60,30,10,.35)'; c.lineWidth = 1;
  for (let i = -20; i <= 24; i += 8) { c.beginPath(); c.moveTo(x + i, y - 30); c.lineTo(x + i, y); c.stroke(); }
  c.fillStyle = '#1b1410'; doorPath(c, x, y); c.closePath(); c.fill();
  c.strokeStyle = '#d8b27a'; c.lineWidth = 2; doorPath(c, x, y); c.stroke();
  // tak
  c.fillStyle = '#8a2f24'; c.beginPath(); c.moveTo(x - 34, y - 28); c.lineTo(x, y - 53); c.lineTo(x + 34, y - 28); c.closePath(); c.fill();
  c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x - 33, y - 29); c.lineTo(x, y - 53); c.lineTo(x + 33, y - 29); c.stroke();
  c.fillStyle = '#d8b27a'; c.fillRect(x - 11, y - 41, 22, 7);
  txt('VOFF', x, y - 35.5, 7, '#5a3b22', 'center', null);
  // matskål
  c.fillStyle = '#3a6ea5'; c.fillRect(x + 31, y - 4, 11, 4);
  c.restore();
}

// Hunden sover i hundehuset (bare hodet synes i døråpningen)
function drawDogPeek() {
  const c = ctx, x = 0, y = 0;
  c.save();
  c.translate(KENNEL_X, KENNEL_Y); c.scale(KENNEL_S, KENNEL_S);
  doorPath(c, x, y); c.closePath(); c.clip();
  c.fillStyle = '#8f949b'; c.beginPath(); c.ellipse(x, y - 8, 8, 7, 0, 0, 6.3); c.fill();
  c.fillStyle = '#4d5258';
  c.beginPath(); c.moveTo(x - 8, y - 11); c.lineTo(x - 7, y - 21); c.lineTo(x - 2, y - 13); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x + 8, y - 11); c.lineTo(x + 7, y - 21); c.lineTo(x + 2, y - 13); c.closePath(); c.fill();
  c.fillStyle = '#ebe8e1'; c.beginPath(); c.ellipse(x, y - 4, 4.5, 3.2, 0, 0, 6.3); c.fill();
  c.fillStyle = '#1b1b1f'; c.fillRect(x - 1.5, y - 7, 3, 2); c.fillRect(x - 5, y - 11, 3, 1); c.fillRect(x + 2, y - 11, 3, 1);
  c.fillStyle = '#c0392b'; c.fillRect(x - 8, y - 1, 16, 2);
  c.restore();
  txt('Zzz', KENNEL_X + 24, KENNEL_Y - 38 + Math.sin(clock * 2) * 3, 11, 'rgba(220,235,255,.9)', 'center', null);
}

function drawDog() {
  const d = game.dog, c = ctx;
  if (d.state === 'idle') { drawDogPeek(); return; }
  const G = '#8f949b', DK = '#4d5258', LT = '#ebe8e1';
  const by = -15;
  const leg = d.moving ? Math.sin(d.runT) * 5 : 0;
  const k = clamp(Math.abs(d.x - KENNEL_X) / 50, 0, 1);
  const gy = lerp(KENNEL_Y, ICE_TOP - 4, k);                      // bak hullene, ikke foran
  c.save();
  c.translate(d.x, gy); c.scale(d.dir * 1.0, 1.0);
  // krøllet hale (elghund) som logrer
  c.strokeStyle = G; c.lineWidth = 5; c.lineCap = 'round';
  const wag = d.moving ? Math.sin(clock * 14) * 1.5 : Math.sin(clock * 9) * 2;
  c.beginPath(); c.moveTo(-13, by - 2); c.bezierCurveTo(-24 + wag, by - 6, -20 + wag, by - 19, -10, by - 12); c.stroke();
  c.fillStyle = DK;
  c.fillRect(-11 + leg, by + 3, 3, -by - 3); c.fillRect(-5 - leg, by + 3, 3, -by - 3);
  c.fillRect(6 - leg, by + 3, 3, -by - 3); c.fillRect(11 + leg, by + 3, 3, -by - 3);
  c.fillStyle = G; c.beginPath(); c.ellipse(0, by, 14, 6.5, 0, 0, 6.3); c.fill();
  c.fillStyle = DK; c.beginPath(); c.ellipse(-1, by - 2.5, 12, 4, 0, 0, 6.3); c.fill();
  c.fillStyle = LT; c.beginPath(); c.ellipse(2, by + 4, 9, 2.5, 0, 0, 6.3); c.fill();
  c.fillStyle = G; c.beginPath(); c.ellipse(11, by - 3, 5, 6, .3, 0, 6.3); c.fill();
  c.fillStyle = '#c0392b'; c.fillRect(9, by - 6, 3, 8);
  const hx = 16, hyy = by - 7;
  c.fillStyle = G; c.beginPath(); c.ellipse(hx, hyy, 7, 6, 0, 0, 6.3); c.fill();
  c.fillStyle = LT; c.beginPath(); c.ellipse(hx + 6, hyy + 2, 5, 3, 0, 0, 6.3); c.fill();
  c.fillStyle = DK;
  const ear = d.state === 'chase' ? 3 : 0;
  c.beginPath(); c.moveTo(hx - 5, hyy - 4); c.lineTo(hx - 3, hyy - 13 - ear); c.lineTo(hx + 2, hyy - 5); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(hx + 1, hyy - 5); c.lineTo(hx + 4, hyy - 12 - ear); c.lineTo(hx + 7, hyy - 3); c.closePath(); c.fill();
  c.fillRect(hx + 10, hyy, 3, 3);
  c.fillRect(hx + 3, hyy - 3, 2, 2);
  c.restore();
  if (d.state === 'alert') txt('!', d.x, gy - 34 + Math.sin(clock * 12) * 2, 18, '#ffd34d', 'center');
}

function drawFox() {
  const f = game.fox; if (!f) return;
  const c = ctx, moving = f.state !== 'sniff', leg = moving ? Math.sin(f.runT) * 4 : 0;
  const hy = f.state === 'sniff' ? 4 + Math.sin(f.t * 14) * 1.5 : 0;
  const O = '#e07a2e', D = '#3a2418';
  c.save();
  c.translate(f.x, ICE_TOP); c.scale(f.dir * 1.3, 1.3);
  // hale
  c.fillStyle = O; c.save(); c.translate(-19, -13); c.rotate(-.45 + Math.sin(f.runT * .5) * .1);
  c.beginPath(); c.ellipse(0, 0, 10, 4.5, 0, 0, 6.3); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-8, 0, 3, 3.6, 0, 0, 6.3); c.fill(); c.restore();
  // bein
  c.fillStyle = D;
  c.fillRect(-11 + leg, -7, 3, 7); c.fillRect(-5 - leg, -7, 3, 7); c.fillRect(6 - leg, -7, 3, 7); c.fillRect(11 + leg, -7, 3, 7);
  // kropp
  c.fillStyle = O; c.beginPath(); c.ellipse(0, -12, 15, 7, 0, 0, 6.3); c.fill();
  c.fillStyle = '#f6e6d0'; c.beginPath(); c.ellipse(2, -8, 10, 3, 0, 0, 6.3); c.fill();
  // hode
  c.fillStyle = O; c.beginPath(); c.ellipse(15, -17 + hy, 7, 6, 0, 0, 6.3); c.fill();
  c.beginPath(); c.moveTo(19, -20 + hy); c.lineTo(29, -15 + hy); c.lineTo(19, -12 + hy); c.closePath(); c.fill();
  c.fillStyle = '#f6e6d0'; c.beginPath(); c.moveTo(16, -13 + hy); c.lineTo(26, -14 + hy); c.lineTo(18, -10 + hy); c.closePath(); c.fill();
  c.fillStyle = '#b85a1c'; c.beginPath(); c.moveTo(10, -21 + hy); c.lineTo(11, -30 + hy); c.lineTo(16, -22 + hy); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(15, -22 + hy); c.lineTo(18, -30 + hy); c.lineTo(20, -20 + hy); c.closePath(); c.fill();
  c.fillStyle = D; c.fillRect(28, -16 + hy, 2, 2); c.fillRect(18, -19 + hy, 2, 2);
  // bytte i munnen
  if (f.loot) {
    c.save(); c.translate(30, -9); c.rotate(1.3);
    drawFish(c, FISH[f.loot], 30, 'color', f.runT * .3, .5);
    c.restore();
  }
  c.restore();
  if (f.state === 'in' || f.state === 'sniff') {
    const b = Math.sin(clock * 12) * 2;
    txt('REV!', f.x, ICE_TOP - 50 + b, 18, '#ff6a5a', 'center');
  }
}

function drawHoleMarkers() {
  if (mode !== 'play') return;
  // små prikker viser hvor mange fisk det er igjen i hvert hull
  for (const h of holes) {
    if (h.empty) continue;
    for (let i = 0; i < h.catches; i++) {
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(h.x + (i - (h.catches - 1) / 2) * 8, ICE_TOP - 8, 2.6, 0, 6.3); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  if (player.state !== 'walk') return;
  const fx = frontX();
  for (const h of holes) {
    if (h.empty || Math.abs(h.x - fx) > 70) continue;
    const ok = Math.abs(h.x - fx) <= 16;
    const bob = Math.sin(clock * 6) * 3;
    ctx.fillStyle = ok ? '#ffe14a' : 'rgba(255,255,255,.6)';
    ctx.beginPath(); ctx.moveTo(h.x - 6, ICE_TOP - 26 + bob); ctx.lineTo(h.x + 6, ICE_TOP - 26 + bob); ctx.lineTo(h.x, ICE_TOP - 15 + bob); ctx.closePath(); ctx.fill();
  }
}

// Glass-panel: myk skygge, halvgjennomsiktig fyll, glans og tynn kant
function panel(x, y, w, h, r, accent, tint) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,8,28,.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
  rr(x, y, w, h, r); ctx.fillStyle = tint || 'rgba(12,30,62,.6)'; ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,255,255,.17)'); g.addColorStop(1, 'rgba(255,255,255,.02)');
  rr(x, y, w, h, r); ctx.fillStyle = g; ctx.fill();
  rr(x + .5, y + .5, w - 1, h - 1, r); ctx.strokeStyle = accent || 'rgba(255,255,255,.26)'; ctx.lineWidth = 1.2; ctx.stroke();
}
// Liten etikett med bokstavavstand
function lbl(s, x, y, col, align) {
  ctx.save();
  if ('letterSpacing' in ctx) ctx.letterSpacing = '1.5px';
  txt(s, x, y, 10, col || 'rgba(190,225,250,.8)', align, null);
  ctx.restore();
}

function cupIcon(x, y, full) {
  const body = full ? '#f4f1ea' : 'rgba(255,255,255,.2)';
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 24, y); ctx.lineTo(x + 20, y + 24); ctx.quadraticCurveTo(x + 19, y + 26, x + 17, y + 26);
  ctx.lineTo(x + 7, y + 26); ctx.quadraticCurveTo(x + 5, y + 26, x + 4, y + 24); ctx.closePath(); ctx.fill();
  if (full) { ctx.fillStyle = '#6b3d1c'; ctx.fillRect(x + 1, y + 2, 22, 5); }
  ctx.strokeStyle = body; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x + 25, y + 11, 6, -1.4, 1.4); ctx.stroke();
  if (full) {
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath(); const sx = x + 8 + i * 8, ph = clock * 3 + i;
      ctx.moveTo(sx, y - 3); ctx.quadraticCurveTo(sx + Math.sin(ph) * 4, y - 9, sx, y - 14); ctx.stroke();
    }
  }
}

function getHint() {
  const p = player;
  if (game.hintMsgT > 0) return game.hintMsg;
  if (game.fight) return 'SVEIV! Trykk SPACE / ↑ gjentatte ganger!';
  if (game.dog.state === 'chase') return 'Hunden jager reven!';
  if (game.fox && (game.fox.state === 'in' || game.fox.state === 'sniff')) return 'REV! Trykk F (eller klikk) for å jage den bort!';
  if (game.cold >= 3.6 && game.coffee > 0) return 'Du fryser! Trykk K for kaffe';
  if (p.drinkTimer > 0) return 'Sluuurp…';
  if (p.state === 'fish') return game.hookDepth <= 3 ? '↓ senk snøret  •  ↑ dra opp  •  ← → gå videre' : '↑ / ↓ dybde  •  SPACE: pilk i rytme for å lokke fisk  •  kjenn etter napp';
  if (p.drill > .001) return 'Borer…';
  const h = nearHole(frontX(), 40);
  if (h) {
    if (Math.abs(h.x - frontX()) <= 16) return 'Trykk ↓ / S for å slippe ned snøret';
    return 'Flytt deg litt for å nå hullet (eller bor lenger unna)';
  }
  const e = findHole(frontX(), 20);
  if (e && e.empty) return 'Hullet er tomt – hold SPACE for å bore om igjen';
  return 'Hold SPACE for å bore et hull (så mange du vil)';
}

// Statuskortene ligger nå rundt scenen (se updateDom). Her tegnes bare meldinger og hint i selve scenen.
const MONO = 'ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace';
function drawHUD() {
  // ---- Meldinger (små "toast"-piller) ----
  let y = 40, shown = 0;
  ctx.font = '600 12px ' + MONO;
  for (const l of logs) {
    if (shown >= 4) break;
    const a = clamp((11 - l.t) / 3, 0, 1);
    if (a <= 0) continue;
    const slide = (1 - Math.min(1, l.t * 6)) * -26;
    const tw = ctx.measureText(l.text).width + 32;
    ctx.globalAlpha = a;
    rr(16 + slide, y, tw, 26, 13); ctx.fillStyle = 'rgba(8,24,32,.78)'; ctx.fill();
    rr(16.5 + slide, y + .5, tw - 1, 25, 13); ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = l.col; ctx.beginPath(); ctx.arc(30 + slide, y + 13, 3.5, 0, 6.3); ctx.fill();
    ctx.font = '600 12px ' + MONO; ctx.textAlign = 'left'; ctx.fillStyle = '#e8f1f5'; ctx.fillText(l.text, 42 + slide, y + 17.5);
    ctx.globalAlpha = 1;
    y += 31; shown++;
  }

  // ---- Hint nederst (som i skjermbildet: mørk pille med monospace) ----
  const hint = getHint();
  ctx.font = '600 13px ' + MONO;
  const hw = ctx.measureText(hint).width + 36;
  rr(W / 2 - hw / 2, 556, hw, 32, 10); ctx.fillStyle = 'rgba(7,21,28,.86)'; ctx.fill();
  rr(W / 2 - hw / 2 + .5, 556.5, hw - 1, 31, 10); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.textAlign = 'center'; ctx.fillStyle = '#eaf3f7'; ctx.fillText(hint, W / 2, 576);
}

// Fremdriftsmåler for isboret
function drawDrillMeter() {
  const p = player;
  if (p.drill <= .001) return;
  const x = clamp(p.x - p.dir * 95, 80, 800), y = ICE_TOP - 62, w = 100, h = 10;   // bak fiskeren, unna HUD-en
  panel(x - w / 2 - 12, y - 22, w + 24, 44, 12);
  lbl('BORER', x - w / 2, y - 6);
  txt(Math.round(p.drill * 100) + '%', x + w / 2, y - 5, 11, '#ffffff', 'right', null);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(x - w / 2, y + 2, w, h, 5); ctx.fill();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#8fd3ff'); g.addColorStop(1, '#ffffff');
  ctx.fillStyle = g; rr(x - w / 2, y + 2, Math.max(h, w * p.drill), h, 5); ctx.fill();
}

// Pilke-måler: viser hvor godt du holder rytmen (SPACE) mens du fisker
function drawJigUI() {
  const p = player;
  if (mode !== 'play' || p.state !== 'fish' || game.fight || !p.hole) return;
  const x = clamp(p.hole.x + p.dir * 112, 100, 790), bw = 150, bh = 12, by = ICE_TOP - 60;
  panel(x - bw / 2 - 12, by - 24, bw + 24, bh + 56, 14);
  lbl('PILKING', x - bw / 2, by - 8);
  txt(game.jigE > .6 ? 'Fisken er nysgjerrig!' : 'SPACE i rytme', x + bw / 2, by - 7, 11, game.jigE > .6 ? '#7dff9b' : 'rgba(210,235,250,.9)', 'right', null);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(x - bw / 2, by, bw, bh, bh / 2); ctx.fill();
  const g = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
  g.addColorStop(0, '#8fd3ff'); g.addColorStop(1, '#ffe08a');
  if (game.jigE > .01) { ctx.fillStyle = g; rr(x - bw / 2, by, Math.max(bh, bw * game.jigE), bh, bh / 2); ctx.fill(); }
  txt(['Vanlig pilk', 'Gullpilk', 'Diamantpilk'][shop.jig], x, by + bh + 17, 11, 'rgba(190,225,250,.8)', 'center', null);
}

function drawFightUI() {
  const fg = game.fight;
  if (!fg) return;
  const h = player.hole;
  const x = clamp(h.x + player.dir * 112, 100, 790), bw = 150, bh = 16, by = ICE_TOP - 62;   // ved siden av hullet, unna HUD-en
  // NAPP!
  if (game.napp > 0) {
    const s = 1 + Math.sin(clock * 40) * .06;
    ctx.save(); ctx.translate(x + Math.sin(clock * 60) * 2, 96); ctx.scale(s, s);
    ctx.shadowColor = 'rgba(255,200,60,.9)'; ctx.shadowBlur = 24;
    txt('NAPP!', 0, 0, 46, '#ffe14a', 'center', '#7a2a00');
    ctx.restore();
  }
  panel(x - bw / 2 - 12, by - 26, bw + 24, bh + 66, 14, fg.thrash > 0 ? '#ff6a5a' : null);
  const p = clamp(fg.progress, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; rr(x - bw / 2, by, bw, bh, bh / 2); ctx.fill();
  ctx.fillStyle = p > .6 ? '#5ee06a' : p > .3 ? '#ffc94a' : '#ff5a4a';
  rr(x - bw / 2, by, Math.max(bh, bw * p), bh, bh / 2); ctx.fill();
  txt(fg.thrash > 0 ? 'FISKEN RYKKER!' : 'SVEIV!', x, by - 8, 13, fg.thrash > 0 ? '#ff9a8a' : '#ffffff', 'center');
  txt(fg.fish.T.key === 'stovel' ? 'Noe tungt…' : 'SPACE / ↑', x, by + bh + 22, 13, Math.floor(clock * 6) % 2 ? '#ffe14a' : '#ffffff', 'center');
}

function drawBanner() {
  if (game.banner <= 0 || mode !== 'play') return;
  const a = clamp(game.banner, 0, 1), k = 1 + Math.sin(clock * 12) * .03;
  ctx.globalAlpha = a;
  ctx.save(); ctx.translate(W / 2, 330); ctx.scale(k, k);
  ctx.shadowColor = 'rgba(125,255,155,.8)'; ctx.shadowBlur = 28;
  txt('NYTT NIVÅ!', 0, 0, 54, '#7dff9b', 'center', '#0b3a1a');
  ctx.shadowBlur = 0;
  txt('Nivå ' + game.level + '  –  ' + game.bannerText, 0, 34, 20, '#ffffff', 'center');
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawVignette() {
  if (mode === 'title') return;
  const a = clamp((game.cold - 1.5) / 3.5, 0, 1) * .55;
  if (a > .01) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 220, W / 2, H / 2, 640);
    g.addColorStop(0, 'rgba(190,235,255,0)'); g.addColorStop(1, 'rgba(190,235,255,' + a + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (game.cold >= 4 && mode === 'play') {
    ctx.fillStyle = 'rgba(60,120,255,' + (.06 + Math.sin(clock * 6) * .04) + ')'; ctx.fillRect(0, 0, W, H);
  }
  if (game.flash > 0) { ctx.fillStyle = 'rgba(255,240,120,' + game.flash * .5 + ')'; ctx.fillRect(0, 0, W, H); }
}

// Hvor langt ut i "natten" vi er (0 = dag, 1 = natt). Startskjermen viser skumring.
// Hvor sterkt nordlys-landskapet er (0–1), jevnt overgang når nivået endres
const auroraMix = () => themeCur === 2 ? themeT : themePrev === 2 ? 1 - themeT : 0;

function nightAmount() {
  let base;
  if (mode === 'title') base = .8;
  else {
    const t = clamp(game.time / ROUND_TIME, 0, 1);
    const u = clamp((t - .15) / .85, 0, 1);
    base = u * u * (3 - 2 * u);
  }
  return Math.max(base, auroraMix() * .95);            // nordlys-landskapet gir alltid natt
}

// Tegner landskapet bak strandkanten, med myk overgang mellom variantene
function drawBackdrop() {
  const L = [bgMount, bgForest, bgHills];
  if (themeT < 1) ctx.drawImage(L[themePrev], 0, 0, W, H);
  ctx.globalAlpha = themeT;
  ctx.drawImage(L[themeCur], 0, 0, W, H);
  ctx.globalAlpha = 1;
}

// Nordlys: myke, bølgende bånd som tones inn om natten
function drawAurora(n, boost) {
  if (n < .05) return;
  const bands = [['61,255,154', 62, 0], ['47,208,255', 92, 2.1], ['176,107,255', 40, 4.2]];
  if (boost > .3) bands.push(['94,255,210', 118, 1.1], ['255,120,220', 78, 5.3]);   // flere bånd i nordlys-landskapet
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  bands.forEach(([col, base, ph], bi) => {
    const top = x => base + Math.sin(x * .008 + clock * .25 + ph) * 22 + Math.sin(x * .021 - clock * .4 + ph) * 8;
    const hgt = x => 60 + Math.sin(x * .013 + clock * .5 + ph) * 22;
    const g = ctx.createLinearGradient(0, base - 40, 0, base + 100);
    g.addColorStop(0, 'rgba(' + col + ',0)'); g.addColorStop(.7, 'rgba(' + col + ',.55)'); g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g;
    for (let x = 0; x < W; x += 6) {
      ctx.globalAlpha = Math.min(1, n * (1 + boost * 1.1) * (.1 + .12 * (.5 + .5 * Math.sin(x * .09 + clock * 1.6 + bi))));
      ctx.fillRect(x, top(x), 6, hgt(x));
    }
  });
  ctx.restore();
}

function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const n = nightAmount();
  ctx.drawImage(bgSky, 0, 0, W, H);
  if (n > .01) { ctx.globalAlpha = n; ctx.drawImage(bgNight, 0, 0, W, H); ctx.globalAlpha = 1; }
  drawAurora(n, auroraMix());
  ctx.globalAlpha = 1 - .65 * n;
  clouds.forEach(drawCloud);
  ctx.globalAlpha = 1;
  drawBackdrop();
  ctx.drawImage(bg, 0, 0, W, H);
  if (n > .01) {                                   // skumringstone over landskapet
    ctx.fillStyle = 'rgba(10,18,70,' + (.34 * n) + ')'; ctx.fillRect(0, 0, W, H);
    // lys i hyttevinduene
    ctx.save(); ctx.shadowColor = '#ffcf5a'; ctx.shadowBlur = 14 * n; ctx.fillStyle = 'rgba(255,214,110,' + n + ')';
    ctx.fillRect(664, 203, 9, 9); ctx.fillRect(682, 203, 9, 9); ctx.restore();
    // varmt lys rundt fiskeren
    const gl = ctx.createRadialGradient(player.x, ICE_TOP - 30, 4, player.x, ICE_TOP - 30, 150);
    gl.addColorStop(0, 'rgba(255,200,120,' + (.22 * n) + ')'); gl.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = gl; ctx.fillRect(player.x - 160, ICE_TOP - 190, 320, 230);
  }

  // Skjermristing ved napp / rev
  if (game.shake > 0) ctx.translate((Math.random() - .5) * game.shake * 12, (Math.random() - .5) * game.shake * 12);
  drawLightRays();
  drawBubbles();   // fiskene er usynlige – de vises først når de henger på kroken
  drawKennel();
  drawDog();                 // hunden går bak hullene
  drawHoles();
  drawHoleMarkers();
  drawPile();
  drawFisher();
  drawFox();
  drawLineAndHook();
  drawParts();
  drawSnow();
  drawStormHaze();
  drawPopups();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  drawVignette();
  if (mode === 'play') drawDrillMeter();
  if (mode === 'play' || mode === 'frozen' || mode === 'over') drawHUD();
  if (mode === 'play') { drawStormUI(); drawJigUI(); drawFightUI(); }
  drawBanner();
  if (mode === 'frozen') {
    const a = clamp(game.freezeT - .6, 0, 1);
    ctx.globalAlpha = a;
    txt(game.endReason === 'frozen' ? 'Du frøs i hjel!' : 'Tiden er ute!', W / 2, 150, 54, '#d6f3ff', 'center', 'rgba(8,30,70,.8)');
    ctx.globalAlpha = 1;
  }
  if (paused) {
    ctx.fillStyle = 'rgba(5,15,32,.6)'; ctx.fillRect(0, 0, W, H);
    txt('PAUSE', W / 2, H / 2, 60, '#ffffff', 'center');
    txt('Trykk P for å fortsette', W / 2, H / 2 + 36, 18, '#cfe9f8', 'center');
  }
}

// ---------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'space' };

function toggleMute() { muted = !muted; if (!muted) sfx.click(); else windSet(0); }
function togglePause() { if (mode === 'play') paused = !paused; }

function onPress(k) {
  if (mode !== 'play' || paused) return;
  if (k === 'space' || k === 'up') {
    if (game.fight) crank();
    else if (k === 'space' && player.state === 'fish') jig();
    else if (k === 'up' && player.state === 'fish' && game.hookDepth <= 3 && game.time > game.noExitUntil) exitFishing();
  }
}

addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;   // ikke fang tastetrykk mens man skriver navn
  const k = KEYMAP[e.code];
  if (mode === 'play' && (k || e.code === 'KeyK')) e.preventDefault();
  if (e.code === 'KeyM' && !e.repeat) toggleMute();
  if (e.code === 'KeyP' && !e.repeat) togglePause();
  if (e.code === 'KeyK' && !e.repeat) tryDrink();
  if (e.code === 'KeyF' && !e.repeat) shoo();
  if (k) { keys[k] = true; if (!e.repeat) onPress(k); }
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (mode === 'play') paused = true; });

function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
canvas.addEventListener('mousedown', e => {
  if (mode !== 'play' || paused) return;
  const m = toLogical(e);
  if (game.fox && Math.abs(m.x - game.fox.x) < 45 && m.y > ICE_TOP - 70 && m.y < ICE_TOP + 10) shoo();
});


$('btnStart').addEventListener('click', e => { e.currentTarget.blur(); startGame(); });
$('btnAgain').addEventListener('click', e => { e.currentTarget.blur(); startGame(); });
$('btnShop').addEventListener('click', e => { e.currentTarget.blur(); openShop('title'); });
$('btnShop2').addEventListener('click', e => { e.currentTarget.blur(); openShop('end'); });
$('btnShopBack').addEventListener('click', e => { e.currentTarget.blur(); closeShop(); });
$('btnReset').addEventListener('click', e => {
  e.currentTarget.blur();
  best = { score: 0 }; saveBest(); board = []; currentEntry = null; saveBoard(); showTitle();
});

// ---------------------------------------------------------------------
// Størrelse og hovedløkke
// ---------------------------------------------------------------------
function resize() {
  const wrap = $('stageWrap');
  const top = wrap.getBoundingClientRect().top + window.scrollY;
  let cw = wrap.clientWidth;
  const availH = Math.max(340, innerHeight - top - 10);          // scenen skal passe i høyden uten å scrolle
  if (cw * H / W > availH) cw = availH * W / H;
  cw = Math.max(320, Math.floor(cw));
  const ch = Math.round(cw * H / W);
  stage.style.width = cw + 'px'; stage.style.height = ch + 'px';
  stage.style.setProperty('--u', (cw / W) + 'px');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  scale = canvas.width / W;
  buildBackground();
}
addEventListener('resize', resize);
addEventListener('load', () => { resize(); setTimeout(resize, 300); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);

// Berøringsknapper (kun på touch-enheter)
const isTouch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
let touchShown = false;
function bindTouch(id, key, extra) {
  const el = $(id);
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); el.classList.add('on');
    if (key) { keys[key] = true; onPress(key); }
    if (extra) extra();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, () => {
    el.classList.remove('on'); if (key) keys[key] = false;
  }));
}
bindTouch('tcL', 'left'); bindTouch('tcR', 'right'); bindTouch('tcU', 'up'); bindTouch('tcD', 'down');
bindTouch('tcA', 'space'); bindTouch('tcK', null, tryDrink); bindTouch('tcF', null, shoo);

// ---------------------------------------------------------------------
// Statuskort rundt scenen (DOM): tid, kroppstemperatur, poeng, fangst osv.
// ---------------------------------------------------------------------
const dom = {};
['hudTime', 'hudTimeSub', 'hudTemp', 'hudCold', 'hudTempBar', 'chipCoffee', 'hudScore', 'hudLevel', 'hudLevelBar', 'nowTag', 'nowText', 'nowBar',
 'catchChips', 'catchCount', 'sceneL', 'sceneR', 'chipWallet', 'btnPause', 'btnMute'].forEach(id => dom[id] = $(id));
let domT = 0, lastCatchVer = -1;
const mmss = sec => { const r = Math.ceil(Math.max(0, sec)); return String(Math.floor(r / 60)).padStart(2, '0') + ':' + String(r % 60).padStart(2, '0'); };

function fishSvg(T) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 40 20'); svg.setAttribute('width', '30'); svg.setAttribute('height', '15');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', T.key === 'stovel' ? 'M12 2 H22 V11 L34 14 V18 H10 Z' : 'M2 10 C10 1 24 1 31 8 L38 2 L36 10 L38 18 L31 12 C24 19 10 19 2 10 Z');
  p.setAttribute('fill', T.body); svg.appendChild(p);
  if (T.key !== 'stovel') { const b = document.createElementNS(ns, 'path'); b.setAttribute('d', 'M4 11 C12 17 24 17 30 12 C24 14 10 14 4 11 Z'); b.setAttribute('fill', T.belly); svg.appendChild(b); }
  return svg;
}

function updateDom(dt) {
  domT -= dt; if (domT > 0) return; domT = .1;
  const playing = mode === 'play' || mode === 'frozen' || mode === 'over';
  const left = playing ? Math.max(0, ROUND_TIME - game.time) : ROUND_TIME;
  dom.hudTime.textContent = mmss(left);
  dom.hudTime.classList.toggle('low', playing && left < 30);
  dom.hudTimeSub.textContent = 'Fisket ' + fmt1(Math.min(5, (ROUND_TIME - left) / GAME_HOUR)) + ' t · Igjen ' + fmt1(left / GAME_HOUR) + ' t';

  const temp = bodyTemp(), tf = clamp((temp - TEMP_DEAD) / (TEMP_NORMAL - TEMP_DEAD), 0, 1);
  dom.hudTemp.textContent = fmt1(temp) + ' °C';
  dom.hudCold.textContent = 'kulde ' + fmt1(Math.min(game.cold, MAX_COLD)) + ' / 5 t';
  dom.hudTempBar.style.width = (tf * 100) + '%';
  dom.hudTempBar.style.backgroundSize = (100 / Math.max(tf, .05)) + '% 100%';
  dom.chipCoffee.textContent = '☕ ' + game.coffee + (game.coffee === 1 ? ' kopp' : ' kopper') + ' (K)';
  dom.chipCoffee.disabled = game.coffee <= 0;
  dom.chipCoffee.classList.toggle('hot', mode === 'play' && game.cold >= 3.6 && game.coffee > 0);

  const need = levelNeed(game.level), prev = game.level > 1 ? levelNeed(game.level - 1) : 0;
  const pf = clamp((game.score - prev) / (need - prev), 0, 1);
  dom.hudScore.textContent = Math.floor(game.score);
  dom.hudLevel.textContent = 'Nivå ' + game.level + ' · ' + Math.floor(game.score) + ' / ' + need;
  dom.hudLevelBar.style.width = (pf * 100) + '%';

  // «Akkurat nå»
  let tag = 'KLAR', text = getHint(), bar = pf;
  if (mode === 'title') { text = 'Trykk «Start Isfiske» for å begynne.'; bar = 0; }
  else if (mode === 'frozen' || mode === 'over') { tag = 'SLUTT'; text = game.endReason === 'frozen' ? 'Du frøs i hjel. Prøv igjen!' : 'Tiden er ute. Bra fisket!'; bar = 1; }
  else if (paused) { tag = 'PAUSE'; text = 'Alt er rolig. Trykk P for å fortsette.'; }
  else if (game.fight) { tag = 'KAMP'; bar = clamp(game.fight.progress, 0, 1); }
  else if (player.drill > .001) { tag = 'BORER'; bar = player.drill; }
  else if (player.state === 'fish') { tag = game.jigE > .05 ? 'PILKER' : 'FISKER'; bar = game.jigE; }
  else if (game.storm > 0) tag = 'STORM';
  dom.nowTag.textContent = tag; dom.nowText.textContent = text; dom.nowBar.style.width = (bar * 100) + '%';

  // Dagens fangst
  if (game.catchVer !== lastCatchVer) {
    lastCatchVer = game.catchVer;
    const items = game.catchLog.slice(-14), box = dom.catchChips;
    box.textContent = '';
    if (!items.length) { const n = document.createElement('span'); n.className = 'note'; n.textContent = 'Ingen fangst ennå – bor et hull og pilk!'; box.appendChild(n); }
    items.forEach(it => {
      const c = document.createElement('span'); c.className = 'fchip' + (it.stolen ? ' stolen' : '');
      c.appendChild(fishSvg(FISH[it.key]));
      c.appendChild(document.createTextNode('+' + it.pts));
      c.title = FISH[it.key].name + (it.stolen ? ' (stjålet av reven)' : '');
      box.appendChild(c);
    });
    const n = game.catchLog.filter(i => !i.stolen).length;
    dom.catchCount.textContent = n + ' FISK';
  }

  // Scenelabels og topplinje
  dom.sceneL.textContent = 'INNSJØEN · VINTER' + (playing ? ' · NIVÅ ' + game.level : '');
  dom.sceneR.textContent = Math.round(outsideTemp()) + ' °C · ' + (game.storm > 0 ? 'SNØSTORM' : game.wind);
  dom.chipWallet.textContent = walletText();
  dom.btnPause.textContent = paused ? 'FORTSETT' : 'PAUSE';
  dom.btnMute.textContent = muted ? 'LYD AV' : 'LYD PÅ';
}
dom.chipCoffee.addEventListener('click', e => { e.currentTarget.blur(); tryDrink(); });
dom.btnPause.addEventListener('click', e => { e.currentTarget.blur(); togglePause(); });
dom.btnMute.addEventListener('click', e => { e.currentTarget.blur(); toggleMute(); });

let last = 0;
function frame(ts) {
  const wantTouch = isTouch && mode === 'play';
  if (wantTouch !== touchShown) { touchShown = wantTouch; $('touch').classList.toggle('show', wantTouch); }
  const dt = Math.min(0.05, (ts - last) / 1000 || 0);
  last = ts;
  update(dt);
  render();
  updateDom(dt);
  requestAnimationFrame(frame);
}

loadBest();
loadBoard();
loadShop();
$('nameIn').addEventListener('input', e => {
  lastName = (e.target.value.trim() || 'Spiller').slice(0, 12);
  if (currentEntry) { currentEntry.name = lastName; saveBoard(); refreshBoard(); }
  else saveBoard();
});
resetGame();
initAmbient();
showTitle();
resize();
requestAnimationFrame(frame);

})();

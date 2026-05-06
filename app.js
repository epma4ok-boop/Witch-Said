// Telegram WebApp с fallback
const tg = (() => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  console.warn('⚠️ Режим браузера');
  return {
    ready: () => {}, expand: () => {}, setHeaderColor: () => {}, setBackgroundColor: () => {},
    HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {} },
    openTelegramLink: (url) => window.open(url, '_blank')
  };
})();

// DOM элементы
const shareBtn = document.getElementById('shareBtn');
const againBtn = document.getElementById('againBtn');
const witchLineEl = document.getElementById('witchLine');
const orbTextEl = document.getElementById('orbText');
const orbStage = document.getElementById('orbStage');
const orb = document.getElementById('orb');
const stageEl = document.getElementById('stage');
const overlayEl = document.getElementById('overlay');
const chips = [...document.querySelectorAll('.chip')];
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');
const splash = document.getElementById('splash');
const app = document.getElementById('app');

// Конфиг
const MAX_HISTORY = 7;
let allPredictions = [];
let activeCategory = 'all';
let casting = false;
let currentPredictionText = '';
let currentFullPrediction = '';
let lang = 'ru';
let history = [];
let audioContext = null;

// ===== ВЕДЬМИН СМЕХ (синтезированный через Web Audio) =====
function initAudio() {
  if (!audioContext && typeof AudioContext !== 'undefined') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playWitchLaugh() {
  try {
    initAudio();
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    // Первый смешок "хе-хе"
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.value = 440;
    gain1.gain.value = 0.08;
    osc1.start();
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc1.stop(now + 0.4);
    
    // Второй смешок "хи-хи" выше
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 660;
      gain2.gain.value = 0.07;
      osc2.start();
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
      osc2.stop(now + 0.85);
    }, 200);
    
    // Третий — низкий "ха-ха"
    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.frequency.value = 330;
      gain3.gain.value = 0.09;
      osc3.start();
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc3.stop(now + 1.2);
    }, 450);
    
    // Добавляем "шипение" для атмосферности
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.3, audioContext.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() - 0.5) * 0.03;
    const noise = audioContext.createBufferSource();
    const noiseGain = audioContext.createGain();
    noise.buffer = noiseBuffer;
    noise.connect(noiseGain);
    noiseGain.connect(audioContext.destination);
    noiseGain.gain.value = 0.04;
    noise.start();
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    
  } catch(e) { console.log('🔇 Audio error'); }
}

// ===== ЗАСТАВКА С ПРОГРЕССОМ =====
async function showSplash() {
  const progressBar = document.getElementById('progressBar');
  const steps = [20, 40, 60, 80, 100];
  for (let p of steps) {
    await new Promise(r => setTimeout(r, 300));
    if (progressBar) progressBar.style.width = p + '%';
  }
  await new Promise(r => setTimeout(r, 800));
  if (splash) {
    splash.classList.add('hide');
    setTimeout(() => {
      splash.style.display = 'none';
      if (app) app.classList.add('visible');
    }, 800);
  }
}

// ===== ИНИЦИАЛИЗАЦИЯ TELEGRAM =====
tg.ready();
tg.expand();
tg.setHeaderColor?.('#120f1d');
tg.setBackgroundColor?.('#120f1d');

// ===== ТЕКСТЫ =====
const witchLines = {
  idle: ['Шар ждёт твоего вопроса', 'Коснись — получишь ответ', 'Ведьма рядом...'],
  cast: ['Смотрю в шар...', 'Магия закручивается...', 'Вижу ответ...'],
  after: ['Ведьма сказала!', 'Такова судьба', 'Запомни этот ответ']
};

const categoryHints = {
  all: 'Полный расклад: любовь, работа, деньги',
  love: 'Любовь, чувства и романтика',
  work: 'Карьера, успех и амбиции',
  money: 'Финансы, удача и доходы'
};

const categoryColors = {
  all: 'radial-gradient(circle at 30% 30%, #fff, #f3e0ff, #c88bff, #5a2a8a, #1a0a2a)',
  love: 'radial-gradient(circle at 30% 30%, #fff, #ffe0f0, #ff88bb, #aa3366, #4a1530)',
  work: 'radial-gradient(circle at 30% 30%, #fff, #e0f8ff, #55ccff, #2277aa, #0a2a44)',
  money: 'radial-gradient(circle at 30% 30%, #fff, #fff8e0, #ffcc44, #cc8800, #442a00)'
};

function applyCategoryColor(cat) { if (orb) orb.style.background = categoryColors[cat] || categoryColors.all; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function escapeHtml(v) { return v.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }

function smartSplit(text, maxLen = 32) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (test.length <= maxLen) current = test;
    else { if (current) lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

function setOrbText(text, mode = 'reveal') {
  const lines = smartSplit(text, text.length > 70 ? 28 : 34);
  orbTextEl.style.fontSize = lines.length > 3 ? 'clamp(14px,4vw,26px)' : 'clamp(16px,5vw,34px)';
  orbTextEl.innerHTML = lines.map(l => `<span class="${mode === 'reveal' ? 'orb-line' : ''}">${escapeHtml(l)}</span>`).join('');
}

const uiCopy = {
  ru: { heroKicker: 'Шар судьбы', heroText: 'Коснись — узнаешь ответ', footerNote: 'Магия внутри', chips: { all: '✨ Всё', love: '💗 Любовь', work: '💼 Работа', money: '💰 Деньги' }, buttons: { share: '📤 Поделиться', again: '🎭 Другой ответ' }, orbIdle: 'Нажми на шар' },
  en: { heroKicker: 'Destiny Orb', heroText: 'Touch — get answer', footerNote: 'Magic inside', chips: { all: '✨ All', love: '💗 Love', work: '💼 Work', money: '💰 Money' }, buttons: { share: '📤 Share', again: '🎭 Another' }, orbIdle: 'Tap the orb' }
};

function applyLangTexts() {
  const d = uiCopy[lang];
  document.querySelector('[data-i18n="heroKicker"]') && (document.querySelector('[data-i18n="heroKicker"]').textContent = d.heroKicker);
  document.querySelector('[data-i18n="heroText"]') && (document.querySelector('[data-i18n="heroText"]').textContent = d.heroText);
  document.querySelector('[data-i18n="footerNote"]') && (document.querySelector('[data-i18n="footerNote"]').textContent = d.footerNote);
  chips.forEach(c => { if (d.chips[c.dataset.key]) c.innerHTML = d.chips[c.dataset.key]; });
  shareBtn.textContent = d.buttons.share;
  if (againBtn) againBtn.textContent = d.buttons.again;
  if (!casting && !orbTextEl.innerHTML) setOrbText(d.orbIdle, 'static');
}

// ===== ИСТОРИЯ =====
function loadHistory() {
  try { const saved = localStorage.getItem('witch_history'); if (saved) history = JSON.parse(saved).slice(0, MAX_HISTORY); } catch(e) {}
  renderHistory();
}
function saveHistory() { try { localStorage.setItem('witch_history', JSON.stringify(history.slice(0, MAX_HISTORY))); } catch(e) {} }
function addToHistory(text, cat) {
  history.unshift({ text: text.slice(0, 60), fullText: text, category: cat, timestamp: Date.now() });
  if (history.length > MAX_HISTORY) history.pop();
  saveHistory();
  renderHistory();
}
function renderHistory() {
  if (!history.length) { if (historySection) historySection.style.display = 'none'; return; }
  if (historySection) historySection.style.display = 'block';
  if (historyList) {
    historyList.innerHTML = history.map(item => `<div class="history-item" data-full="${escapeHtml(item.fullText)}" data-cat="${item.category}"><span>📜 ${escapeHtml(item.text)}</span><span>${item.category === 'love' ? '💗' : item.category === 'work' ? '💼' : item.category === 'money' ? '💰' : '✨'}</span></div>`).join('');
    document.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => { if (!casting) showPredictionFromHistory(el.dataset.full, el.dataset.cat); });
    });
  }
}
function showPredictionFromHistory(text, cat) {
  currentFullPrediction = text;
  currentPredictionText = `Ведьма сказала: ${text}`;
  setOrbText(text, 'reveal');
  witchLineEl.textContent = pick(witchLines.after);
  shareBtn.dataset.text = currentPredictionText;
  if (againBtn) againBtn.style.display = 'block';
  playWitchLaugh();
}

// ===== ПРЕДСКАЗАНИЯ =====
async function loadPredictions() {
  const urls = ['./predictions.json', './data/predictions.json'];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) { allPredictions = await res.json(); console.log(`✅ ${allPredictions.length} предсказаний`); return; }
    } catch(e) {}
  }
  allPredictions = [{ category: 'all', text: 'Шар задумался. Попробуй ещё раз.', text_en: 'Try again.' }];
}
function getPool() {
  if (activeCategory === 'all') return allPredictions;
  const f = allPredictions.filter(i => i.category === activeCategory);
  return f.length ? f : allPredictions;
}
function nextPrediction() {
  const pool = getPool();
  if (!pool.length) return 'Шар молчит...';
  const item = pick(pool);
  return (lang === 'en' && item.text_en) ? item.text_en : item.text;
}

// ===== ОСНОВНОЙ РИТУАЛ =====
async function askWitch() {
  if (casting) return;
  casting = true;
  shareBtn.disabled = true;
  if (againBtn) againBtn.style.display = 'none';
  
  stageEl.classList.remove('casting');
  void stageEl.offsetWidth;
  orbTextEl.innerHTML = '';
  
  stageEl.classList.add('casting');
  overlayEl.classList.add('show');
  witchLineEl.textContent = pick(witchLines.cast);
  
  tg.HapticFeedback?.impactOccurred('medium');
  
  await new Promise(r => setTimeout(r, 1200));
  
  const value = nextPrediction();
  currentFullPrediction = value;
  currentPredictionText = `Ведьма сказала: ${value}`;
  setOrbText(value, 'reveal');
  witchLineEl.textContent = pick(witchLines.after);
  shareBtn.dataset.text = currentPredictionText;
  
  addToHistory(value, activeCategory);
  applyCategoryColor(activeCategory);
  playWitchLaugh(); // ← СМЕХ ВМЕСТО ДЗИНЬКА
  
  stageEl.classList.remove('casting');
  overlayEl.classList.remove('show');
  
  tg.HapticFeedback?.notificationOccurred('success');
  
  shareBtn.disabled = false;
  if (againBtn) againBtn.style.display = 'block';
  casting = false;
}

function sharePrediction() {
  const text = shareBtn.dataset.text || currentPredictionText;
  const shareText = `${text}\n\n🧙‍♀️ Ведьма сказала — магический шар судьбы`;
  const url = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/your_bot')}&text=${encodeURIComponent(shareText)}`;
  tg.openTelegramLink ? tg.openTelegramLink(url) : window.open(url, '_blank');
}

// ===== ОБРАБОТЧИКИ =====
chips.forEach(chip => {
  chip.addEventListener('click', () => {
    if (casting) return;
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCategory = chip.dataset.key;
    witchLineEl.textContent = pick(witchLines.idle);
    applyCategoryColor(activeCategory);
    if (!orbTextEl.innerHTML) setOrbText(uiCopy[lang].orbIdle, 'static');
  });
});

shareBtn.addEventListener('click', sharePrediction);
orbStage.addEventListener('click', () => { if (!casting) askWitch(); });
if (againBtn) againBtn.addEventListener('click', () => { if (!casting) askWitch(); });
if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => { history = []; saveHistory(); renderHistory(); });

document.querySelectorAll('.lang').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.dataset.lang;
    if (!val || val === lang || casting) return;
    lang = val;
    document.querySelectorAll('.lang').forEach(b => b.classList.toggle('active', b === btn));
    applyLangTexts();
    if (!orbTextEl.innerHTML) setOrbText(uiCopy[lang].orbIdle, 'static');
  });
});

// ===== ЗАПУСК =====
(async () => {
  await showSplash();
  await loadPredictions();
  loadHistory();
  applyLangTexts();
  applyCategoryColor(activeCategory);
  setOrbText(uiCopy[lang].orbIdle, 'static');
  witchLineEl.textContent = pick(witchLines.idle);
  console.log('🧙‍♀️ Ведьма проснулась с новым смехом!');
})();

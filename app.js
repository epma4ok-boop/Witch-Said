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

tg.ready();
tg.expand();
tg.setHeaderColor?.('#120f1d');
tg.setBackgroundColor?.('#120f1d');

// DOM элементы
const shareBtn = document.getElementById('shareBtn');
const againBtn = document.getElementById('againBtn');
const hintEl = document.getElementById('hint');
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

// Конфиг
const MAX_HISTORY = 7;
let allPredictions = [];
let activeCategory = 'all';
let casting = false;
let currentPredictionText = '';
let currentFullPrediction = '';
let lang = 'ru';
let history = [];

// Загрузка истории
function loadHistory() {
  try {
    const saved = localStorage.getItem('witch_history');
    if (saved) {
      history = JSON.parse(saved);
      if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    }
  } catch(e) { history = []; }
  renderHistory();
}

function saveHistory() {
  try {
    localStorage.setItem('witch_history', JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch(e) {}
}

function addToHistory(text, category) {
  const shortText = text.length > 60 ? text.slice(0, 57) + '...' : text;
  history.unshift({
    text: shortText,
    fullText: text,
    category: category,
    timestamp: Date.now()
  });
  if (history.length > MAX_HISTORY) history.pop();
  saveHistory();
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historySection.style.display = 'none';
    return;
  }
  historySection.style.display = 'block';
  historyList.innerHTML = history.map(item => `
    <div class="history-item" data-fulltext="${escapeHtml(item.fullText)}" data-category="${item.category}">
      <span class="history-text">📿 ${escapeHtml(item.text)}</span>
      <span class="history-category">${getCategoryEmoji(item.category)}</span>
    </div>
  `).join('');
  
  document.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', () => {
      const fullText = el.dataset.fulltext;
      const category = el.dataset.category;
      if (!casting && fullText) {
        showPredictionFromHistory(fullText, category);
      }
    });
  });
}

function getCategoryEmoji(cat) {
  const map = { love: '💗', work: '💼', money: '💰', all: '✨' };
  return map[cat] || '✨';
}

function showPredictionFromHistory(text, category) {
  currentFullPrediction = text;
  currentPredictionText = `Ведьма сказала: ${text}`;
  setOrbText(text, 'reveal');
  witchLineEl.textContent = pick(witchLines.after);
  shareBtn.dataset.text = currentPredictionText;
  orbStage.classList.add('revealed');
  if (againBtn) againBtn.style.display = 'block';
  playMagicSound();
}

// Звуки (Web Audio API)
let audioContext = null;
function initAudio() {
  if (!audioContext && typeof AudioContext !== 'undefined') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}
function playMagicSound() {
  try {
    initAudio();
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.8);
    osc.stop(now + 0.8);
  } catch(e) { console.log('🔇 Sound not supported'); }
}

// Тексты ведьмы
const witchLines = {
  idle: ['Шар ждёт твоего вопроса', 'Коснись — получишь ответ', 'Магия готова', 'Спроси о чём угодно'],
  cast: ['Смотрю в шар...', 'Магия закручивается', 'Ответ уже близко', 'Колдую...'],
  after: ['Вот что сказал шар', 'Запомни этот ответ', 'Магия не врёт', 'Такова судьба']
};

const categoryHints = {
  all: 'Полный расклад: любовь, работа, деньги',
  love: 'Любовь, чувства и романтика',
  work: 'Карьера, успех и амбиции',
  money: 'Финансы, удача и доходы'
};

const categoryColors = {
  all: { bg: 'radial-gradient(circle at 30% 30%, #fff 0%, #f3e0ff 15%, #c88bff 45%, #5a2a8a 75%, #1a0a2a 100%)', glow: '#b26bff' },
  love: { bg: 'radial-gradient(circle at 30% 30%, #fff 0%, #ffe0f0 15%, #ff88bb 45%, #aa3366 75%, #4a1530 100%)', glow: '#ff6b9d' },
  work: { bg: 'radial-gradient(circle at 30% 30%, #fff 0%, #e0f8ff 15%, #55ccff 45%, #2277aa 75%, #0a2a44 100%)', glow: '#4dc9f6' },
  money: { bg: 'radial-gradient(circle at 30% 30%, #fff 0%, #fff8e0 15%, #ffcc44 45%, #cc8800 75%, #442a00 100%)', glow: '#ffd166' }
};

function applyCategoryColor(category) {
  const color = categoryColors[category] || categoryColors.all;
  if (orb) {
    orb.style.background = color.bg;
    orb.style.boxShadow = `0 0 0 3px rgba(255,255,255,0.15), 0 30px 50px rgba(0,0,0,0.6), 0 0 20px ${color.glow}40`;
  }
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function escapeHtml(v) { return v.replace(/[&<>]/g, function(m) { return {'&':'&amp;','<':'&lt;','>':'&gt;'}[m]; }); }

// Идеальный перенос текста без разрыва слов
function smartSplit(text, maxLen = 32) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  
  for (const word of words) {
    const testLine = current ? current + ' ' + word : word;
    if (testLine.length <= maxLen) {
      current = testLine;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  
  if (lines.length === 1 && lines[0].length > maxLen + 10) {
    return smartSplit(text, maxLen - 4);
  }
  return lines;
}

function setOrbText(text, mode = 'reveal') {
  const maxLen = text.length > 70 ? 28 : text.length > 45 ? 32 : 36;
  const lines = smartSplit(text, maxLen);
  const fontSize = lines.length > 3 ? 'clamp(14px, 4vw, 26px)' : lines.length === 3 ? 'clamp(16px, 4.5vw, 30px)' : 'clamp(18px, 5vw, 36px)';
  orbTextEl.style.fontSize = fontSize;
  orbTextEl.innerHTML = lines.map(line => `<span class="${mode === 'reveal' ? 'orb-line' : ''}">${escapeHtml(line)}</span>`).join('');
}

function clearOrbText() { orbTextEl.innerHTML = ''; }

const uiCopy = {
  ru: { heroKicker: 'Шар судьбы', heroText: 'Коснись — узнаешь ответ', sectionHint: 'Выбери сферу', footerNote: 'Магия внутри. Нажми — и шар заговорит', chips: { all: '✨ Всё', love: '💗 Любовь', work: '💼 Работа', money: '💰 Деньги' }, buttons: { share: '📤 Поделиться', again: '🎭 Другой ответ' }, orbIdle: 'Нажми на шар' },
  en: { heroKicker: 'Destiny Orb', heroText: 'Touch — get answer', sectionHint: 'Choose sphere', footerNote: 'Magic inside. Tap the orb', chips: { all: '✨ All', love: '💗 Love', work: '💼 Work', money: '💰 Money' }, buttons: { share: '📤 Share', again: '🎭 Another answer' }, orbIdle: 'Tap the orb' }
};

function applyLangTexts() {
  const dict = uiCopy[lang];
  document.querySelector('[data-i18n="heroKicker"]') && (document.querySelector('[data-i18n="heroKicker"]').textContent = dict.heroKicker);
  document.querySelector('[data-i18n="heroText"]') && (document.querySelector('[data-i18n="heroText"]').textContent = dict.heroText);
  document.querySelector('[data-i18n="footerNote"]') && (document.querySelector('[data-i18n="footerNote"]').textContent = dict.footerNote);
  chips.forEach(chip => { const key = chip.dataset.key; if (key && dict.chips[key]) chip.innerHTML = dict.chips[key]; });
  hintEl.textContent = categoryHints[activeCategory];
  shareBtn.textContent = dict.buttons.share;
  if (againBtn) againBtn.textContent = dict.buttons.again;
  if (!casting && !orbTextEl.innerHTML) setOrbText(dict.orbIdle, 'static');
}

async function loadPredictions() {
  const urls = ['./predictions.json', './data/predictions.json'];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) { allPredictions = await res.json(); console.log(`✅ Загружено ${allPredictions.length} предсказаний`); return; }
    } catch(e) {}
  }
  allPredictions = [{ category: 'all', text: 'Шар задумался. Попробуй ещё раз.', text_en: 'The orb is thinking. Try again.' }];
  witchLineEl.textContent = '⚠️ Резервный режим';
}

function getPool() {
  if (activeCategory === 'all') return allPredictions;
  const filtered = allPredictions.filter(i => i.category === activeCategory);
  return filtered.length ? filtered : allPredictions;
}

function nextPrediction() {
  const pool = getPool();
  if (!pool.length) return 'Шар молчит...';
  const item = pick(pool);
  return (lang === 'en' && item.text_en) ? item.text_en : item.text;
}

// Партиклы
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('div');
    p.style.position = 'absolute';
    p.style.width = '4px';
    p.style.height = '4px';
    p.style.background = 'radial-gradient(circle, #fff, #b26bff)';
    p.style.borderRadius = '50%';
    p.style.left = '50%';
    p.style.top = '50%';
    const angle = Math.random() * Math.PI * 2;
    const dist = 35 + Math.random() * 55;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    p.style.setProperty('--tx', tx + 'px');
    p.style.setProperty('--ty', ty + 'px');
    p.style.animation = `particleBurst 0.5s ease-out forwards`;
    p.style.opacity = '1';
    container.appendChild(p);
  }
  setTimeout(() => { if (container) container.innerHTML = ''; }, 600);
}

const styleSheet = document.createElement("style");
styleSheet.textContent = `@keyframes particleBurst { 0% { opacity: 1; transform: translate(0, 0) scale(1); } 100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0); } }`;
document.head.appendChild(styleSheet);

async function askWitch() {
  if (casting) return;
  casting = true;
  shareBtn.disabled = true;
  if (againBtn) againBtn.style.display = 'none';
  
  stageEl.classList.remove('casting');
  orbStage.classList.remove('revealed');
  void stageEl.offsetWidth;
  clearOrbText();
  
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
  playMagicSound();
  createParticles();
  
  stageEl.classList.remove('casting');
  overlayEl.classList.remove('show');
  orbStage.classList.add('revealed');
  
  tg.HapticFeedback?.notificationOccurred('success');
  
  shareBtn.disabled = false;
  if (againBtn) againBtn.style.display = 'block';
  casting = false;
}

function sharePrediction() {
  const text = shareBtn.dataset.text || currentPredictionText;
  const shareText = `${text}\n\n✨ Предсказано магическим шаром ✨`;
  const url = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/your_bot')}&text=${encodeURIComponent(shareText)}`;
  tg.openTelegramLink ? tg.openTelegramLink(url) : window.open(url, '_blank');
}

function resetToIdle() {
  if (!casting && !orbTextEl.innerHTML) {
    setOrbText(uiCopy[lang].orbIdle, 'static');
    witchLineEl.textContent = pick(witchLines.idle);
    if (againBtn) againBtn.style.display = 'none';
  }
}

// Обработчики
chips.forEach(chip => {
  chip.addEventListener('click', () => {
    if (casting) return;
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCategory = chip.dataset.key;
    hintEl.textContent = categoryHints[activeCategory];
    witchLineEl.textContent = pick(witchLines.idle);
    applyCategoryColor(activeCategory);
    resetToIdle();
  });
});

shareBtn.addEventListener('click', sharePrediction);
orbStage.addEventListener('click', () => { if (!casting) { askWitch(); } });
if (againBtn) againBtn.addEventListener('click', () => { if (!casting) askWitch(); });
if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => { history = []; saveHistory(); renderHistory(); });

document.querySelectorAll('.lang').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.dataset.lang;
    if (!val || val === lang || casting) return;
    lang = val;
    document.querySelectorAll('.lang').forEach(b => b.classList.toggle('active', b === btn));
    applyLangTexts();
    resetToIdle();
  });
});

// Инициализация
loadHistory();
loadPredictions().then(() => {
  hintEl.textContent = categoryHints[activeCategory];
  witchLineEl.textContent = pick(witchLines.idle);
  applyLangTexts();
  applyCategoryColor(activeCategory);
});

console.log('🧙‍♀️ Ведьма проснулась. Шар готов.');

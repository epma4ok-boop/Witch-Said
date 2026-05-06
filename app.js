// Telegram WebApp с fallback для браузера
const tg = (() => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  console.warn('⚠️ Telegram WebApp not found, using fallback mode');
  return {
    ready: () => console.log('📱 Fallback: ready'),
    expand: () => console.log('📱 Fallback: expand'),
    setHeaderColor: () => {},
    setBackgroundColor: () => {},
    HapticFeedback: {
      impactOccurred: () => {},
      notificationOccurred: () => {}
    },
    openTelegramLink: (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
})();

// Инициализация Telegram App
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
const stageEl = document.getElementById('stage');
const overlayEl = document.getElementById('overlay');
const chips = [...document.querySelectorAll('.chip')];

// Тексты ведьмы
const witchLines = {
  idle: [
    'Шар ждёт твоего вопроса. Коснись и узнаешь.',
    'Я здесь. Спрашивай, но без пафоса.',
    'Ритуал прост: нажми на шар — и магия сделает своё.',
    'Магия любит смелых. Ну или просто любопытных.'
  ],
  cast: [
    'Смотрю в шар... Уже вижу ответ.',
    'Магия закручивается. Сейчас узнаешь.',
    'Шар начинает светиться. Ещё секунда.',
    'Колдую... Ответ уже на подходе.'
  ],
  after: [
    'Вот что сказал шар. Не стреляй в вестника.',
    'Магия не врёт. Иногда просто шутит.',
    'Запомни этот ответ. Или забудь — как хочешь.',
    'Ведьма подтверждает: это твоё предсказание.'
  ]
};

const categoryHints = {
  all: 'Полный расклад: любовь, хаос, деньги и лёгкое унижение.',
  love: 'Любовь, привязанность и сообщения, о которых жалеют утром.',
  work: 'Работа, дедлайны и усталость с характером.',
  money: 'Деньги, траты и финансовые фокусы без аплодисментов.'
};

let allPredictions = [];
let activeCategory = 'all';
let casting = false;
let currentPredictionText = 'Нажми на шар и спроси о чём угодно';
let lang = 'ru';

// Тексты интерфейса
const uiCopy = {
  ru: {
    heroKicker: 'Ответ шара',
    heroText: 'Нажми на шар — и смотри, что он скажет.',
    sectionHint: 'Что хочешь узнать?',
    footerNote: 'Весь ритуал — одно касание шара',
    chips: { all: 'Все', love: 'Любовь', work: 'Работа', money: 'Деньги' },
    buttons: { share: 'Поделиться ответом', again: '✨ Другой ответ ✨' },
    orbIdle: 'Спроси ведьму'
  },
  en: {
    heroKicker: "Orb's answer",
    heroText: 'Tap the orb and see what it says.',
    sectionHint: 'What do you want to know?',
    footerNote: 'Now the whole ritual is just one tap on the orb',
    chips: { all: 'All', love: 'Love', work: 'Work', money: 'Money' },
    buttons: { share: 'Share the answer', again: '✨ Another answer ✨' },
    orbIdle: 'Ask the witch'
  }
};

// Вспомогательные функции
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function splitPrediction(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const sentenceChunks = normalized.split(/(?<=[.!?])\s+/).map(p => p.trim()).filter(Boolean);
  
  if (sentenceChunks.length >= 2 && sentenceChunks.every(s => s.length <= 52)) {
    return sentenceChunks.slice(0, 4);
  }
  
  const words = normalized.split(' ');
  const lines = [];
  let current = '';
  const target = normalized.length > 90 ? 18 : normalized.length > 60 ? 20 : 22;
  
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > target && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function applyOrbSizing(text, lines) {
  const length = text.length;
  let fontSize = 'clamp(23px, 6vw, 42px)';
  let maxWidth = '9ch';
  let lineHeight = '0.96';
  let letterSpacing = '-0.03em';
  
  if (lines.length >= 4 || length > 80) {
    fontSize = 'clamp(14px, 3.2vw, 22px)';
    maxWidth = '15ch';
    lineHeight = '1.05';
    letterSpacing = '-0.015em';
  } else if (lines.length === 3 || length > 60) {
    fontSize = 'clamp(16px, 4vw, 28px)';
    maxWidth = '12ch';
    lineHeight = '1.06';
    letterSpacing = '-0.02em';
  } else if (lines.length === 2) {
    fontSize = 'clamp(19px, 4.8vw, 32px)';
    maxWidth = '11ch';
    lineHeight = '1.08';
    letterSpacing = '-0.02em';
  } else if (length < 28) {
    fontSize = 'clamp(26px, 6.5vw, 44px)';
    maxWidth = '8ch';
  }
  
  document.documentElement.style.setProperty('--orb-font-size', fontSize);
  document.documentElement.style.setProperty('--orb-max-width', maxWidth);
  document.documentElement.style.setProperty('--orb-line-height', lineHeight);
  document.documentElement.style.setProperty('--orb-letter-spacing', letterSpacing);
}

function setOrbText(text, mode = 'reveal') {
  const lines = splitPrediction(text);
  applyOrbSizing(text, lines);
  orbTextEl.innerHTML = lines.map(line => 
    `<span class="${mode === 'reveal' ? 'orb-line' : ''}">${escapeHtml(line)}</span>`
  ).join('');
}

function clearOrbText() {
  orbTextEl.innerHTML = '';
}

function applyLangTexts() {
  const dict = uiCopy[lang];
  document.querySelector('[data-i18n="heroKicker"]') && 
    (document.querySelector('[data-i18n="heroKicker"]').textContent = dict.heroKicker);
  document.querySelector('[data-i18n="heroText"]') && 
    (document.querySelector('[data-i18n="heroText"]').textContent = dict.heroText);
  document.querySelector('[data-i18n="footerNote"]') && 
    (document.querySelector('[data-i18n="footerNote"]').textContent = dict.footerNote);
  
  const chipLabels = { all: 'chipAll', love: 'chipLove', work: 'chipWork', money: 'chipMoney' };
  chips.forEach(chip => {
    const key = chip.dataset.key;
    if (key && dict.chips[key]) chip.textContent = dict.chips[key];
  });
  
  hintEl.textContent = categoryHints[activeCategory];
  shareBtn.textContent = dict.buttons.share;
  if (againBtn) againBtn.textContent = dict.buttons.again;
  if (!casting) setOrbText(dict.orbIdle, 'static');
}

// Загрузка предсказаний
async function loadPredictions() {
  const urls = ['./predictions.json', './data/predictions.json'];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        allPredictions = await res.json();
        console.log(`✅ Загружено ${allPredictions.length} предсказаний`);
        return true;
      }
    } catch (e) {
      console.warn(`⚠️ Не удалось загрузить ${url}`);
    }
  }
  
  // Fallback предсказания
  allPredictions = [
    { category: 'all', text: 'Шар задумался. Попробуй ещё раз.', text_en: 'The orb is thinking. Try again.' },
    { category: 'all', text: 'Магия временно недоступна. Приходи позже.', text_en: 'Magic is temporarily unavailable. Come back later.' }
  ];
  witchLineEl.textContent = '⚠️ Предсказания загружены из резервной копии';
  return false;
}

function getPool() {
  if (activeCategory === 'all') return allPredictions;
  const filtered = allPredictions.filter(item => item.category === activeCategory);
  return filtered.length ? filtered : allPredictions;
}

function nextPrediction() {
  const pool = getPool();
  if (!pool.length) return 'Шар молчит. Странно.';
  const item = pick(pool);
  const text = (lang === 'en' && item.text_en) ? item.text_en : item.text;
  return text || 'Шар задумался. Нажми ещё раз.';
}

// Основной ритуал
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
  hintEl.textContent = categoryHints[activeCategory];
  witchLineEl.textContent = pick(witchLines.cast);
  
  tg.HapticFeedback?.impactOccurred('medium');
  
  await new Promise(resolve => setTimeout(resolve, 1380));
  
  const value = nextPrediction();
  currentPredictionText = `Ведьма сказала: ${value}`;
  setOrbText(value, 'reveal');
  witchLineEl.textContent = pick(witchLines.after);
  shareBtn.dataset.text = currentPredictionText;
  
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
  
  if (tg.openTelegramLink) {
    tg.openTelegramLink(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function resetToIdle() {
  if (!casting) {
    setOrbText(uiCopy[lang].orbIdle, 'static');
    witchLineEl.textContent = pick(witchLines.idle);
    hintEl.textContent = categoryHints[activeCategory];
    if (againBtn) againBtn.style.display = 'none';
  }
}

// Обработчики событий
chips.forEach(chip => {
  chip.addEventListener('click', () => {
    if (casting) return;
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCategory = chip.dataset.key;
    hintEl.textContent = categoryHints[activeCategory];
    witchLineEl.textContent = pick(witchLines.idle);
    resetToIdle();
  });
});

shareBtn.addEventListener('click', sharePrediction);
orbStage.addEventListener('click', askWitch);

if (againBtn) {
  againBtn.addEventListener('click', () => {
    if (!casting) askWitch();
  });
}

orbStage.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && !casting) {
    event.preventDefault();
    askWitch();
  }
});

// Переключение языка
document.querySelectorAll('.lang').forEach(btn => {
  btn.addEventListener('click', () => {
    const value = btn.dataset.lang;
    if (!value || value === lang || casting) return;
    lang = value;
    document.querySelectorAll('.lang').forEach(b => b.classList.toggle('active', b === btn));
    applyLangTexts();
    resetToIdle();
  });
});

// Инициализация
loadPredictions().then(() => {
  hintEl.textContent = categoryHints[activeCategory];
  witchLineEl.textContent = pick(witchLines.idle);
  applyLangTexts();
});

console.log('🧙‍♀️ Ведьма проснулась. Шар готов отвечать.');
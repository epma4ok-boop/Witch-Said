// ============================================
// ВЕДЬМА СКАЗАЛА — PREMIUM VERSION 2.0
// Telegram Mini App с монетизацией и виралкой
// ============================================

// ---------- TELEGRAM ----------
const tg = (() => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  console.warn('⚠️ Браузерный режим');
  return {
    ready: () => {}, expand: () => {}, setHeaderColor: () => {},
    HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {} },
    openTelegramLink: (url) => window.open(url, '_blank'),
    showPopup: (params) => alert(params.message)
  };
})();

tg.ready();
tg.expand();
tg.setHeaderColor?.('#120f1d');
tg.setBackgroundColor?.('#120f1d');

// ---------- DOM ЭЛЕМЕНТЫ ----------
const shareBtn = document.getElementById('shareBtn');
const againBtn = document.getElementById('againBtn');
const witchLineEl = document.getElementById('witchLine');
const orbTextEl = document.getElementById('orbText');
const orbStage = document.getElementById('orbStage');
const orb = document.getElementById('orb');
const stageEl = document.getElementById('stage');
const chips = [...document.querySelectorAll('.chip')];
const questionsLeftSpan = document.getElementById('questionsLeft');
const buyQuestionsBtn = document.getElementById('buyQuestionsBtn');
const referBtn = document.getElementById('referBtn');
const shareStoryBtn = document.getElementById('shareStoryBtn');
const skinSelector = document.getElementById('skinSelector');
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');

// ---------- КОНФИГ ----------
let allPredictions = [];
let activeCategory = 'all';
let casting = false;
let currentPredictionText = '';
let currentFullPrediction = '';
let lang = 'ru';
let history = [];

// СИСТЕМА ЛИМИТОВ
let questionsUsedToday = 0;
let maxFreeQuestions = 3;
let referrerId = null;
let myReferralCode = null;

// СКИНЫ
const skins = {
  default: {
    name: 'Магический',
    bg: 'radial-gradient(circle at 30% 30%, #fff, #f3e0ff, #c88bff, #5a2a8a, #1a0a2a)',
    glow: '#b26bff'
  },
  gold: {
    name: 'Золотой',
    bg: 'radial-gradient(circle at 30% 30%, #fff8e0, #ffebaa, #ffd700, #b8860b, #5a3a00)',
    glow: '#ffd700'
  },
  moon: {
    name: 'Лунный',
    bg: 'radial-gradient(circle at 30% 30%, #f0f0ff, #c8d8ff, #8aadd9, #4a6a9a, #1a2a4a)',
    glow: '#c8d8ff'
  }
};
let currentSkin = 'default';

// ---------- ЗАГРУЗКА/СОХРАНЕНИЕ ----------
function loadData() {
  try {
    const saved = localStorage.getItem('witch_data');
    if (saved) {
      const data = JSON.parse(saved);
      questionsUsedToday = data.questionsUsedToday || 0;
      myReferralCode = data.myReferralCode;
      history = data.history || [];
      currentSkin = data.currentSkin || 'default';
    }
  } catch(e) {}
  
  if (!myReferralCode) {
    myReferralCode = generateReferralCode();
    saveData();
  }
  
  // Из Telegram WebApp получаем referrer
  if (tg.initDataUnsafe?.start_param) {
    referrerId = tg.initDataUnsafe.start_param;
    if (referrerId && referrerId !== myReferralCode) {
      addReferralBonus();
    }
  }
  
  checkAndResetDaily();
  renderHistory();
  applySkin(currentSkin);
}

function saveData() {
  try {
    localStorage.setItem('witch_data', JSON.stringify({
      questionsUsedToday,
      myReferralCode,
      history: history.slice(0, 10),
      currentSkin
    }));
  } catch(e) {}
}

function generateReferralCode() {
  return 'witch_' + Math.random().toString(36).substr(2, 8);
}

function checkAndResetDaily() {
  const lastDate = localStorage.getItem('witch_last_date');
  const today = new Date().toDateString();
  if (lastDate !== today) {
    questionsUsedToday = 0;
    localStorage.setItem('witch_last_date', today);
    saveData();
    updateQuestionsUI();
  }
}

function addReferralBonus() {
  // Бонус +1 вопрос за реферала
  questionsUsedToday = Math.max(0, questionsUsedToday - 1);
  saveData();
  updateQuestionsUI();
  if (witchLineEl) witchLineEl.textContent = '✨ Кто-то пришёл по твоей ссылке! +1 вопрос ✨';
}

function updateQuestionsUI() {
  const left = Math.max(0, maxFreeQuestions - questionsUsedToday);
  if (questionsLeftSpan) {
    questionsLeftSpan.textContent = `${left}/${maxFreeQuestions}`;
  }
  // Если вопросы закончились, блокируем шар
  if (left <= 0 && orbStage) {
    orbStage.style.opacity = '0.6';
  } else if (orbStage) {
    orbStage.style.opacity = '1';
  }
}

function hasFreeQuestion() {
  return questionsUsedToday < maxFreeQuestions;
}

function useFreeQuestion() {
  if (hasFreeQuestion()) {
    questionsUsedToday++;
    saveData();
    updateQuestionsUI();
    return true;
  }
  return false;
}

// ---------- ПОКУПКА ЧЕРЕЗ TELEGRAM STARS ----------
async function buyQuestions() {
  try {
    const invoice = {
      id: 'buy_questions_' + Date.now(),
      title: 'Дополнительные вопросы',
      description: '10 дополнительных вопросов для магического шара',
      photo_url: 'https://your-domain.com/logo.png',
      prices: [{ label: '10 вопросов', amount: 500 }] // 5 звезд = 500 копеек
    };
    
    tg.showPopup({
      title: '💫 Магазин ведьмы',
      message: 'Купить 10 дополнительных вопросов за 5 Telegram Stars?',
      buttons: [
        { id: 'buy', type: 'default', text: '✨ Купить' },
        { id: 'cancel', type: 'cancel', text: 'Отмена' }
      ]
    }, (buttonId) => {
      if (buttonId === 'buy') {
        // Здесь будет вызов Telegram Stars API
        tg.HapticFeedback?.notificationOccurred('success');
        questionsUsedToday = Math.max(0, questionsUsedToday - 10);
        saveData();
        updateQuestionsUI();
        witchLineEl.textContent = '🌟 Магия усилилась! +10 вопросов доступны 🌟';
      }
    });
  } catch(e) {
    console.error('Purchase error:', e);
  }
}

// ---------- РЕФЕРАЛЬНАЯ ССЫЛКА ----------
function getReferralLink() {
  const botUsername = tg.initDataUnsafe?.user?.username || 'witch_said_bot';
  return `https://t.me/${botUsername}?startapp=${myReferralCode}`;
}

function shareReferral() {
  const link = getReferralLink();
  const text = `🧙‍♀️ Ведьма сказала мне правду! А что скажет тебе?\n\nПрисоединяйся, получи +1 бонусный вопрос: ${link}`;
  
  tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
}

// ---------- ГЕНЕРАТОР КАРТОЧЕК ДЛЯ STORIES ----------
async function shareToStory() {
  if (!currentFullPrediction) {
    witchLineEl.textContent = 'Сначала получи предсказание! Нажми на шар.';
    return;
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  
  // Фон
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a0f2e');
  gradient.addColorStop(1, '#05030b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Декоративные звёзды
  ctx.fillStyle = '#d4a5ff';
  for (let i = 0; i < 50; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Шар
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 - 100;
  const radius = 280;
  
  const orbGrad = ctx.createRadialGradient(centerX - 80, centerY - 80, 20, centerX, centerY, radius);
  orbGrad.addColorStop(0, '#ffffff');
  orbGrad.addColorStop(0.3, '#d4a5ff');
  orbGrad.addColorStop(0.7, '#9b59b6');
  orbGrad.addColorStop(1, '#4a2a6a');
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.shadowBlur = 0;
  
  // Текст внутри шара
  ctx.font = 'bold 42px "Cormorant Garamond", serif';
  ctx.fillStyle = '#1a052a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const lines = wrapText(ctx, currentFullPrediction, centerX, 600);
  let y = centerY - (lines.length - 1) * 40;
  lines.forEach(line => {
    ctx.fillText(line, centerX, y);
    y += 80;
  });
  
  // Надпись
  ctx.font = '28px Georgia, serif';
  ctx.fillStyle = '#d4a5ff';
  ctx.fillText('🧙‍♀️ Ведьма сказала...', centerX, canvas.height - 280);
  
  ctx.font = '20px Georgia, serif';
  ctx.fillStyle = '#a590c2';
  ctx.fillText('Попробуй и ты — нажми на шар', centerX, canvas.height - 200);
  
  // Копия в буфер
  canvas.toBlob((blob) => {
    const file = new File([blob], 'prediction.png', { type: 'image/png' });
    tg.shareToStory?.(file.url, {
      text: `Ведьма сказала: ${currentFullPrediction.slice(0, 60)}...`,
      widget_link: { url: 'https://t.me/your_bot' }
    });
  });
}

function wrapText(ctx, text, maxWidth = 800) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];
  
  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);
  return lines;
}

// ---------- СКИНЫ ----------
function applySkin(skinName) {
  const skin = skins[skinName];
  if (!skin) return;
  if (orb) orb.style.background = skin.bg;
  currentSkin = skinName;
  saveData();
}

function showSkinSelector() {
  const buttons = Object.entries(skins).map(([key, val]) => ({
    id: key,
    type: 'default',
    text: `${key === 'default' ? '🔮' : key === 'gold' ? '✨' : '🌙'} ${val.name}`
  }));
  
  tg.showPopup({
    title: '✨ Скины шара ✨',
    message: 'Выбери внешность магического шара:',
    buttons: [...buttons, { id: 'cancel', type: 'cancel', text: 'Отмена' }]
  }, (id) => {
    if (id !== 'cancel' && skins[id]) {
      applySkin(id);
      tg.HapticFeedback?.notificationOccurred('success');
    }
  });
}

// ---------- ОСТАЛЬНАЯ ЛОГИКА (ИСТОРИЯ, ТЕКСТЫ, ШАР) ----------
function addToHistory(text, category) {
  history.unshift({ text: text.slice(0, 60), fullText: text, category, timestamp: Date.now() });
  if (history.length > 10) history.pop();
  saveData();
  renderHistory();
}

function renderHistory() {
  if (!history.length) { if (historySection) historySection.style.display = 'none'; return; }
  if (historySection) historySection.style.display = 'block';
  if (historyList) {
    historyList.innerHTML = history.map(item => `
      <div class="history-item" data-full="${escapeHtml(item.fullText)}">
        <span>📜 ${escapeHtml(item.text)}</span>
        <span>${item.category === 'love' ? '💗' : item.category === 'work' ? '💼' : '💰'}</span>
      </div>
    `).join('');
    document.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => showPredictionFromHistory(el.dataset.full));
    });
  }
}

function showPredictionFromHistory(text) {
  if (casting) return;
  currentFullPrediction = text;
  currentPredictionText = `Ведьма сказала: ${text}`;
  setOrbText(text, 'reveal');
  witchLineEl.textContent = '📜 Из свитка пророчеств...';
  shareBtn.dataset.text = currentPredictionText;
  if (againBtn) againBtn.style.display = 'block';
}

// ---------- ФУНКЦИИ ДЛЯ ТЕКСТА ----------
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
  orbTextEl.innerHTML = lines.map(l => `<span class="${mode === 'reveal' ? 'orb-line' : ''}">${escapeHtml(l)}</span>`).join('');
}

// ---------- ПРЕДСКАЗАНИЯ ----------
async function loadPredictions() {
  const urls = ['./predictions.json', './data/predictions.json'];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) { allPredictions = await res.json(); return; }
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

// ---------- ОСНОВНОЙ РИТУАЛ ----------
async function askWitch() {
  if (casting) return;
  
  if (!hasFreeQuestion()) {
    tg.showPopup({
      title: '🔮 Лимит вопросов',
      message: `У тебя закончились бесплатные вопросы на сегодня. Купи дополнительные или приходи завтра!`,
      buttons: [{ id: 'buy', type: 'default', text: '✨ Купить вопросы' }, { id: 'ok', type: 'cancel', text: 'OK' }]
    }, (id) => {
      if (id === 'buy') buyQuestions();
    });
    return;
  }
  
  casting = true;
  shareBtn.disabled = true;
  if (againBtn) againBtn.style.display = 'none';
  
  stageEl.classList.remove('casting');
  void stageEl.offsetWidth;
  orbTextEl.innerHTML = '';
  
  stageEl.classList.add('casting');
  witchLineEl.textContent = '🔮 Смотрю в шар...';
  
  tg.HapticFeedback?.impactOccurred('medium');
  
  await new Promise(r => setTimeout(r, 1200));
  
  const value = nextPrediction();
  currentFullPrediction = value;
  currentPredictionText = `Ведьма сказала: ${value}`;
  setOrbText(value, 'reveal');
  
  useFreeQuestion();
  
  witchLineEl.textContent = '✨ Вот что сказала ведьма ✨';
  shareBtn.dataset.text = currentPredictionText;
  
  addToHistory(value, activeCategory);
  
  stageEl.classList.remove('casting');
  
  tg.HapticFeedback?.notificationOccurred('success');
  
  shareBtn.disabled = false;
  if (againBtn) againBtn.style.display = 'block';
  casting = false;
}

function sharePrediction() {
  const text = shareBtn.dataset.text || currentPredictionText;
  const shareText = `${text}\n\n🧙‍♀️ Ведьма сказала — магический шар судьбы`;
  const link = getReferralLink();
  tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`);
}

// ---------- ОБРАБОТЧИКИ ----------
chips.forEach(chip => {
  chip.addEventListener('click', () => {
    if (casting) return;
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeCategory = chip.dataset.key;
  });
});

if (shareBtn) shareBtn.addEventListener('click', sharePrediction);
if (orbStage) orbStage.addEventListener('click', () => { if (!casting) askWitch(); });
if (againBtn) againBtn.addEventListener('click', () => { if (!casting) askWitch(); });
if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => { history = []; saveData(); renderHistory(); });
if (buyQuestionsBtn) buyQuestionsBtn.addEventListener('click', buyQuestions);
if (referBtn) referBtn.addEventListener('click', shareReferral);
if (shareStoryBtn) shareStoryBtn.addEventListener('click', shareToStory);
if (skinSelector) skinSelector.addEventListener('click', showSkinSelector);

document.querySelectorAll('.lang').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.dataset.lang;
    if (!val || val === lang || casting) return;
    lang = val;
    document.querySelectorAll('.lang').forEach(b => b.classList.toggle('active', b === btn));
  });
});

// ---------- ЗАПУСК ----------
loadData();
loadPredictions().then(() => {
  updateQuestionsUI();
  if (!orbTextEl.innerHTML) setOrbText('🔮 Нажми на шар', 'static');
});

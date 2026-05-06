const tg = window.Telegram?.WebApp;
const witchLaugh = null;

tg?.ready();
tg?.expand();
tg?.setHeaderColor?.('#120f1d');
tg?.setBackgroundColor?.('#120f1d');

const shareBtn = document.getElementById('shareBtn');
const hintEl = document.getElementById('hint');
const witchLineEl = document.getElementById('witchLine');
const orbTextEl = document.getElementById('orbText');
const orbStage = document.getElementById('orbStage');
const stageEl = document.getElementById('stage');
const overlayEl = document.getElementById('overlay');
const witchImg = document.getElementById('witchImg');
const witchFallback = document.getElementById('witchFallback');
const chips = [...document.querySelectorAll('.chip')];

const witchLines = {
  idle: [
    'Теперь ведьма без шара в руках, так что сцена больше не дублирует главный объект интерфейса.',
    'Сейчас интерфейс выглядит собраннее: ведьма не теряется, а шар не перегружен.',
    'Убрали всё, что выглядело как техническая подпись, а не как часть опыта.',
    'Теперь экран работает как одна сцена, а не как набор разрозненных блоков.',
  ],
  cast: [
    'Колдовство началось. Сейчас шар приблизится чисто и без лишних слов.',
    'Смотри в центр. На приближении остаётся только сам ритуал.',
    'Ритуал идёт. Сначала движение, потом готовый ответ.',
    'Сейчас будет только зум, свет и финальное предсказание.',
  ],
  after: [
    'Так лучше: сцена держится плотнее и выглядит увереннее.',
    'Теперь переход выглядит спокойнее и действительно дороже.',
    'Всё правильно: сначала магия, потом готовый ответ.',
    'Теперь интерфейс меньше говорит и больше показывает.',
  ],
};

const categoryHints = {
  all: 'Полный расклад: любовь, хаос, деньги и лёгкое унижение.',
  love: 'Любовь, привязанность и сообщения, о которых жалеют утром.',
  work: 'Работа, дедлайны и усталость с характером.',
  money: 'Деньги, траты и финансовые фокусы без аплодисментов.',
  yesno: 'Короткий вердикт без права красиво отвертеться.',
  chaos: 'Режим для случаев, когда жизнь уже и так перегнула.',
};

let allPredictions = [];
let activeCategory = 'all';
let casting = false;
let lastPrediction =
  'Ведьма сказала: шар ждёт вопрос, а не кнопку.';

let lang = 'ru';

const uiCopy = {
  ru: {
    heroKicker: 'Ответ шара',
    heroText: 'Нажми на шар — и смотри, что он скажет.',
    sectionHint: 'Что хочешь узнать?',
    footerNote: 'Теперь весь ритуал — одно касание шара.',
    chips: {
      all: 'Все',
      love: 'Любовь',
      work: 'Работа',
      money: 'Деньги',
    },
    buttons: {
      share: 'Поделиться ответом',
    },
    orbIdle: 'Спроси ведьму',
  },
  en: {
    heroKicker: "Orb's answer",
    heroText: 'Tap the orb and see what it says.',
    sectionHint: 'What do you want to know?',
    footerNote: 'Now the whole ritual is just one tap on the orb.',
    chips: {
      all: 'All',
      love: 'Love',
      work: 'Work',
      money: 'Money',
    },
    buttons: {
      share: 'Share the answer',
    },
    orbIdle: 'Ask the witch',
  },
};

function applyLangTexts() {
  const dict = uiCopy[lang];
  document.querySelector('[data-i18n="heroKicker"]').textContent =
    dict.heroKicker;
  document.querySelector('[data-i18n="heroText"]').textContent =
    dict.heroText;
  document.querySelector('[data-i18n="sectionHint"]').textContent =
    dict.sectionHint;
  document.querySelector('[data-i18n="footerNote"]').textContent =
    dict.footerNote;
  document.querySelector('[data-i18n="chipAll"]').textContent =
    dict.chips.all;
  document.querySelector('[data-i18n="chipLove"]').textContent =
    dict.chips.love;
  document.querySelector('[data-i18n="chipWork"]').textContent =
    dict.chips.work;
  document.querySelector('[data-i18n="chipMoney"]').textContent =
    dict.chips.money;
  document.querySelector('[data-i18n="btnShare"]').textContent =
    dict.buttons.share;
  setOrbText(dict.orbIdle, 'static');
}

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
  const sentenceChunks = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (
    sentenceChunks.length >= 2 &&
    sentenceChunks.every((s) => s.length <= 52)
  ) {
    return sentenceChunks.slice(0, 4);
  }

  const words = normalized.split(' ');
  const lines = [];
  let current = '';
  const target =
    normalized.length > 90
      ? 18
      : normalized.length > 60
      ? 20
      : 22;

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
    

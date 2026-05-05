const tg = window.Telegram?.WebApp;
    const witchLaugh = document.getElementById("witchLaugh");
    tg?.ready();
    tg?.expand();
    tg?.setHeaderColor?.('#120f1d');
    tg?.setBackgroundColor?.('#120f1d');

    const askBtn = document.getElementById('askBtn');
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
        'Теперь экран работает как одна сцена, а не как набор разрозненных блоков.'
      ],
      cast: [
        'Колдовство началось. Сейчас шар приблизится чисто и без лишних слов.',
        'Смотри в центр. На приближении остаётся только сам ритуал.',
        'Ритуал идёт. Сначала движение, потом готовый ответ.',
        'Сейчас будет только зум, свет и финальное предсказание.'
      ],
      after: [
        'Так лучше: сцена держится плотнее и выглядит увереннее.',
        'Теперь переход выглядит спокойнее и действительно дороже.',
        'Всё правильно: сначала магия, потом готовый ответ.',
        'Теперь интерфейс меньше говорит и больше показывает.'
      ]
    };

    const categoryHints = {
      all: 'Полный расклад: любовь, хаос, деньги и лёгкое унижение.',
      love: 'Любовь, привязанность и сообщения, о которых жалеют утром.',
      work: 'Работа, дедлайны и усталость с характером.',
      money: 'Деньги, траты и финансовые фокусы без аплодисментов.',
      yesno: 'Короткий вердикт без права красиво отвертеться.',
      chaos: 'Режим для случаев, когда жизнь уже и так перегнула.'
    };

    let allPredictions = [];
    let activeCategory = 'all';
    let casting = false;
    let lastPrediction = 'Ведьма сказала: судьба ждёт, пока ты наконец нажмёшь на шар.';

    function pick(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    function escapeHtml(value) {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function splitPrediction(text) {
      const normalized = text.replace(/\s+/g, ' ').trim();
      const sentenceChunks = normalized
        .split(/(?<=[.!?])\s+/)
        .map(part => part.trim())
        .filter(Boolean);

      if (sentenceChunks.length >= 2 && sentenceChunks.every(s => s.length <= 52)) {
        return sentenceChunks.slice(0, 4);
      }

      const words = normalized.split(' ');
      const lines = [];
      let current = '';
      const target = normalized.length > 90 ? 16 : normalized.length > 60 ? 18 : 20;

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
      let lineHeight = '.96';
      let letterSpacing = '-0.03em';

      if (lines.length >= 4 || length > 95) {
        fontSize = 'clamp(15px, 3.9vw, 27px)';
        maxWidth = '15ch';
        lineHeight = '1.03';
        letterSpacing = '-0.015em';
      } else if (lines.length === 3 || length > 68) {
        fontSize = 'clamp(18px, 4.6vw, 34px)';
        maxWidth = '12ch';
        lineHeight = '1';
        letterSpacing = '-0.02em';
      } else if (length < 28) {
        fontSize = 'clamp(28px, 7vw, 48px)';
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
      orbTextEl.innerHTML = lines.map(line => {
        const cls = mode === 'reveal' ? 'orb-line' : '';
        return `<span class="${cls}">${escapeHtml(line)}</span>`;
      }).join('');
    }

    function clearOrbText() {
      orbTextEl.innerHTML = '';
    }

    async function loadPredictions() {
      const candidates = ['./predictions.json', './app/data/predictions.json'];
      for (const url of candidates) {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) {
            allPredictions = await res.json();
            return;
          }
        } catch (e) {}
      }
      allPredictions = [{ category: 'all', text: 'Шар завис, но внутренне он всё равно прав.' }];
    }

    function getPool() {
      if (activeCategory === 'all') return allPredictions;
      const filtered = allPredictions.filter(item => item.category === activeCategory);
      return filtered.length ? filtered : allPredictions;
    }

    function nextPrediction() {
      const pool = getPool();
      const item = pick(pool);
      return item?.text || 'Шар завис, но внутренне он всё равно прав.';
    }

    async function askWitch() {
      if (casting) return;
      casting = true;
      askBtn.disabled = true;
      shareBtn.disabled = true;
      stageEl.classList.remove('casting');
      orbStage.classList.remove('revealed');
      void stageEl.offsetWidth;
      clearOrbText();
      stageEl.classList.add('casting');
      overlayEl.classList.add('show');
      hintEl.textContent = categoryHints[activeCategory];
      witchLineEl.textContent = pick(witchLines.cast);

      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
      }
      try { if (witchLaugh) { witchLaugh.currentTime = 0; witchLaugh.play(); } } catch (e) {}

      await new Promise(resolve => setTimeout(resolve, 1380));

      const value = nextPrediction();
      lastPrediction = `Ведьма сказала: ${value}`;
      setOrbText(value, 'reveal');
      witchLineEl.textContent = pick(witchLines.after);
      shareBtn.dataset.text = lastPrediction;

      stageEl.classList.remove('casting');
      overlayEl.classList.remove('show');
      orbStage.classList.add('revealed');

      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
      }

      askBtn.disabled = false;
      shareBtn.disabled = false;
      casting = false;
    }

    function sharePrediction() {
      const text = shareBtn.dataset.text || lastPrediction;
      const url = `https://t.me/share/url?url=${encodeURIComponent('https://t.me')}&text=${encodeURIComponent(text)}`;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeCategory = chip.dataset.key;
        hintEl.textContent = categoryHints[activeCategory];
        witchLineEl.textContent = pick(witchLines.idle);
      });
    });

    askBtn.addEventListener('click', askWitch);
    shareBtn.addEventListener('click', sharePrediction);
    orbStage.addEventListener('click', askWitch);
    orbStage.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        askWitch();
      }
    });

    if (witchImg) {
      witchImg.addEventListener('error', () => {
        witchImg.style.display = 'none';
        witchFallback?.classList.add('show');
      });
    }

    loadPredictions().then(() => {
      hintEl.textContent = categoryHints[activeCategory];
      witchLineEl.textContent = pick(witchLines.idle);
      setOrbText('Спроси ведьму', 'static');
    });
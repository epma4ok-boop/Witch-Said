export type ZodiacSign =
  | "aries" | "taurus" | "gemini" | "cancer"
  | "leo" | "virgo" | "libra" | "scorpio"
  | "sagittarius" | "capricorn" | "aquarius" | "pisces";

export interface ZodiacMeta {
  key: ZodiacSign;
  symbol: string;
  ru: string;
  en: string;
  dates: string;
}

export const ZODIAC_SIGNS: ZodiacMeta[] = [
  { key: "aries",       symbol: "♈", ru: "Овен",       en: "Aries",       dates: "21.03 – 20.04" },
  { key: "taurus",      symbol: "♉", ru: "Телец",      en: "Taurus",      dates: "21.04 – 20.05" },
  { key: "gemini",      symbol: "♊", ru: "Близнецы",   en: "Gemini",      dates: "21.05 – 21.06" },
  { key: "cancer",      symbol: "♋", ru: "Рак",        en: "Cancer",      dates: "22.06 – 22.07" },
  { key: "leo",         symbol: "♌", ru: "Лев",        en: "Leo",         dates: "23.07 – 22.08" },
  { key: "virgo",       symbol: "♍", ru: "Дева",       en: "Virgo",       dates: "23.08 – 22.09" },
  { key: "libra",       symbol: "♎", ru: "Весы",       en: "Libra",       dates: "23.09 – 22.10" },
  { key: "scorpio",     symbol: "♏", ru: "Скорпион",   en: "Scorpio",     dates: "23.10 – 21.11" },
  { key: "sagittarius", symbol: "♐", ru: "Стрелец",    en: "Sagittarius", dates: "22.11 – 21.12" },
  { key: "capricorn",   symbol: "♑", ru: "Козерог",    en: "Capricorn",   dates: "22.12 – 20.01" },
  { key: "aquarius",    symbol: "♒", ru: "Водолей",    en: "Aquarius",    dates: "21.01 – 18.02" },
  { key: "pisces",      symbol: "♓", ru: "Рыбы",       en: "Pisces",      dates: "19.02 – 20.03" },
];

function seededRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

const HOROSCOPE_RU = {
  opens: [
    "Планеты выстроились. Не в твою пользу, но хотя бы аккуратно.",
    "Звёзды сегодня в замешательстве. Примерно как ты.",
    "Меркурий ретроградный? Нет. Просто так.",
    "Сатурн задумался о твоей жизни и покачал головой.",
    "Космос сегодня благосклонен. К кому-то другому.",
    "Луна в апогее. Это ни на что не влияет, но звучит убедительно.",
    "Юпитер смотрит на тебя с интересом. Примерно как смотрят на аквариум.",
    "Небеса сегодня молчат. Красноречивое молчание.",
    "Плутон напоминает: всё временно. Особенно хорошее.",
    "Нептун туманит картину. Нептун всегда туманит картину.",
    "Уран создаёт сюрпризы. Обычно неприятные.",
    "Марс агрессивен. Как обычно.",
    "Венера благосклонна. Только не к твоему банковскому счёту.",
    "Звёзды сложились в узор. Специалисты расходятся во мнениях.",
    "Астероиды прошли мимо. Это хорошая новость.",
    "Меркурий наконец прямой. Но привычки уже сформировались.",
    "Северный узел активен. Южный тоже. Оба не в восторге.",
    "Космические силы сегодня на твоей стороне. Ненадолго.",
    "Звёзды наблюдают. С попкорном.",
    "Вселенная отправила тебе сигнал. Он где-то в спаме.",
  ],
  mains: [
    "Сегодня хороший день, чтобы притвориться занятым и ничего не делать.",
    "Встреча, которую ты ждал, произойдёт. Только не та, которую хотел.",
    "Финансовый вопрос разрешится сам собой. Не в твою пользу, но разрешится.",
    "Кто-то скажет тебе что-то важное. Ты, скорее всего, не услышишь.",
    "День для новых начинаний. Предыдущие можно официально считать закрытыми.",
    "Неожиданное знакомство изменит твою жизнь. Или не изменит. Гороскоп не гарантирует.",
    "На работе всё сложно. Дома не проще. Но ты уже привык.",
    "Деньги придут. Уйдут быстрее.",
    "Сегодня тебя поймут. Неправильно, но поймут.",
    "Ситуация разрешится. Возможно к худшему, но зато определённо.",
    "Отношения выйдут на новый уровень. Вверх или вниз — уточни у партнёра.",
    "Судьбоносное решение созреет. Отложи его ещё на неделю, как обычно.",
    "Коллега удивит. Готовься к удивлению.",
    "Старые связи напомнят о себе. Обычно это не к добру.",
    "Сегодня всё пойдёт по плану. Если у тебя нет плана — ты свободен.",
    "Неожиданные расходы подкрадутся тихо. Как обычно.",
    "Разговор, которого избегал, произойдёт. Всё равно не так страшно... нет, страшно.",
    "Новый проект привлечёт внимание. Ненадолго.",
    "День будет длинным. Это научный факт — 24 часа.",
    "Интуиция сегодня подводит. Как и в прошлый раз.",
  ],
  signFlavors: {
    aries:       ["Твоя энергия сегодня бьёт через край. Жаль, не в ту сторону.", "Импульсивность — твоя суперсила. И главная проблема.", "Ты снова первый. Главное — куда именно.", "Марс гордится тобой. На расстоянии."],
    taurus:      ["Упорство — хорошо. Упрямство — уже вопрос.", "Комфорт сегодня важнее всего. Ты и так это знал.", "Медленно, но верно. Акцент на медленно.", "Телец знает цену вещам. Людям — сложнее."],
    gemini:      ["Сегодня ты сам не знаешь, чего хочешь. Как и вчера.", "Два мнения — одновременно, как обычно.", "Общительность зашкаливает. Результат пока неизвестен.", "Близнецы снова передумали. Новость?"],
    cancer:      ["Интуиция говорит. Ты не слушаешь. Классика.", "Настроение меняется быстро. Держись.", "Домашний уют сегодня важнее мирового порядка.", "Луна смотрит с пониманием. Даже она устала."],
    leo:         ["Все смотрят на тебя. Не все — с восхищением.", "Сцена твоя. Занавес поднимается.", "Щедрость красит. Скромность — ещё больше. Попробуй иногда.", "Лев великодушен. Запомнят. Попросят ещё."],
    virgo:       ["Всё проверено дважды. Ошибка всё равно осталась.", "Критический взгляд — дар для тебя. Для окружающих — так себе.", "Порядок важен. Но не всегда возможен.", "Перфекционизм — двигатель прогресса и источник мигрени."],
    libra:       ["Решение принято. Нет, отменено. Нет, снова принято.", "Гармония — цель. Сегодня — просто цель.", "Весы взвешивают. Итог откладывается.", "Справедливость — твой принцип. Мир не разделяет."],
    scorpio:     ["Тайна раскроется. Лучше бы не раскрывалась.", "Скорпион всё знает. Или делает вид. Разницы нет.", "Интенсивность зашкаливает. Снова.", "Трансформация — твоё второе имя. Третье тоже."],
    sagittarius: ["Приключение зовёт. Бюджет — нет.", "Оптимизм — сила. Реализм — тоже неплохо иногда.", "Стрелец снова строит планы. Часть выполнится.", "Честность — добродетель. Сегодня — чуть меньше её."],
    capricorn:   ["Цель ясна. Путь — нет. Это не остановит Козерога.", "Работа важнее всего. Кроме здоровья. Хотя иногда и его.", "Успех придёт. Ты к этому привык не радоваться.", "Козерог карабкается. Вершина немного сдвинулась."],
    aquarius:    ["Оригинальность сегодня зашкаливает. Даже для тебя.", "Идея гениальная. Реализация — отдельный разговор.", "Водолей снова опередил время. На этот раз — лет на двадцать.", "Независимость — принцип. Помощь — редкое исключение."],
    pisces:      ["Мечты реальны. Реальность — пока нет.", "Интуиция говорит шёпотом. Прислушайся.", "Рыбы плывут по течению. Иногда течение не туда.", "Творчество расцветает. Финансы — нет."],
  } as Record<ZodiacSign, string[]>,
  warns: [
    "Избегай людей с советами. Особенно астрологов.",
    "Не принимай важных решений после обеда.",
    "Тот, кому доверяешь, сегодня немного ошибётся. Немного.",
    "Удача на твоей стороне. Просто скучает и уйдёт.",
    "Берегись внезапной ясности мышления — обычно к проблемам.",
    "Не подписывай ничего, что не читал. И то, что читал — тоже.",
    "Хорошее настроение вызовет подозрения у окружающих.",
    "Кто-то думает о тебе. Не факт, что приятно.",
    "Технические сбои возможны. Резервной копии нет.",
    "Старые ошибки напомнят о себе. В самый неподходящий момент.",
    "Не трать энергию на людей, которые её не вернут. Хотя ты всё равно потратишь.",
    "Везение закончилось в понедельник. Сегодня — не исключение.",
    "Чужое мнение сегодня особенно настойчиво. Игнорируй с достоинством.",
    "Планы изменятся. Как и всё остальное.",
    "Избегай зеркал во второй половине дня — только лишние вопросы.",
  ],
  closes: [
    "Совет дня: ничего не делай — это хотя бы не ухудшит ситуацию.",
    "Числа удачи: те, которые ты придумаешь сам.",
    "Мантра дня: «Ну и ладно».",
    "Совет: сделай вид, что всё идёт по плану.",
    "Лучшее, что можно сделать сегодня — выспаться. Не сделаешь.",
    "Вселенная на твоей стороне. В теории.",
    "Послание дня: справишься. Без особого изящества, но справишься.",
    "Удачный час: тот, который уже прошёл.",
    "Звёзды говорят: иди спать раньше. Ты не послушаешь.",
    "Итог дня предсказуем. Но не тобой.",
    "Добрый совет: не гугли своё имя сегодня.",
    "День закончится. Это единственная гарантия.",
    "Завтра будет иначе. Хуже или лучше — узнаешь завтра.",
    "Вывод: ты справляешься лучше, чем думаешь. Хотя думаешь неплохо.",
    "Финальная мудрость: кофе помогает. Не с этим, но хоть с чем-то.",
    "Звёзды смотрят с уважением. Или с жалостью. Трудно различить.",
    "Совет звёзд: улыбайся. Это сбивает с толку.",
    "Запасной план активирован. Это и был план Б.",
    "Талисман дня: старый чек из кармана куртки.",
    "Космос желает удачи. Формально.",
  ],
};

const HOROSCOPE_EN = {
  opens: [
    "The planets aligned. Not in your favor, but neatly.",
    "The stars are confused today. Much like you.",
    "Mercury in retrograde? No. Just vibes.",
    "Saturn reviewed your life and slowly shook its head.",
    "The cosmos is generous today. To someone else.",
    "The Moon is at apogee. This affects nothing, but sounds convincing.",
    "Jupiter watches you with interest. Like an aquarium.",
    "The heavens are silent today. Eloquently so.",
    "Pluto reminds you: everything is temporary. Especially the good parts.",
    "Neptune fogs the picture. Neptune always fogs the picture.",
    "Uranus creates surprises. Usually unpleasant ones.",
    "Mars is aggressive. As always.",
    "Venus is favorable. Not to your bank account.",
    "The stars formed a pattern. Experts disagree on what it means.",
    "Asteroids passed by. Good news, really.",
    "Mercury is finally direct. The habits remain.",
    "The North Node is active. So is the South Node. Neither is pleased.",
    "Cosmic forces are on your side today. Briefly.",
    "The stars are watching. With popcorn.",
    "The universe sent you a message. It's in your spam folder.",
  ],
  mains: [
    "Today is a great day to look busy and do nothing.",
    "The meeting you expected will happen. Not the one you wanted.",
    "A financial matter will resolve itself. Not in your favor, but still.",
    "Someone will tell you something important. You probably won't hear it.",
    "A day for new beginnings. Previous ones can officially be closed.",
    "An unexpected encounter will change your life. Or won't. No guarantees.",
    "Work is complicated. Home too. But you're used to it.",
    "Money will come. Leave faster.",
    "Today someone will understand you. Incorrectly, but they'll try.",
    "The situation will resolve. Possibly for the worse, but definitively.",
    "The relationship will reach a new level. Up or down — ask your partner.",
    "A fateful decision will mature. You'll postpone it another week.",
    "A colleague will surprise you. Brace yourself.",
    "Old connections will surface. Usually not great news.",
    "Everything will go according to plan today. If you have no plan — you're free.",
    "Unexpected expenses will creep in quietly. As usual.",
    "The conversation you've been avoiding will happen. It's bad.",
    "A new project will attract attention. Briefly.",
    "The day will be long. That's a scientific fact — 24 hours.",
    "Your intuition lets you down today. Like last time.",
  ],
  signFlavors: {
    aries:       ["Your energy overflows today. In the wrong direction.", "Impulsiveness is your superpower. And your main problem.", "You're first again. Direction TBD.", "Mars is proud of you. From a distance."],
    taurus:      ["Persistence is good. Stubbornness is a question mark.", "Comfort matters most today. You already knew that.", "Slow and steady. Emphasis on slow.", "Taurus knows the price of things. People are harder."],
    gemini:      ["You don't know what you want today. Same as yesterday.", "Two opinions — simultaneously, as usual.", "Sociability is off the charts. Results unknown.", "Gemini changed their mind again. Shocking."],
    cancer:      ["Your intuition speaks. You don't listen. Classic.", "Moods shift fast. Hold on.", "Home comfort beats world order today.", "The Moon watches with understanding. It's also tired."],
    leo:         ["Everyone is watching you. Not all with admiration.", "The stage is yours. Curtain rises.", "Generosity is beautiful. Humility even more so. Try it sometime.", "Leo is generous today. They'll remember. They'll ask for more."],
    virgo:       ["Everything checked twice. The error stayed anyway.", "Critical eye — a gift for you. For others, debatable.", "Order matters. Not always achievable.", "Perfectionism: engine of progress and source of migraines."],
    libra:       ["Decision made. No, cancelled. No, made again.", "Harmony is the goal. Today, just the goal.", "Libra weighs. The verdict is pending.", "Justice is your principle. The world disagrees."],
    scorpio:     ["A secret will surface. Better if it hadn't.", "Scorpio knows everything. Or pretends to. Same result.", "Intensity is off the charts. Again.", "Transformation is your middle name. Third name too."],
    sagittarius: ["Adventure calls. Budget says no.", "Optimism is power. Realism is useful sometimes.", "Sagittarius makes plans again. Some will happen.", "Honesty is a virtue. Today, a little less of it."],
    capricorn:   ["The goal is clear. The path isn't. Capricorn doesn't care.", "Work above all. Except health. Well, sometimes health too.", "Success will come. You forgot how to enjoy it.", "Capricorn climbs. The summit shifted slightly."],
    aquarius:    ["Originality is extreme today. Even for you.", "The idea is brilliant. Execution is a separate conversation.", "Aquarius is ahead of their time again. By about twenty years.", "Independence is a principle. Help is a rare exception."],
    pisces:      ["Dreams are real. Reality isn't quite yet.", "Intuition whispers. Listen closely.", "Pisces goes with the flow. Sometimes the flow is wrong.", "Creativity blooms. Finances don't."],
  } as Record<ZodiacSign, string[]>,
  warns: [
    "Avoid people giving advice. Especially astrologers.",
    "Don't make important decisions after lunch.",
    "Someone you trust will make a small mistake today. Small.",
    "Luck is on your side. It's bored and leaving soon.",
    "Beware sudden mental clarity — usually a warning sign.",
    "Don't sign anything you haven't read. Or anything you have.",
    "Good mood will raise suspicion among those around you.",
    "Someone is thinking about you. Not necessarily pleasantly.",
    "Technical failures possible. No backup exists.",
    "Old mistakes will resurface. At the worst possible moment.",
    "Don't spend energy on people who won't return it. You will anyway.",
    "Luck ran out Monday. Today is not an exception.",
    "Other people's opinions are extra pushy today. Ignore gracefully.",
    "Plans will change. Like everything else.",
    "Avoid mirrors in the afternoon — just unnecessary questions.",
  ],
  closes: [
    "Tip: do nothing — at least it won't make things worse.",
    "Lucky numbers: whichever you invent yourself.",
    "Daily mantra: 'Whatever'.",
    "Advice: pretend everything is going according to plan.",
    "Best thing you can do today: sleep early. You won't.",
    "The universe is on your side. In theory.",
    "Message of the day: you'll manage. Not gracefully, but you will.",
    "Lucky hour: the one that already passed.",
    "The stars say: go to bed earlier. You won't listen.",
    "Today's outcome is predictable. Just not by you.",
    "Friendly tip: don't google yourself today.",
    "The day will end. That's the only guarantee.",
    "Tomorrow will be different. Better or worse — find out tomorrow.",
    "Conclusion: you're coping better than you think. Which isn't saying much.",
    "Final wisdom: coffee helps. Not with this. But with something.",
    "The stars watch with respect. Or pity. Hard to tell from here.",
    "Stars say: smile. It confuses people.",
    "Backup plan activated. That was the backup plan.",
    "Lucky charm: old receipt from a jacket pocket.",
    "The cosmos wishes you luck. Formally.",
  ],
};

export function generateHoroscope(sign: ZodiacSign, date: Date, lang: "ru" | "en"): string {
  const signIndex = ZODIAC_SIGNS.findIndex(s => s.key === sign);
  const day = dayOfYear(date);
  const year = date.getFullYear();
  const seed = signIndex * 100003 + day * 997 + year * 31;
  const rng = seededRng(seed);

  const data = lang === "ru" ? HOROSCOPE_RU : HOROSCOPE_EN;
  const flavors = data.signFlavors[sign];

  const open = pick(data.opens, rng);
  const main = pick(data.mains, rng);
  const flavor = pick(flavors, rng);
  const warn = pick(data.warns, rng);
  const close = pick(data.closes, rng);

  return `${open} ${main} ${flavor}\n\n${warn} ${close}`;
}

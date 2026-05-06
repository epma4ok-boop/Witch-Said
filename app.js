<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Ведьма сказала</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #05030b; font-family: system-ui; min-height: 100vh; }
    
    .splash-screen {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: radial-gradient(ellipse at 30% 20%, #1a0f2e 0%, #05030b 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.6s ease;
    }
    .splash-screen.hide { opacity: 0; visibility: hidden; }
    .splash-content { text-align: center; }
    .splash-title {
      font-family: serif;
      font-size: 32px;
      background: linear-gradient(135deg, #fff, #b26bff);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .splash-progress {
      width: 200px;
      height: 2px;
      background: rgba(178,107,255,0.2);
      margin-top: 24px;
    }
    .splash-progress-bar {
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #b26bff, #ff7ac2);
      transition: width 0.2s;
    }
    
    .app {
      opacity: 0;
      transition: opacity 0.5s;
      max-width: 500px;
      margin: 0 auto;
      padding: 20px;
    }
    .app.visible { opacity: 1; }
    
    .orb-card {
      background: rgba(20,12,36,0.7);
      border-radius: 48px;
      padding: 30px;
      text-align: center;
    }
    .orb-stage {
      width: 220px;
      height: 220px;
      margin: 0 auto;
      background: radial-gradient(circle at 30% 30%, #fff, #c88bff, #5a2a8a);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 30px rgba(178,107,255,0.5);
    }
    .orb-text {
      font-family: serif;
      font-size: 24px;
      font-weight: bold;
      color: #1a052a;
      text-align: center;
    }
    .orb-line {
      display: block;
      animation: fadeIn 0.3s forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .witch-line {
      color: #b9a9d9;
      margin-top: 16px;
      font-size: 13px;
    }
    
    .chips {
      display: flex;
      gap: 10px;
      margin: 20px 0;
      flex-wrap: wrap;
    }
    .chip {
      background: rgba(18,12,32,0.7);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 40px;
      padding: 8px 16px;
      color: #a590c2;
      cursor: pointer;
    }
    .chip.active {
      background: rgba(178,107,255,0.25);
      border-color: #b26bff;
      color: white;
    }
    
    .btn {
      padding: 12px 20px;
      border-radius: 60px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      margin: 5px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #b26bff, #8b3fdf);
      color: white;
    }
    .btn-secondary {
      background: rgba(18,12,32,0.8);
      color: white;
      border: 1px solid rgba(255,255,255,0.12);
    }
    
    .questions-counter {
      text-align: center;
      margin-top: 16px;
      font-size: 12px;
      color: #a590c2;
    }
    
    .footer-note {
      text-align: center;
      font-size: 11px;
      color: #7a6a99;
      margin-top: 20px;
    }
  </style>
</head>
<body>

<div class="splash-screen" id="splash">
  <div class="splash-content">
    <div class="splash-title">ВЕДЬМА СКАЗАЛА</div>
    <div class="splash-progress">
      <div class="splash-progress-bar" id="progressBar"></div>
    </div>
  </div>
</div>

<div class="app" id="app">
  <div class="orb-card">
    <div class="orb-stage" id="orbStage">
      <div class="orb-text" id="orbText">🔮</div>
    </div>
    <div class="witch-line" id="witchLine">Нажми на шар</div>
  </div>

  <div class="chips">
    <button class="chip active" data-key="all">✨ Всё</button>
    <button class="chip" data-key="love">💗 Любовь</button>
    <button class="chip" data-key="work">💼 Работа</button>
    <button class="chip" data-key="money">💰 Деньги</button>
  </div>

  <div>
    <button id="shareBtn" class="btn btn-primary">📤 Поделиться</button>
    <button id="againBtn" class="btn btn-secondary" style="display:none">🎭 Другой ответ</button>
  </div>

  <div class="questions-counter">
    🔮 Сегодня осталось вопросов: <span id="questionsLeft">3/3</span>
  </div>

  <div class="footer-note">Магия внутри. Нажми — и шар заговорит</div>
</div>

<script src="app.js"></script>
</body>
</html>

/* ============================================================
   快速检测：读取 learn.xml 的 quizzes，渲染目录与小测
   ============================================================ */
(function () {
  'use strict';
  var C = window.XMCommon;

  var state = {
    data: null,
    currentQuiz: null,
    scores: {},      // { quizId: { correct, total } }
    answers: {}      // { quizId: true }
  };

  /* ================= 左侧目录 ================= */
  function renderSidebar() {
    var wrap = document.getElementById('sidebar-tree');
    if (!wrap) return;
    wrap.innerHTML = '';

    var folder = document.createElement('div');
    folder.className = 'tree-folder';
    var title = document.createElement('div');
    title.className = 'tree-folder-title';
    title.innerHTML = '<span>小测目录</span><span class="arrow">▼</span>';
    title.addEventListener('click', function () { folder.classList.toggle('collapsed'); });
    folder.appendChild(title);

    var body = document.createElement('div');
    body.className = 'tree-folder-body';
    var ul = document.createElement('ul');
    ul.className = 'tree-list';
    state.data.quizzes.forEach(function (q) {
      var li = document.createElement('li');
      li.dataset.id = q.id;
      li.textContent = q.title;
      li.addEventListener('click', function () { openQuiz(q.id); });
      ul.appendChild(li);
    });
    body.appendChild(ul);
    folder.appendChild(body);
    wrap.appendChild(folder);
  }

  /* ================= 首页 ================= */
  function renderHome() {
    var main = document.getElementById('quiz-main');
    if (!main) return;
    state.currentQuiz = null;
    var html = '<h1>快速检测</h1><div class="quiz-sub">选择一个单元开始小测，答案提交后即可看到得分</div><div class="quiz-card-list">';
    state.data.quizzes.forEach(function (q) {
      var sc = state.scores[q.id];
      html += '<div class="quiz-card" data-id="' + C.escapeHtml(q.id) + '">' +
        '<div class="quiz-card-main">' +
          '<div class="quiz-card-title">' + C.escapeHtml(q.title) + '</div>' +
          '<div class="quiz-card-meta">' +
            '<span>范围：' + C.escapeHtml(q.desc) + '</span>' +
            '<span>题数：' + q.questions.length + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="quiz-card-status ' + (sc ? 'done' : '') + '">' +
          (sc ? sc.correct + '/' + sc.total : '未完成') +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    main.innerHTML = html;
    main.querySelectorAll('.quiz-card').forEach(function (card) {
      card.addEventListener('click', function () { openQuiz(card.dataset.id); });
    });
    updateScorePanel();
  }

  /* ================= 答题 ================= */
  function openQuiz(id) {
    var quiz = state.data.quizzes.find(function (q) { return q.id === id; });
    if (!quiz) return;
    state.currentQuiz = id;

    document.querySelectorAll('.tree-list li').forEach(function (li) {
      li.classList.toggle('active', li.dataset.id === id);
    });

    var questions = quiz.questions.map(function (q) {
      return {
        q: q.q,
        correct: q.a,
        opts: C.shuffle(q.opts),
        selected: null
      };
    });

    var main = document.getElementById('quiz-main');
    var html = '<h1>' + C.escapeHtml(quiz.title) + '</h1>' +
      '<div class="quiz-sub">' + C.escapeHtml(quiz.desc) + ' · 共 ' + questions.length + ' 题</div>' +
      '<div id="quiz-body">';
    questions.forEach(function (item, i) {
      html += '<div class="quiz-question" data-q="' + i + '">' +
        '<div class="quiz-q-text"><span class="quiz-q-num">' + C.pad2(i + 1) + '</span>' +
        C.escapeHtml(item.q) + '</div><ul class="quiz-options">';
      item.opts.forEach(function (o, oi) {
        html += '<li data-opt="' + C.escapeHtml(o) + '" data-q="' + i + '">' +
          '<span class="opt-letter">' + String.fromCharCode(65 + oi) + '</span>' +
          '<span>' + C.escapeHtml(o) + '</span></li>';
      });
      html += '</ul></div>';
    });
    html += '</div><div class="quiz-actions">' +
      '<button class="btn" id="quiz-submit">提交答案</button>' +
      '<button class="btn ghost" id="quiz-back">返回小测列表</button>' +
      '</div><div id="quiz-result"></div>';
    main.innerHTML = html;

    main.querySelectorAll('.quiz-options li').forEach(function (li) {
      li.addEventListener('click', function () {
        if (state.answers[quiz.id]) return;
        var qi = parseInt(li.dataset.q, 10);
        var parent = li.parentElement;
        parent.querySelectorAll('li').forEach(function (x) { x.classList.remove('selected'); });
        li.classList.add('selected');
        questions[qi].selected = li.dataset.opt;
      });
    });
    document.getElementById('quiz-submit').addEventListener('click', function () {
      submitQuiz(quiz, questions);
    });
    document.getElementById('quiz-back').addEventListener('click', function () {
      renderHome();
      document.querySelectorAll('.tree-list li').forEach(function (li) { li.classList.remove('active'); });
    });
  }

  function submitQuiz(quiz, questions) {
    var unanswered = questions.filter(function (q) { return q.selected === null; }).length;
    if (unanswered > 0 && !confirm('还有 ' + unanswered + ' 题未作答，确定提交吗？')) return;

    var correct = 0;
    questions.forEach(function (item, i) {
      var box = document.querySelector('.quiz-question[data-q="' + i + '"]');
      if (!box) return;
      box.querySelectorAll('.quiz-options li').forEach(function (li) {
        var opt = li.dataset.opt;
        if (opt === item.correct) li.classList.add('correct');
        else if (opt === item.selected) li.classList.add('wrong');
        li.style.cursor = 'default';
      });
      if (item.selected === item.correct) correct++;
    });

    state.scores[quiz.id] = { correct: correct, total: questions.length };
    state.answers[quiz.id] = true;

    var pct = Math.round(correct / questions.length * 100);
    document.getElementById('quiz-result').innerHTML =
      '<div class="quiz-result">本次得分：<span class="score">' +
      correct + ' / ' + questions.length + '</span>（' + pct + '%）</div>';
    var sb = document.getElementById('quiz-submit');
    sb.disabled = true; sb.style.opacity = '0.5';
    updateScorePanel();
  }

  /* ================= 成绩环 ================= */
  function updateScorePanel() {
    var total = state.data ? state.data.quizzes.length : 0;
    var done = Object.keys(state.scores).length;
    var pct = total === 0 ? 0 : Math.round(done / total * 100);

    var ring = document.getElementById('score-ring-fill');
    var pctEl = document.getElementById('score-pct');
    var statsEl = document.getElementById('score-stats');
    if (!ring) return;

    var circumference = 2 * Math.PI * 66;
    ring.setAttribute('stroke-dasharray', circumference.toFixed(1));
    ring.setAttribute('stroke-dashoffset', (circumference * (1 - pct / 100)).toFixed(1));
    pctEl.textContent = pct + '%';

    var tc = 0, tq = 0;
    Object.keys(state.scores).forEach(function (k) {
      tc += state.scores[k].correct;
      tq += state.scores[k].total;
    });
    var acc = tq === 0 ? 0 : Math.round(tc / tq * 100);
    statsEl.innerHTML = '已完成 <strong>' + done + '</strong> / ' + total +
      ' 个小测<br>累计正确率 <strong>' + acc + '%</strong>';
  }

  /* ================= 初始化 ================= */
  function init() {
    C.initTheme();
    C.initHamburger();

    C.loadXML('learn.xml').then(function (doc) {
      state.data = C.parseCatalog(doc);
      renderSidebar();
      renderHome();
      C.buildMobileNav('quizzes', state.data, null, function (n) {
        // 小测页的移动导航：note 点击跳转到 learn.html
        location.href = 'learn.html?note=' + encodeURIComponent(n.id);
      });
    }).catch(function (err) {
      console.error(err);
      var main = document.getElementById('quiz-main');
      if (main) main.innerHTML = '<h1>加载失败</h1><p>' + C.escapeHtml(err.message) + '</p>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
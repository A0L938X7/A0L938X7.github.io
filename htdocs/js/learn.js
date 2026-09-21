/* ============================================================
   学习模块：左侧树 + md 渲染 + 知识图谱 + 本页大纲
   ============================================================ */
(function () {
  'use strict';
  var C = window.XMCommon;

  var state = {
    data: null,
    notesMap: {},
    notesOrder: [],
    currentId: null,
    lastRelated: []
  };

  /* ================= Markdown 渲染 ================= */
  function mdToHtml(md) {
    if (!md) return '';
    // 先抽取代码块占位
    var codeBlocks = [];
    md = md.replace(/```([\s\S]*?)```/g, function (_, code) {
      codeBlocks.push(code.replace(/^\n+|\n+$/g, ''));
      return '\u0000CODE' + (codeBlocks.length - 1) + '\u0000';
    });

    var lines = md.replace(/\r\n/g, '\n').split('\n');
    var html = [];
    var i = 0;

    function inline(s) {
      s = C.escapeHtml(s);
      // 图片
      s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
        '<img src="$2" alt="$1" style="max-width:100%;">');
      // 链接
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>');
      // 行内代码
      s = s.replace(/`([^`]+)`/g, function (_, c) { return '<code>' + c + '</code>'; });
      // 粗体
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // 斜体（*text*，避免与 ** 冲突）
      s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
      return s;
    }

    function closeList(stack) {
      while (stack.length) {
        html.push(stack.pop() === 'ul' ? '</ul>' : '</ol>');
      }
    }

    var listStack = [];

    while (i < lines.length) {
      var line = lines[i];

      // 空行
      if (/^\s*$/.test(line)) { closeList(listStack); i++; continue; }

      // 代码块占位
      var codeM = line.match(/^\u0000CODE(\d+)\u0000$/);
      if (codeM) {
        closeList(listStack);
        html.push('<pre><code>' + C.escapeHtml(codeBlocks[+codeM[1]]) + '</code></pre>');
        i++; continue;
      }

      // 标题
      var hM = line.match(/^(#{1,6})\s+(.*)$/);
      if (hM) {
        closeList(listStack);
        var lvl = hM[1].length;
        html.push('<h' + lvl + '>' + inline(hM[2]) + '</h' + lvl + '>');
        i++; continue;
      }

      // 分隔线
      if (/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(line)) {
        closeList(listStack);
        html.push('<hr>'); i++; continue;
      }

      // 引用块 / Callout
      if (/^\s*>\s?/.test(line)) {
        closeList(listStack);
        var quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        var first = quote[0] || '';
        var calloutMatch = first.match(/^\*\*(.+?)\*\*\s*$/);
        if (calloutMatch) {
          var title = calloutMatch[1];
          var body = quote.slice(1).join('\n');
          html.push(
            '<div class="callout">' +
              '<div class="callout-title">' + C.escapeHtml(title) + '</div>' +
              inline(body) +
            '</div>'
          );
        } else {
          html.push('<blockquote>' + inline(quote.join('<br>')) + '</blockquote>');
        }
        continue;
      }

      // 表格
      if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
        closeList(listStack);
        var header = splitRow(line);
        i += 2;
        var rows = [];
        while (i < lines.length && /\|/.test(lines[i]) && !/^\s*$/.test(lines[i])) {
          rows.push(splitRow(lines[i]));
          i++;
        }
        var t = '<table><thead><tr>';
        header.forEach(function (h) { t += '<th>' + inline(h) + '</th>'; });
        t += '</tr></thead><tbody>';
        rows.forEach(function (r) {
          t += '<tr>';
          for (var k = 0; k < header.length; k++) t += '<td>' + inline(r[k] || '') + '</td>';
          t += '</tr>';
        });
        t += '</tbody></table>';
        html.push(t);
        continue;
      }

      // 无序列表
      var ulM = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (ulM) {
        if (!listStack.length || listStack[listStack.length - 1] !== 'ul') {
          closeList(listStack);
          html.push('<ul>'); listStack.push('ul');
        }
        html.push('<li>' + inline(ulM[2]) + '</li>');
        i++; continue;
      }

      // 有序列表
      var olM = line.match(/^(\s*)\d+\.\s+(.*)$/);
      if (olM) {
        if (!listStack.length || listStack[listStack.length - 1] !== 'ol') {
          closeList(listStack);
          html.push('<ol>'); listStack.push('ol');
        }
        html.push('<li>' + inline(olM[2]) + '</li>');
        i++; continue;
      }

      // 普通段落
      closeList(listStack);
      var para = [line];
      i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) &&
             !/^(#{1,6})\s/.test(lines[i]) &&
             !/^\s*[-*+]\s/.test(lines[i]) &&
             !/^\s*\d+\.\s/.test(lines[i]) &&
             !/^\s*>/.test(lines[i]) &&
             !/\|/.test(lines[i]) &&
             !/^\u0000CODE\d+\u0000$/.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      html.push('<p>' + inline(para.join(' ')) + '</p>');
    }
    closeList(listStack);
    return html.join('\n');

    function splitRow(row) {
      var s = row.trim();
      if (s.startsWith('|')) s = s.slice(1);
      if (s.endsWith('|')) s = s.slice(0, -1);
      return s.split('|').map(function (x) { return x.trim(); });
    }
  }

  /* ================= 左侧树 ================= */
  function renderTree() {
    var wrap = document.getElementById('sidebar-tree');
    if (!wrap) return;
    wrap.innerHTML = '';
    var idxCounter = 0;

    state.data.folders.forEach(function (folder) {
      var fEl = document.createElement('div');
      fEl.className = 'tree-folder';

      var fTitle = document.createElement('div');
      fTitle.className = 'tree-folder-title';
      fTitle.innerHTML = '<span>' + C.escapeHtml(folder.name) + '</span><span class="arrow">▼</span>';
      fTitle.addEventListener('click', function () { fEl.classList.toggle('collapsed'); });
      fEl.appendChild(fTitle);

      var fBody = document.createElement('div');
      fBody.className = 'tree-folder-body';
      // grid-template-rows 动画需要内部包裹
      var fInner = document.createElement('div');
      fBody.appendChild(fInner);
      fEl.appendChild(fBody);

      folder.children.forEach(function (node) {
        if (node.type === 'folder') {
          var sf = document.createElement('div');
          sf.className = 'tree-subfolder';
          var sfTitle = document.createElement('div');
          sfTitle.className = 'tree-subfolder-title';
          sfTitle.innerHTML = '<span>' + C.escapeHtml(node.name) + '</span><span class="arrow">▼</span>';
          sfTitle.addEventListener('click', function () { sf.classList.toggle('collapsed'); });
          sf.appendChild(sfTitle);
          var sfBody = document.createElement('div');
          sfBody.className = 'tree-subfolder-body';
          var sfInner = document.createElement('div');
          sfBody.appendChild(sfInner);
          sf.appendChild(sfBody);
          var ul = document.createElement('ul');
          ul.className = 'tree-list';
          node.children.forEach(function (note) {
            if (note.type !== 'note') return;
            idxCounter++;
            ul.appendChild(makeNoteLi(note, idxCounter));
          });
          sfInner.appendChild(ul);
          fInner.appendChild(sf);
        } else if (node.type === 'note') {
          idxCounter++;
          var ul2 = document.createElement('ul');
          ul2.className = 'tree-list';
          ul2.appendChild(makeNoteLi(node, idxCounter));
          fInner.appendChild(ul2);
        }
      });

      wrap.appendChild(fEl);
    });
  }
  function makeNoteLi(note, idx) {
    var li = document.createElement('li');
    li.dataset.id = note.id;
    li.innerHTML = '<span class="num">' + C.pad2(idx) + '</span>' + C.escapeHtml(note.title);
    li.addEventListener('click', function () { openNote(note.id); });
    return li;
  }

  /* ================= 打开笔记 ================= */
  function openNote(id) {
    var note = state.notesMap[id];
    if (!note) return;
    state.currentId = id;

    document.querySelectorAll('.tree-list li').forEach(function (li) {
      li.classList.toggle('active', li.dataset.id === id);
    });
    var cur = document.querySelector('.tree-list li.active');
    if (cur) {
      var p = cur.closest('.tree-subfolder');
      if (p) p.classList.remove('collapsed');
    }

    if (history.replaceState) {
      history.replaceState(null, '', 'learn.html?note=' + encodeURIComponent(id));
    }

    C.buildMobileNav('modules', state.data, id, function (n) { openNote(n.id); });

    var content = document.getElementById('module-content');
    content.innerHTML = '<h1>' + C.escapeHtml(note.title) + '</h1>' +
      '<div class="module-sub">' + C.escapeHtml(note._group || '') + '</div>' +
      '<div class="md-loading">正在加载笔记…</div>';

    fetch(note.path).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (md) {
      var html = mdToHtml(md);
      content.innerHTML =
        '<h1>' + C.escapeHtml(note.title) + '</h1>' +
        '<div class="module-sub">' + C.escapeHtml(note._group || '') + '</div>' +
        '<div class="md-body">' + html + '</div>';
      renderOutline(content);
      content.scrollTop = 0;
    }).catch(function (err) {
      content.innerHTML =
        '<h1>' + C.escapeHtml(note.title) + '</h1>' +
        '<div class="module-sub">' + C.escapeHtml(note._group || '') + '</div>' +
        '<div class="md-loading">笔记加载失败：' + C.escapeHtml(err.message) + '<br>' +
        '请确认路径：' + C.escapeHtml(note.path) + '</div>';
      renderOutline(content);
    });

    state.lastRelated = note.related || [];
    renderGraph(id);
  }

  /* ================= 本页大纲 ================= */
  function renderOutline(contentEl) {
    var outline = document.getElementById('outline-list');
    if (!outline) return;
    outline.innerHTML = '';
    var hs = contentEl.querySelectorAll('.md-body h2, .md-body h3, .md-body h4');
    if (!hs.length) {
      outline.innerHTML = '<li class="empty-tip">本页无标题</li>';
      return;
    }
    hs.forEach(function (h, i) {
      if (!h.id) h.id = 'md-h-' + i;
      var li = document.createElement('li');
      var lvl = h.tagName === 'H2' ? 'lv2' : h.tagName === 'H3' ? 'lv3' : 'lv4';
      li.className = lvl;
      li.textContent = h.textContent;
      li.addEventListener('click', function () {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      outline.appendChild(li);
    });
  }

  /* ================= 知识图谱（正方形，可拖拽缩放） ================= */
  var graphState = {
    svg: null,
    viewBox: { x: 0, y: 0, w: 280, h: 280 },
    dragging: false,
    lastX: 0, lastY: 0
  };

  function renderGraph(activeId) {
    var svg = document.getElementById('graph-svg');
    if (!svg || !state.data) return;
    graphState.svg = svg;

    var nodes = [];
    var active = state.notesMap[activeId];
    if (active) nodes.push({ id: active.id, title: active.title, center: true });
    (state.lastRelated || []).forEach(function (rid) {
      var n = state.notesMap[rid];
      if (n && (!active || rid !== active.id)) nodes.push({ id: n.id, title: n.title });
    });

    // 正方形视图
    var W = 280, H = 280;
    var cx = W / 2, cy = H / 2;
    var positions = [];
    var N = nodes.length;
    var hasCenter = nodes.some(function (n) { return n.center; });
    var ringCount = N - (hasCenter ? 1 : 0);
    if (ringCount < 1) ringCount = 1;
    var rad = 92;

    for (var i = 0; i < N; i++) {
      if (nodes[i].center) {
        positions.push({ x: cx, y: cy, r: 20 });
      } else {
        var k = i - (hasCenter ? 1 : 0);
        var ang = (Math.PI * 2 * k) / ringCount - Math.PI / 2;
        positions.push({
          x: cx + Math.cos(ang) * rad,
          y: cy + Math.sin(ang) * rad,
          r: 16
        });
      }
    }

    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    // 连线
    for (var e = 0; e < N; e++) {
      if (nodes[e].center) continue;
      var from = positions[0];
      var to = positions[e];
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
      line.setAttribute('d', 'M' + from.x + ',' + from.y + ' Q' + mx + ',' + my + ' ' + to.x + ',' + to.y);
      line.setAttribute('class', 'graph-edge' + (nodes[e].id === activeId ? ' active' : ''));
      svg.appendChild(line);
    }

    // 节点
    nodes.forEach(function (n, i) {
      var pos = positions[i];
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'graph-node' + (n.center ? ' active' : ''));
      g.style.cursor = 'pointer';

      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', pos.x); c.setAttribute('cy', pos.y); c.setAttribute('r', pos.r);
      g.appendChild(c);

      // 中心节点始终显示文字，其他节点隐藏（由 CSS 控制 hover 显示 .node-label）
      if (n.center) {
        var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', pos.x); t.setAttribute('y', pos.y);
        t.textContent = n.title.slice(0, 4);
        g.appendChild(t);
      } else {
        // 非中心节点：圆内空，悬浮显示完整名称
        var t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t2.setAttribute('x', pos.x); t2.setAttribute('y', pos.y);
        t2.textContent = n.title.slice(0, 2);
        g.appendChild(t2);
      }

      var lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('class', 'node-label');
      lbl.setAttribute('x', pos.x);
      lbl.setAttribute('y', pos.y + pos.r + 12);
      lbl.textContent = n.title;
      g.appendChild(lbl);

      g.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (!n.center) openNote(n.id);
      });
      svg.appendChild(g);
    });

    bindGraphPan(svg);
  }

  function bindGraphPan(svg) {
    if (svg._panBound) return;
    svg._panBound = true;

    svg.addEventListener('mousedown', function (e) {
      graphState.dragging = true;
      graphState.lastX = e.clientX;
      graphState.lastY = e.clientY;
      svg.classList.add('dragging');
    });
    document.addEventListener('mousemove', function (e) {
      if (!graphState.dragging) return;
      var dx = e.clientX - graphState.lastX;
      var dy = e.clientY - graphState.lastY;
      graphState.lastX = e.clientX;
      graphState.lastY = e.clientY;
      panViewBox(dx, dy);
    });
    document.addEventListener('mouseup', function () {
      if (!graphState.dragging) return;
      graphState.dragging = false;
      svg.classList.remove('dragging');
    });

    svg.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      graphState.dragging = true;
      graphState.lastX = e.touches[0].clientX;
      graphState.lastY = e.touches[0].clientY;
    }, { passive: true });
    svg.addEventListener('touchmove', function (e) {
      if (!graphState.dragging || e.touches.length !== 1) return;
      var t = e.touches[0];
      var dx = t.clientX - graphState.lastX;
      var dy = t.clientY - graphState.lastY;
      graphState.lastX = t.clientX;
      graphState.lastY = t.clientY;
      panViewBox(dx, dy);
      e.preventDefault();
    }, { passive: false });
    svg.addEventListener('touchend', function () { graphState.dragging = false; });

    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var vb = graphState.viewBox;
      var scale = e.deltaY > 0 ? 1.1 : 0.9;
      var nw = vb.w * scale, nh = vb.h * scale;
      if (nw < 80 || nw > 1200) return;
      var rect = svg.getBoundingClientRect();
      var mx = (e.clientX - rect.left) / rect.width;
      var my = (e.clientY - rect.top) / rect.height;
      var newX = vb.x + (vb.w - nw) * mx;
      var newY = vb.y + (vb.h - nh) * my;
      vb.x = newX; vb.y = newY; vb.w = nw; vb.h = nh;
      applyViewBox();
    }, { passive: false });

    applyViewBox();
  }

  function panViewBox(dx, dy) {
    var svg = graphState.svg;
    if (!svg) return;
    var rect = svg.getBoundingClientRect();
    var vb = graphState.viewBox;
    var ux = dx * (vb.w / rect.width);
    var uy = dy * (vb.h / rect.height);
    vb.x -= ux; vb.y -= uy;
    applyViewBox();
  }

  function applyViewBox() {
    var svg = graphState.svg;
    if (!svg) return;
    var vb = graphState.viewBox;
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
  }

  /* ================= 初始化 ================= */
  function init() {
    C.initTheme();
    C.initHamburger();

    C.loadXML('learn.xml').then(function (doc) {
      state.data = C.parseCatalog(doc);
      var flat = C.flattenNotes(state.data.folders);
      state.notesMap = flat.map;
      state.notesOrder = flat.order;

      renderTree();
      C.buildMobileNav('modules', state.data, null, function (n) { openNote(n.id); });

      var search = document.getElementById('module-search');
      if (search) {
        search.addEventListener('input', function () {
          var kw = this.value.trim().toLowerCase();
          document.querySelectorAll('.tree-list li').forEach(function (li) {
            var note = state.notesMap[li.dataset.id];
            var text = note ? note.title.toLowerCase() : '';
            li.style.display = (!kw || text.indexOf(kw) >= 0) ? '' : 'none';
          });
        });
      }

      var params = new URLSearchParams(location.search);
      var want = params.get('note');
      if (!want || !state.notesMap[want]) {
        want = state.notesOrder.length ? state.notesOrder[0].id : null;
      }
      if (want) openNote(want);
    }).catch(function (err) {
      console.error(err);
      var content = document.getElementById('module-content');
      if (content) content.innerHTML = '<h1>加载失败</h1><p>' + C.escapeHtml(err.message) + '</p>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
/* ============================================================
   学习模块：左侧树 + md 渲染 + 知识图谱 + 本页大纲 + 翻页
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
      // 斜体
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

        // 逐行渲染后再用 <br> 拼接，避免 <br> 被 escapeHtml 转义
        function renderLines(arr) {
          return arr.map(function (l) { return inline(l); }).join('<br>');
        }

        if (calloutMatch) {
          var title = calloutMatch[1];
          var bodyHtml = renderLines(quote.slice(1));
          html.push(
            '<div class="callout">' +
              '<div class="callout-title">' + C.escapeHtml(title) + '</div>' +
              bodyHtml +
            '</div>'
          );
        } else {
          html.push('<blockquote>' + renderLines(quote) + '</blockquote>');
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

  /* ================= Hero Image ================= */
  function buildHeroHtml(note) {
    if (!note.hero) return '';
    var alt = note.heroAlt || note.title || '';
    return '' +
      '<div class="note-hero">' +
        '<img src="' + C.escapeHtml(note.hero) + '" ' +
             'alt="' + C.escapeHtml(alt) + '" ' +
             'onerror="this.parentNode.style.display=\'none\'">' +
      '</div>';
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
    content.innerHTML = buildHeroHtml(note) +
      '<h1>' + C.escapeHtml(note.title) + '</h1>' +
      '<div class="module-sub">' + C.escapeHtml(note._group || '') + '</div>' +
      '<div class="md-loading">正在加载笔记…</div>';

    // 计算上一节 / 下一节
    var order = state.notesOrder;
    var idx = order.findIndex(function (n) { return n.id === id; });
    var prev = idx > 0 ? order[idx - 1] : null;
    var next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;

    function buildNav() {
      if (!prev && !next) return '';
      var h = '<div class="module-nav">';
      if (prev) {
        h += '<button class="btn ghost" data-note="' + prev.id + '">' +
             '← ' + C.escapeHtml(prev.title) + '</button>';
      } else {
        h += '<button class="btn ghost" disabled>已是第一节</button>';
      }
      if (next) {
        h += '<button class="btn ghost" data-note="' + next.id + '">' +
             C.escapeHtml(next.title) + ' →</button>';
      } else {
        h += '<button class="btn ghost" disabled>已是最后一节</button>';
      }
      h += '</div>';
      return h;
    }

    function bindNav() {
      content.querySelectorAll('.module-nav button[data-note]').forEach(function (b) {
        b.addEventListener('click', function () {
          openNote(b.dataset.note);
        });
      });
    }

    fetch(note.path).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (md) {
      var html = mdToHtml(md);
      content.innerHTML =
        buildHeroHtml(note) +
        '<h1>' + C.escapeHtml(note.title) + '</h1>' +
        '<div class="module-sub">' + C.escapeHtml(note._group || '') + '</div>' +
        '<div class="md-body">' + html + '</div>' +
        buildNav();
      renderOutline(content);
      bindNav();
      content.scrollTop = 0;
    }).catch(function (err) {
      content.innerHTML =
        buildHeroHtml(note) +
        '<h1>' + C.escapeHtml(note.title) + '</h1>' +
        '<div class="module-sub">' + C.escapeHtml(note._group || '') + '</div>' +
        '<div class="md-loading">笔记加载失败：' + C.escapeHtml(err.message) + '<br>' +
        '请确认路径：' + C.escapeHtml(note.path) + '</div>' +
        buildNav();
      renderOutline(content);
      bindNav();
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

  /* ================= 知识图谱（力导向 + 多级展开） ================= */
  var graphState = {
    svg: null,
    viewport: null,
    nodeMap: {},
    nodes: [],
    links: [],
    rootId: null,
    expanded: {},
    tx: 0, ty: 0, scale: 1,
    draggingNode: null,
    panning: false,
    panStartX: 0, panStartY: 0,
    panStartTx: 0, panStartTy: 0,
    rafId: null,
    REPULSION: 900,
    REST_LENGTH: 55,
    SPRING_K: 0.05,
    GRAVITY: 0.025,
    DAMPING: 0.85
  };

  function renderGraph(activeId) {
    var svg = document.getElementById('graph-svg');
    if (!svg || !state.data) return;
    graphState.svg = svg;
    graphState.rootId = activeId;
    graphState.expanded = {};
    graphState.expanded[activeId] = true;

    svg.innerHTML = '';
    var vp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    vp.setAttribute('class', 'graph-viewport');
    svg.appendChild(vp);
    graphState.viewport = vp;

    var rect = svg.getBoundingClientRect();
    graphState.tx = rect.width / 2;
    graphState.ty = rect.height / 2;
    graphState.scale = 1;
    applyViewportTransform();

    buildGraphData();
    renderGraphElements();
    startGraphSimulation();
    bindGraphCanvas(svg);
  }

  function buildGraphData() {
    var nodesMap = {};
    var nodes = [];
    var links = [];

    function addNode(id, level, parentId) {
      if (nodesMap[id]) return nodesMap[id];
      var note = state.notesMap[id];
      if (!note) return null;
      var n = {
        id: id,
        title: note.title,
        related: note.related || [],
        level: level,
        x: 0, y: 0, vx: 0, vy: 0,
        fixed: false,
        el: null,
        r: level === 0 ? 10 : (level === 1 ? 5.5 : 4)
      };
      if (parentId && nodesMap[parentId]) {
        var p = nodesMap[parentId];
        var ang = Math.random() * Math.PI * 2;
        var dist = 30 + Math.random() * 20;
        n.x = p.x + Math.cos(ang) * dist;
        n.y = p.y + Math.sin(ang) * dist;
      } else if (level === 0) {
        n.x = 0; n.y = 0;
      }
      nodesMap[id] = n;
      nodes.push(n);
      return n;
    }

    function addLink(sId, tId) {
      var exists = links.some(function (l) {
        return (l.source === sId && l.target === tId) ||
               (l.source === tId && l.target === sId);
      });
      if (exists) return;
      links.push({ source: sId, target: tId, el: null });
    }

    addNode(graphState.rootId, 0, null);
    var queue = [graphState.rootId];
    var visited = {};
    visited[graphState.rootId] = true;

    while (queue.length > 0) {
      var curId = queue.shift();
      if (!graphState.expanded[curId]) continue;
      var curNode = nodesMap[curId];
      var note = state.notesMap[curId];
      if (!note || !curNode) continue;
      (note.related || []).forEach(function (rid) {
        if (rid === curId) return;
        if (!state.notesMap[rid]) return;
        var n = addNode(rid, curNode.level + 1, curId);
        if (n) {
          addLink(curId, rid);
          if (graphState.expanded[rid] && !visited[rid]) {
            visited[rid] = true;
            queue.push(rid);
          }
        }
      });
    }

    var oldMap = graphState.nodeMap || {};
    nodes.forEach(function (n) {
      if (oldMap[n.id]) {
        n.x = oldMap[n.id].x;
        n.y = oldMap[n.id].y;
        n.vx = oldMap[n.id].vx;
        n.vy = oldMap[n.id].vy;
      }
    });

    graphState.nodes = nodes;
    graphState.links = links;
    graphState.nodeMap = nodesMap;
  }

 function renderGraphElements() {
  var vp = graphState.viewport;
  if (!vp) return;
  while (vp.firstChild) vp.removeChild(vp.firstChild);

  // 边
  graphState.links.forEach(function (l) {
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'graph-edge');
    line.setAttribute('x1', 0); line.setAttribute('y1', 0);
    line.setAttribute('x2', 0); line.setAttribute('y2', 0);
    vp.appendChild(line);
    l.el = line;
  });

  // 节点
  graphState.nodes.forEach(function (n) {
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    var cls = 'graph-node';
    if (n.level === 0) cls += ' root';
    if (graphState.expanded[n.id]) cls += ' expanded';
    if (n.related.length > 0) cls += ' has-children';
    if (n.id === graphState.rootId) cls += ' active';
    g.setAttribute('class', cls);
    g.dataset.id = n.id;

    // 链接直接包裹 circle，让整圆成为可点区域
    var a = document.createElementNS('http://www.w3.org/2000/svg', 'a');
    var href = 'learn.html?note=' + encodeURIComponent(n.id);
    a.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
    a.setAttribute('href', href);
    a.setAttribute('target', '_self');

    // 关键：保证 <a> 内 circle 可点，且光标为 pointer
    a.style.cursor = 'pointer';

    // 阻止默认跳转，交给 JS 逻辑
    a.addEventListener('click', function (e) {
      // 中键 / Ctrl / Cmd 点击放行浏览器默认行为
      if (e.button === 1 || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
    });

    var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('r', n.r);
    // 透明填充也算可点区域，但这里已经有 fill，直接可点
    // 若节点小时不易点中，可加一个透明的点击热区（见下文可选）
    a.appendChild(c);

    // 标签放在 <a> 里，但 pointer-events:none（CSS 里已有）
    var label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('class', 'node-label');
    label.setAttribute('x', 0);
    label.setAttribute('y', n.r + 10);
    label.setAttribute('text-anchor', 'middle');
    label.textContent = n.title;
    a.appendChild(label);

    g.appendChild(a);

    bindNodeEvents(g, n);
    vp.appendChild(g);
    n.el = g;
  });
}

  function bindNodeEvents(g, n) {
  var clickTimer = null;

  g.addEventListener('mousedown', function (e) {
    e.stopPropagation();
    if (e.button !== 0) return;
    graphState.draggingNode = n;
    n.fixed = true;
    var pt = getGraphSVGPoint(e);
    n.x = pt.x; n.y = pt.y;
    n.vx = 0; n.vy = 0;
  });

  g.addEventListener('click', function (e) {
    e.stopPropagation();
    // 中键 / Ctrl / Cmd 点击：让浏览器默认行为（新窗口打开链接）
    if (e.button === 1 || e.ctrlKey || e.metaKey) {
      return;
    }
    // 普通左键：延迟判断是否双击
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      return;
    }
    clickTimer = setTimeout(function () {
      clickTimer = null;
      if (n.id !== graphState.rootId) openNote(n.id);
    }, 240);
  });

  g.addEventListener('dblclick', function (e) {
    e.stopPropagation();
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
    }
    toggleNodeExpanded(n.id);
  });

  /* ---------- 悬浮聚焦 ---------- */
  g.addEventListener('mouseenter', function () {
    focusGraphOn(n);
  });

  g.addEventListener('mouseleave', function () {
    clearGraphFocus();
  });
}

/* 悬浮某节点：其他节点和边变暗 */
function focusGraphOn(n) {
  var vp = graphState.viewport;
  if (!vp) return;

  vp.classList.add('has-hover');

  // 该节点标 hovered
  if (n.el) n.el.classList.add('hovered');

  // 找出与该节点相连的所有边
  graphState.links.forEach(function (l) {
    if (!l.el) return;
    var connected = (l.source === n.id || l.target === n.id);
    if (connected) {
      l.el.classList.add('hovered');
    }
    // 与它相邻的节点保持原样，其他通过 CSS 变暗
    var otherId = (l.source === n.id) ? l.target : (l.source === n.id ? l.target : null);
    if (connected && otherId) {
      var other = graphState.nodeMap[otherId];
      if (other && other.el) other.el.classList.add('hovered');
    }
  });

  // 根节点也视为 hovered（避免被压暗）
  var root = graphState.nodeMap[graphState.rootId];
  if (root && root.el) root.el.classList.add('hovered');
}

function clearGraphFocus() {
  var vp = graphState.viewport;
  if (!vp) return;
  vp.classList.remove('has-hover');
  graphState.nodes.forEach(function (n) {
    if (n.el) n.el.classList.remove('hovered');
  });
  graphState.links.forEach(function (l) {
    if (l.el) l.el.classList.remove('hovered');
  });
}

  function toggleNodeExpanded(id) {
    if (id === graphState.rootId) return;
    var note = state.notesMap[id];
    if (!note) return;
    if (!(note.related || []).length) return;

    if (graphState.expanded[id]) {
      delete graphState.expanded[id];
    } else {
      graphState.expanded[id] = true;
    }
    buildGraphData();
    renderGraphElements();
    wakeGraphSimulation();
  }

  function startGraphSimulation() {
    if (graphState.rafId) return;
    function step() {
      simulateGraph();
      renderGraphFrame();
      graphState.rafId = requestAnimationFrame(step);
    }
    graphState.rafId = requestAnimationFrame(step);
  }

  function wakeGraphSimulation() {
    graphState.nodes.forEach(function (n) {
      if (!n.fixed) {
        n.vx += (Math.random() - 0.5) * 0.6;
        n.vy += (Math.random() - 0.5) * 0.6;
      }
    });
  }

  function simulateGraph() {
    var nodes = graphState.nodes;
    var links = graphState.links;

    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = (Math.random() - 0.5) * 0.1;
          dy = (Math.random() - 0.5) * 0.1;
          d2 = dx * dx + dy * dy + 0.01;
        }
        var d = Math.sqrt(d2);
        var f = graphState.REPULSION / d2;
        var fx = (dx / d) * f;
        var fy = (dy / d) * f;
        if (!a.fixed) { a.vx -= fx; a.vy -= fy; }
        if (!b.fixed) { b.vx += fx; b.vy += fy; }
      }
    }

    links.forEach(function (l) {
      var a = graphState.nodeMap[l.source];
      var b = graphState.nodeMap[l.target];
      if (!a || !b) return;
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      var f = (d - graphState.REST_LENGTH) * graphState.SPRING_K;
      var fx = (dx / d) * f;
      var fy = (dy / d) * f;
      if (!a.fixed) { a.vx += fx; a.vy += fy; }
      if (!b.fixed) { b.vx -= fx; b.vy -= fy; }
    });

    nodes.forEach(function (n) {
      if (n.fixed) { n.vx = 0; n.vy = 0; return; }
      n.vx += (0 - n.x) * graphState.GRAVITY;
      n.vy += (0 - n.y) * graphState.GRAVITY;
      n.vx *= graphState.DAMPING;
      n.vy *= graphState.DAMPING;
      n.x += n.vx;
      n.y += n.vy;
    });
  }

  function renderGraphFrame() {
    graphState.nodes.forEach(function (n) {
      if (!n.el) return;
      n.el.setAttribute('transform',
        'translate(' + n.x.toFixed(2) + ',' + n.y.toFixed(2) + ')');
    });
    graphState.links.forEach(function (l) {
      if (!l.el) return;
      var a = graphState.nodeMap[l.source];
      var b = graphState.nodeMap[l.target];
      if (!a || !b) return;
      l.el.setAttribute('x1', a.x.toFixed(2));
      l.el.setAttribute('y1', a.y.toFixed(2));
      l.el.setAttribute('x2', b.x.toFixed(2));
      l.el.setAttribute('y2', b.y.toFixed(2));
    });
  }

  function getGraphSVGPoint(e) {
    var svg = graphState.svg;
    if (!svg) return { x: 0, y: 0 };
    var rect = svg.getBoundingClientRect();
    var sx = e.clientX - rect.left;
    var sy = e.clientY - rect.top;
    return {
      x: (sx - graphState.tx) / graphState.scale,
      y: (sy - graphState.ty) / graphState.scale
    };
  }

  function applyViewportTransform() {
    if (!graphState.viewport) return;
    graphState.viewport.setAttribute(
      'transform',
      'translate(' + graphState.tx + ',' + graphState.ty + ') scale(' + graphState.scale + ')'
    );
  }

  function bindGraphCanvas(svg) {
    if (svg._canvasBound) return;
    svg._canvasBound = true;

    document.addEventListener('mousemove', function (e) {
      if (graphState.draggingNode) {
        var pt = getGraphSVGPoint(e);
        graphState.draggingNode.x = pt.x;
        graphState.draggingNode.y = pt.y;
        graphState.draggingNode.vx = 0;
        graphState.draggingNode.vy = 0;
        return;
      }
      if (graphState.panning) {
        var dx = e.clientX - graphState.panStartX;
        var dy = e.clientY - graphState.panStartY;
        graphState.tx = graphState.panStartTx + dx;
        graphState.ty = graphState.panStartTy + dy;
        applyViewportTransform();
      }
    });

    document.addEventListener('mouseup', function () {
      if (graphState.draggingNode) {
        graphState.draggingNode.fixed = false;
        graphState.draggingNode = null;
      }
      graphState.panning = false;
    });

    svg.addEventListener('mousedown', function (e) {
      if (e.target === svg) {
        graphState.panning = true;
        graphState.panStartX = e.clientX;
        graphState.panStartY = e.clientY;
        graphState.panStartTx = graphState.tx;
        graphState.panStartTy = graphState.ty;
      }
    });

    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var rect = svg.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var lx = (mx - graphState.tx) / graphState.scale;
      var ly = (my - graphState.ty) / graphState.scale;
      var factor = e.deltaY > 0 ? 0.9 : 1.1;
      var newScale = graphState.scale * factor;
      if (newScale < 0.3 || newScale > 4) return;
      graphState.scale = newScale;
      graphState.tx = mx - lx * graphState.scale;
      graphState.ty = my - ly * graphState.scale;
      applyViewportTransform();
    }, { passive: false });

    svg.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        var t = e.touches[0];
        graphState.panning = true;
        graphState.panStartX = t.clientX;
        graphState.panStartY = t.clientY;
        graphState.panStartTx = graphState.tx;
        graphState.panStartTy = graphState.ty;
      }
    }, { passive: true });
    svg.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1 && graphState.panning) {
        var t = e.touches[0];
        graphState.tx = graphState.panStartTx + (t.clientX - graphState.panStartX);
        graphState.ty = graphState.panStartTy + (t.clientY - graphState.panStartY);
        applyViewportTransform();
        e.preventDefault();
      }
    }, { passive: false });
    svg.addEventListener('touchend', function () {
      graphState.panning = false;
    });
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

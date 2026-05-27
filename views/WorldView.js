/* ===== 世界观面板视图 ===== *
 * 管理：世界选项卡渲染、各类型卡片渲染、小型画布渲染
 */

/* ====== 世界选项卡 ====== */
function renderWorldTabs() {
    var el = document.getElementById('worldTabs');
    var order = Storage.get(pf() + 'worldTabOrder', worldTabOrder);
    activeWorldTab = Storage.get(pf() + 'activeWorldTab', 'characters');
    el.innerHTML = '<span style="font-size:10px;padding:10px 4px;color:var(--text2);flex-shrink:0;">设定集</span>' +
        order.map(function(k) {
            var m = worldTabMeta[k];
            if (!m) return '';
            return '<button draggable="true" class="' + (k === activeWorldTab ? 'active' : '') + '" ondragstart="tabDragStart(event,\'' + k + '\')" ondragover="tabDragOver(event)" ondragleave="tabDragLeave(event)" ondrop="tabDragDrop(event,\'' + k + '\')" onclick="switchWorldTab(\'' + k + '\',this)">' + m.icon + m.label + '</button>';
        }).join('');
    switchWorldTab(activeWorldTab, null);
}

function switchWorldTab(name, btn) {
    activeWorldTab = name;
    Storage.set(pf() + 'activeWorldTab', name);
    if (btn) {
        document.querySelectorAll('.world-tabs button').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
    }
    var order = Storage.get(pf() + 'worldTabOrder', worldTabOrder);
    order.forEach(function(t) {
        document.getElementById('tab-' + t).classList.toggle('hidden', t !== name);
    });
}

function tabDragStart(e, k) { dragTab = k; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', k); }
function tabDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function tabDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function tabDragDrop(e, k) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!dragTab || dragTab === k) return;
    var order = (Storage.get(pf() + 'worldTabOrder', null) || worldTabOrder).slice();
    var fi = order.indexOf(dragTab), ti = order.indexOf(k);
    if (fi < 0 || ti < 0) return;
    order.splice(fi, 1);
    order.splice(ti, 0, dragTab);
    Storage.set(pf() + 'worldTabOrder', order);
    renderWorldTabs();
    dragTab = null;
}

/* ====== 卡片 HTML 生成 ====== */
function cardHtml(item, type) {
    var id = item.id;
    if (!item.content) {
        var fm = {
            char: ['age', 'gender', 'personality', 'appearance', 'background'],
            loc: ['type', 'description', 'significance'],
            set: ['category', 'description'],
            tl: ['era', 'description'],
            outline: ['content']
        };
        var ks = fm[type] || [], pts = [];
        ks.forEach(function(k) { if (item[k] && k !== 'content') pts.push(item[k]); });
        if (pts.length) { item.content = pts.join('\n\n'); saveWorld(); }
        else { item.content = item.content || ''; }
    }
    var wc = countCardWords(item), v = esc(plainText(item.content));
    return '<div class="card" id="card-' + id + '" draggable="true" ondblclick="openCardEditor(\'' + type + '\',\'' + id + '\')" oncontextmenu="event.preventDefault();showCtxMenu(event,\'' + type + '\',\'' + id + '\')" ondragstart="dragWStart(event,\'' + type + '\',\'' + id + '\')" ondragover="dragWOver(event)" ondragleave="dragWLeave(event)" ondrop="dragWDrop(event,\'' + type + '\',\'' + id + '\')"><div class="card-header" onclick="toggleCard(\'' + id + '\')"><div><h3>' + esc(item.name || item.event || item.title || '未命名') + '</h3></div><span class="wc">' + wc + '字</span></div><div class="card-body"><div contenteditable="true" class="ce-field" style="min-height:60px;" oninput="updateCardField(\'' + type + '\',\'' + id + '\',\'content\',this.innerHTML)">' + v + '</div></div></div>';
}

function toggleCard(id) { document.getElementById('card-' + id).classList.toggle('open'); }

/* ====== 人物渲染 ====== */
function renderChars() {
    document.getElementById('charList').innerHTML = world.chars.length === 0
        ? '<div style="text-align:center;padding:16px;color:var(--text2);">还没有人物</div>'
        : world.chars.sort(function(a, b) { return (a.order || 0) - (b.order || 0); })
            .map(function(c) { return cardHtml(c, 'char'); }).join('');
}

/* ====== 地点渲染 ====== */
function renderLocs() {
    document.getElementById('locList').innerHTML = world.locs.length === 0
        ? '<div style="text-align:center;padding:16px;color:var(--text2);">还没有地点</div>'
        : world.locs.sort(function(a, b) { return (a.order || 0) - (b.order || 0); })
            .map(function(l) { return cardHtml(l, 'loc'); }).join('');
}

/* ====== 设定渲染 ====== */
function renderSets() {
    document.getElementById('setList').innerHTML = world.sets.length === 0
        ? '<div style="text-align:center;padding:16px;color:var(--text2);">还没有设定</div>'
        : world.sets.sort(function(a, b) { return (a.order || 0) - (b.order || 0); })
            .map(function(s) { return cardHtml(s, 'set'); }).join('');
}

/* ====== 时间线渲染 ====== */
function renderTimeline() {
    var items = world.tl.slice();
    var hasNum = items.filter(function(t) { return t.sortNum !== '' && t.sortNum != null; })
        .sort(function(a, b) { return (parseInt(a.sortNum) || 0) - (parseInt(b.sortNum) || 0); });
    var noNum = items.filter(function(t) { return t.sortNum === '' || t.sortNum == null; })
        .sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    var all = hasNum.concat(noNum);
    if (all.length === 0) {
        document.getElementById('tlList').innerHTML = '<div style="text-align:center;padding:16px;color:var(--text2);">还没有事件</div>';
        return;
    }
    var html = '', sep = false;
    all.forEach(function(t) {
        if (!sep && (t.sortNum === '' || t.sortNum == null) && hasNum.length > 0) {
            html += '<div class="tl-sep"></div>';
            sep = true;
        }
        html += cardHtml(t, 'tl');
    });
    document.getElementById('tlList').innerHTML = html;
}

/* ====== 大纲渲染 ====== */
function renderOutline() {
    var s = world.outline.slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    var lv = { 1: '卷', 2: '章', 3: '节' };
    document.getElementById('outlineTree').innerHTML = s.length === 0
        ? '<div style="text-align:center;padding:16px;color:var(--text2);">还没有大纲</div>'
        : s.map(function(o) {
            return '<div class="outline-node" style="padding-left:' + (o.level * 16) + 'px" draggable="true" ondblclick="openCardEditor(\'outline\',\'' + o.id + '\')" oncontextmenu="event.preventDefault();showCtxMenu(event,\'outline\',\'' + o.id + '\',\'title\')" ondragstart="dragWStart(event,\'outline\',\'' + o.id + '\')" ondragover="dragWOver(event)" ondragleave="dragWLeave(event)" ondrop="dragWDrop(event,\'outline\',\'' + o.id + '\')">📋 ' + esc(o.title) + ' <span style="font-size:10px;color:var(--text2);">' + lv[o.level] + '</span></div>';
        }).join('');
}

/* ====== 大纲表格构建 ====== */
function buildOT(id) {
    return '<label style="margin-top:12px;">📊 大纲表格 <span style="font-size:10px;color:var(--text2);">（拖拽选中，右键操作，双击编辑，调列宽/行高）</span></label><div class="otable-wrap" id="otw-' + id + '" oncontextmenu="showTCtxMenu(event,\'' + id + '\')" onpaste="onTPaste(event,\'' + id + '\')">' + buildOTi(id) + '</div>';
}

function buildOTi(id) {
    var it = world.outline.find(function(x) { return x.id === id });
    if (!it) return '<table class="otable" id="ot-' + id + '"><tbody><tr><td style="text-align:center;padding:20px;color:var(--text2);">空</td></tr></tbody></table>';
    var t = initOT(it), R = t.rows.length, C = t.colW.length;
    function sl(r, c) {
        var f = false;
        _tSels.forEach(function(s) {
            if (s.id === id && r >= Math.min(s.r1, s.r2) && r <= Math.max(s.r1, s.r2) && c >= Math.min(s.c1, s.c2) && c <= Math.max(s.c1, s.c2)) f = true;
        });
        return f;
    }
    var h = '<table class="otable" id="ot-' + id + '"><thead><tr><th class="ocn"></th>';
    for (var c = 0; c < C; c++)
        h += '<th class="ohd" style="width:' + (t.colW[c] || 120) + 'px;" data-col="' + c + '" onclick="selTC(\'' + id + '\',' + c + ');">' + String.fromCharCode(65 + c) + '<div class="orc" onmousedown="sCR(event,\'' + id + '\',' + c + ');" ondblclick="aFC(\'' + id + '\',' + c + ');"></div></th>';
    h += '</tr></thead><tbody>';
    for (var r = 0; r < R; r++) {
        h += '<tr><td class="orh" style="height:' + (t.rowH[r] || 32) + 'px;" data-row="' + r + '" onclick="selTR(\'' + id + '\',' + r + ');">' + (r + 1) + '<div class="orr" onmousedown="sRR(event,\'' + id + '\',' + r + ');" ondblclick="aFR(\'' + id + '\',' + r + ');"></div></td>';
        for (var c = 0; c < C; c++) {
            if (cov(id, r, c)) continue;
            var s = gSpan(id, r, c), v = (t.rows[r] || [])[c] || "";
            h += '<td class="ocell' + (sl(r, c) ? ' osel' : '') + '" data-r="' + r + '" data-c="' + c + '"' +
                (s ? ' colspan="' + s.c + '" rowspan="' + s.r + '"' : '') +
                ' ondblclick="edTC(\'' + id + '\',' + r + ',' + c + ');" onmousedown="tMD(\'' + id + '\',' + r + ',' + c + ',event);">' + v + '</td>';
        }
        h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
}

function rerOT(id) {
    var el = document.getElementById('otw-' + id);
    if (el) el.innerHTML = buildOTi(id);
}

/* ====== 画布卡片渲染（世界面板中的小画布） ====== */
function renderCanvas() {
    var el = document.getElementById('canvasList');
    if (!el) return;
    if (!world.canvas.length) {
        el.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text2);">还没有架构图</div>';
        return;
    }
    el.innerHTML = world.canvas.slice().sort(function(a,b) { return (a.order||0)-(b.order||0); })
        .map(function(c) { return canvasCardHtml(c); }).join('');
}

function canvasCardHtml(c) {
    var icon = '🕸', name = esc(c.name || '未命名');
    var wc = (c.nodes||[]).length + '节点' + ((c.edges||[]).length ? ' ' + c.edges.length + '线' : '');
    return '<div class="canvas-card" id="cc-' + c.id + '" ondblclick="openCanvasOverlay(\'' + c.id + '\')" oncontextmenu="event.preventDefault();event.stopPropagation();canvasRename(\'' + c.id + '\')"><div class="canvas-card-header" style="cursor:pointer;"><span>' + icon + '</span><span class="cc-name">' + name + '</span><span style="font-size:10px;color:var(--text2);margin-right:8px;">' + wc + '</span><span style="font-size:10px;">▶</span></div></div>';
}

function renderMiniCanvas(cid) {
    var container = document.getElementById('cm-' + cid);
    if (!container) return;
    var c = world.canvas.find(function(x) { return x.id === cid });
    if (!c) return;
    var ns = c.nodes || [], es = c.edges || [];
    if (!ns.length) {
        container.innerHTML = '<div class="cn-empty">🕸 点击「导入卡片」添加节点</div>';
        return;
    }
    var ctx = gCtx(cid);

    var svgLines = es.map(function(e) {
        var sn = findCN(cid, e.source), tn = findCN(cid, e.target);
        if (!sn || !tn) return '';
        var sx = sn.x + sn.w/2, sy = sn.y + 14, tx = tn.x + tn.w/2, ty = tn.y + 14;
        return '<line x1="' + sx + '" y1="' + sy + '" x2="' + tx + '" y2="' + ty + '" stroke="var(--border)" stroke-width="2" onclick="if(gCtx(\'' + cid + '\').lineMode)canvasDelEdgeOp(\'' + cid + '\',\'' + e.id + '\')" ondblclick="canvasEdgeLabel(\'' + cid + '\',\'' + e.id + '\')"/><circle cx="' + tx + '" cy="' + ty + '" r="3" fill="var(--accent)" pointer-events="none"/>';
    }).join('');
    container.innerHTML = '<svg>' + svgLines + '</svg>';

    var existingLabels = container.querySelectorAll('.cn-edge-label');
    for (var i = 0; i < existingLabels.length; i++) existingLabels[i].remove();
    es.forEach(function(e) {
        var sn = findCN(cid, e.source), tn = findCN(cid, e.target);
        if (!sn || !tn || !e.label) return;
        var sx = sn.x + sn.w/2, tx = tn.x + tn.w/2;
        var lbl = document.createElement('div');
        lbl.className = 'cn-edge-label';
        lbl.textContent = e.label;
        lbl.style.left = ((sx+tx)/2) + 'px';
        lbl.style.top = (sn.y + tn.y)/2 + 'px';
        lbl.onclick = function() { canvasEdgeLabel(cid, e.id); };
        container.appendChild(lbl);
    });

    var drawn = {};
    ns.forEach(function(n) {
        if (drawn[n.id]) return;
        drawn[n.id] = true;
        var item = findWorldItem(n.type, n.refId);
        var name = item ? (item.name || item.event || item.title || '?') : '?';
        var icon = worldIcon(n.type);
        var preview = '';
        if (item && item.content) {
            var d = document.createElement('div');
            d.innerHTML = item.content;
            var txt = (d.innerText || d.textContent || '').trim().slice(0, 40);
            if (txt) preview = esc(txt);
        }
        var el = document.createElement('div');
        el.className = 'cn-node' + (ctx.sel === n.id ? ' selected' : '') + (n._open ? ' open' : '');
        el.id = 'ccn-' + n.id;
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
        el.style.width = (n.w || 130) + 'px';
        el.innerHTML = '<div class="cnh"><span>' + icon + ' ' + esc(name) + '</span><span class="cn-toggle" onclick="event.stopPropagation();cnToggle(\'' + cid + '\',\'' + n.id + '\')">' + (n._open ? '🔼' : '🔽') + '</span></div><div class="cnb">' + (preview || '<span style="opacity:.4;">空</span>') + '</div>';

        el.onmousedown = function(e) {
            if (e.target.closest('.cn-del') || e.target.closest('.cnb') || e.target.closest('.cn-toggle')) return;
            var ctx2 = gCtx(cid);
            if (ctx2.lineMode) {
                if (!ctx2.sel) { ctx2.sel = n.id; renderMiniCanvas(cid); }
                else if (ctx2.sel !== n.id) { canvasConnect(cid, ctx2.sel, n.id); ctx2.sel = null; }
                return;
            }
            ctx2.sel = n.id;
            renderMiniCanvas(cid);
            ctx2.drag = n.id;
            var r = el.getBoundingClientRect();
            ctx2.offX = e.clientX - r.left;
            ctx2.offY = e.clientY - r.top;
            el.classList.add('dragging');
            e.preventDefault();
        };
        el.ondblclick = function(e) {
            if (e.target.closest('.cn-del') || e.target.closest('.cnb')) return;
            openCardEditor(n.type, n.refId);
        };

        var del = document.createElement('span');
        del.className = 'cn-del';
        del.textContent = '✕';
        del.onclick = function(e) { e.stopPropagation(); canvasDelNode(cid, n.id); };
        el.appendChild(del);
        container.appendChild(el);
    });

    container.onmousemove = function(e) { canvasMouseMove(cid, e); };
    container.onmouseup = function() { canvasMouseUp(cid); };
}

function canvasMouseMove(cid, e) {
    var ctx = gCtx(cid);
    if (!ctx.drag) return;
    var c = world.canvas.find(function(x) { return x.id === cid });
    if (!c) return;
    var ns = c.nodes || [];
    for (var i = 0; i < ns.length; i++) {
        if (ns[i].id === ctx.drag) {
            var el = document.getElementById('ccn-' + ctx.drag);
            var cr = el.parentNode.getBoundingClientRect();
            ns[i].x = Math.max(0, e.clientX - ctx.offX - cr.left);
            ns[i].y = Math.max(0, e.clientY - ctx.offY - cr.top);
            el.style.left = ns[i].x + 'px';
            el.style.top = ns[i].y + 'px';
            return;
        }
    }
}

function canvasMouseUp(cid) {
    var ctx = gCtx(cid);
    ctx.drag = null;
    var els = document.querySelectorAll('.cn-node.dragging');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('dragging');
}

/* ====== 世界数据视图操作（由 WorldService 事件驱动） ====== */

/** 添加大纲（从 DOM 读取层级） */
function addOutlineItem() {
    var lv = parseInt(document.getElementById('outlineLevel').value) || 1;
    addOutline(lv);
}

/** 渲染所有世界选项卡 */
function renderAllWorld() {
    renderWorldTabs();
    renderChars();
    renderLocs();
    renderSets();
    renderTimeline();
    renderOutline();
    renderCanvas();
}

/** 拖拽排序处理 */
function dragWStart(e, type, id) {
    dWType = type;
    dWId = id;
    e.dataTransfer.effectAllowed = 'move';
    if (document.getElementById('aiFloat').classList.contains('show'))
        e.dataTransfer.setData('text/plain', type + ':' + id);
}
function dragWOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function dragWLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function dragWDrop(e, type, targetId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!dWType || !dWId || (dWType === type && dWId === targetId)) {
        dWType = null; dWId = null; return;
    }
    if (dWType !== type) { dWType = null; dWId = null; return; }
    reorderWorldItems(type, dWId, targetId);
    dWType = null; dWId = null;
}

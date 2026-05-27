/* ===== 画布覆盖层视图 ===== *
 * 管理：画布覆盖层、节点渲染、边渲染、缩放/平移
 */

/* ====== 自动逻辑连线模式状态 ====== */
var _coAutoLogic = false;

/* ====== 覆盖层控制 ====== */
function openCanvasOverlay(cid) {
    var c = world.canvas.find(function(x) { return x.id === cid });
    if (!c) return;
    _overlayCid = cid;
    _coPanX = 0; _coPanY = 0; _coZoom = 1;
    applyCoTransform();
    document.getElementById('canvasOverlayName').textContent = '🕸 ' + (c.name || '架构图');
    document.getElementById('canvasOverlay').style.display = 'flex';
    renderOverlayCanvas();
    var ctx = gCtx(cid);
    document.getElementById('coLineBtn').textContent = ctx.lineMode ? '✅ 连线中' : '✏ 连线';
    document.getElementById('coLineBtn').className = 'btn btn-sm' + (ctx.lineMode ? ' accent' : '');
    var autoBtn = document.getElementById('coAutoLogicBtn');
    if (autoBtn) {
        autoBtn.textContent = _coAutoLogic ? '✅ 逻辑' : '🤖 逻辑';
        autoBtn.className = 'btn btn-sm' + (_coAutoLogic ? ' accent' : '');
    }
}

function closeCanvasOverlay() {
    document.getElementById('canvasOverlay').style.display = 'none';
    _overlayCid = null;
}

/* ====== 画布操作视图包装（UI + 服务层调用） ====== */

/** 添加节点：打开多选器 → 委托服务层添加 */
function canvasAddNode(cid) {
    openMultiPicker(function(selected) {
        canvasAddNodeOp(cid, selected);
    });
}

/** 连线：委托服务层连接 → 提示输入关系描述 */
function canvasConnect(cid, sid, tid) {
    var eid = canvasConnectOp(cid, sid, tid);
    if (eid) {
        showPrompt('关系描述', '', function(v) {
            if (v) canvasEdgeLabelOp(cid, eid, v);
        });
    }
}

/** 编辑边标签：提示输入 → 委托服务层 */
function canvasEdgeLabel(cid, eid) {
    var c = world.canvas.find(function(x) { return x.id === cid });
    if (!c) return;
    var e = (c.edges||[]).find(function(x) { return x.id === eid });
    if (!e) return;
    showPrompt('关系描述', e.label || '', function(v) {
        if (v === undefined) return;
        canvasEdgeLabelOp(cid, eid, v);
    });
}

/** 删除确认 → 委托服务层 */
function canvasDelBtn(id) {
    showConfirm('删除此架构图？', '删除', function(ok) { if (ok) delCanvas(id); });
}

/** 切换连线模式（视图负责按钮状态） */
function canvasToggleLine(cid) {
    var ctx = gCtx(cid);
    var newMode = !ctx.lineMode;
    // 更新按钮文本（DOM 操作在视图层）
    var btn = document.getElementById('coLineBtn');
    if (btn) btn.textContent = newMode ? '✅ 连线中' : '✏ 连线';
    canvasToggleLineOp(cid, newMode);
}

function applyCoTransform() {
    var w = document.getElementById('canvasOverlayWorld');
    if (w) w.style.transform = 'translate(' + _coPanX + 'px,' + _coPanY + 'px) scale(' + _coZoom + ')';
}

/* ====== 覆盖层渲染 ====== */
function renderOverlayCanvas() {
    var cid = _overlayCid;
    if (!cid) return;
    var worldEl = document.getElementById('canvasOverlayWorld');
    if (!worldEl) return;
    var c = world.canvas.find(function(x) { return x.id === cid });
    if (!c) return;
    var ns = c.nodes || [], es = c.edges || [], ctx = gCtx(cid);

    /* SVG 连线 */
    var svgLines = es.map(function(e) {
        var sn = findCN(cid, e.source), tn = findCN(cid, e.target);
        if (!sn || !tn) return '';
        var sx = sn.x + sn.w/2, sy = sn.y + 14;
        var tx = tn.x + tn.w/2, ty = tn.y + 14;
        return '<line data-eid="' + e.id + '" x1="' + sx + '" y1="' + sy + '" x2="' + tx + '" y2="' + ty + '" stroke="var(--text2)" stroke-width="2" onclick="coEdgeClick(\'' + e.id + '\')" ondblclick="coEdgeLabel(\'' + e.id + '\')" oncontextmenu="coEdgeCtx(event,\'' + e.id + '\')"/><circle data-eid="' + e.id + '-dot" cx="' + tx + '" cy="' + ty + '" r="3" fill="var(--accent)" pointer-events="none"/>';
    }).join('');
    /* 自动逻辑连线（临时虚线） */
    if (_coAutoLogic) {
        var autoLines = coBuildAutoLogic(c);
        autoLines.forEach(function(al) {
            var sn = findCN(c.id, al.source), tn = findCN(c.id, al.target);
            if (!sn || !tn) return;
            var sx = sn.x + sn.w/2, sy = sn.y + 14;
            var tx = tn.x + tn.w/2, ty = tn.y + 14;
            svgLines += '<line class="co-auto-line ' + al.type + '" x1="' + sx + '" y1="' + sy + '" x2="' + tx + '" y2="' + ty + '" stroke="' + al.color + '" stroke-width="2" stroke-dasharray="6,3" pointer-events="none"/>';
        });
    }

    worldEl.innerHTML = '<svg>' + svgLines + '</svg>';

    /* 边的文字标签 */
    es.forEach(function(e) {
        var sn = findCN(cid, e.source), tn = findCN(cid, e.target);
        if (!sn || !tn || !e.label) return;
        var lbl = document.createElement('div');
        lbl.className = 'cn-edge-label';
        lbl.setAttribute('data-eid', e.id);
        lbl.textContent = e.label;
        lbl.style.left = ((sn.x + sn.w/2 + tn.x + tn.w/2)/2) + 'px';
        lbl.style.top = (sn.y + tn.y)/2 + 'px';
        lbl.onclick = function() { coEdgeLabel(e.id); };
        worldEl.appendChild(lbl);
    });

    /* 节点 */
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
            var txt = (d.innerText || d.textContent || '').trim().slice(0, 60);
            if (txt) preview = esc(txt);
        }
        var el = document.createElement('div');
        el.className = 'cn-node' + (ctx.sels.indexOf(n.id) !== -1 ? ' selected' : '') + (n._open ? ' open' : '');
        el.id = 'con-' + n.id;
        el.style.left = n.x + 'px';
        el.style.top = n.y + 'px';
        el.style.width = (n.w || 130) + 'px';
        el.innerHTML = '<div class="cnh"><span>' + icon + ' ' + esc(name) + '</span><span class="cn-toggle" onclick="event.stopPropagation();coNodeToggle(\'' + n.id + '\')">' + (n._open ? '🔼' : '🔽') + '</span></div><div class="cnb">' + (preview || '<span style="opacity:.4;">空</span>') + '</div>';

        el.onmousedown = function(e) {
            if (e.button !== 0) return;
            if (e.target.closest('.cn-toggle')) return;
            if (ctx.lineMode) {
                if (!ctx.sels.length) { ctx.sels = [n.id]; renderOverlayCanvas(); }
                else if (ctx.sels.indexOf(n.id) === -1) {
                    canvasConnect(cid, ctx.sels[ctx.sels.length-1], n.id);
                    ctx.sels = []; renderOverlayCanvas();
                }
                return;
            }
            if (e.ctrlKey || e.metaKey) {
                var _si = ctx.sels.indexOf(n.id);
                if (_si !== -1) ctx.sels.splice(_si, 1);
                else ctx.sels.push(n.id);
                renderOverlayCanvas();
                e.preventDefault();
                return;
            }
            /* 单击选中 */
            if (!(ctx.sels.length === 1 && ctx.sels[0] === n.id)) {
                ctx.sels = [n.id]; renderOverlayCanvas();
            }
            /* 长按拖拽准备 */
            var _ox = (e.clientX-_coPanX)/_coZoom - n.x;
            var _oy = (e.clientY-_coPanY)/_coZoom - n.y;
            ctx._dragPrep = {
                id: n.id, ox: _ox, oy: _oy,
                mx: e.clientX, my: e.clientY, armed: false,
                timer: setTimeout(function(){if(ctx._dragPrep)ctx._dragPrep.armed=true}, 200)
            };
            e.preventDefault();
        };

        el.oncontextmenu = function(e) {
            e.preventDefault(); e.stopPropagation();
            if (ctx.sels.indexOf(n.id) === -1) { ctx.sels = [n.id]; renderOverlayCanvas(); }
            showCanvasNodeMenu(e.clientX, e.clientY);
        };

        el.ondblclick = function(e) {
            if (e.target.closest('.cnb') || e.target.closest('.cn-toggle')) return;
            openCardEditor(n.type, n.refId);
        };

        worldEl.appendChild(el);
    });
}

/* ====== 覆盖层鼠标事件 ====== */
function coStageMouseDown(e) {
    if (!_overlayCid) return;
    var ctx = gCtx(_overlayCid);
    if (ctx.drag) {
        if (ctx._dragPrep) { clearTimeout(ctx._dragPrep.timer); ctx._dragPrep = null; }
        return;
    }
    if (e.target.closest('.cn-node') || e.target.closest('.cn-edge-label')) return;
    if (e.button === 1) {
        /* 中键平移 */
        _coPanning = true;
        _coPanStartX = e.clientX - _coPanX;
        _coPanStartY = e.clientY - _coPanY;
        _coStageRect = document.getElementById('canvasOverlayStage').getBoundingClientRect();
        e.preventDefault();
    } else if (e.button === 0) {
        /* 点击空白取消选中 */
        ctx.sels = [];
        if (ctx._dragPrep) { clearTimeout(ctx._dragPrep.timer); ctx._dragPrep = null; }
        renderOverlayCanvas();
    }
}

function coStageMouseMove(e) {
    if (!_overlayCid) return;
    var ctx = gCtx(_overlayCid);

    /* 处理活跃拖拽 */
    if (ctx.drag) {
        var c = world.canvas.find(function(x) { return x.id === _overlayCid });
        if (!c) return;
        var ns = c.nodes || [];
        for (var i = 0; i < ns.length; i++) {
            if (ns[i].id === ctx.drag) {
                ns[i].x = (e.clientX - _coPanX) / _coZoom - ctx.offX;
                ns[i].y = (e.clientY - _coPanY) / _coZoom - ctx.offY;
                var el = document.getElementById('con-' + ctx.drag);
                if (el) { el.style.left = ns[i].x + 'px'; el.style.top = ns[i].y + 'px'; }
                /* 更新与该节点相连的所有连线 */
                coUpdateEdgeLines(c, ctx.drag);
                return;
            }
        }
    }

    /* 处理长按拖拽准备 */
    if (ctx._dragPrep) {
        if (ctx._dragPrep.armed) {
            var dx = e.clientX - ctx._dragPrep.mx, dy = e.clientY - ctx._dragPrep.my;
            if (dx*dx+dy*dy > 25) {
                ctx.drag = ctx._dragPrep.id;
                ctx.offX = ctx._dragPrep.ox;
                ctx.offY = ctx._dragPrep.oy;
                clearTimeout(ctx._dragPrep.timer);
                ctx._dragPrep = null;
                var el2 = document.getElementById('con-' + ctx.drag);
                if (el2) el2.classList.add('dragging');
                var c2 = world.canvas.find(function(x){return x.id===_overlayCid});
                if(c2){
                    var n2=(c2.nodes||[]).find(function(x){return x.id===ctx.drag});
                    if(n2){
                        n2.x=(e.clientX-_coPanX)/_coZoom-ctx.offX;
                        n2.y=(e.clientY-_coPanY)/_coZoom-ctx.offY;
                        if(el2){el2.style.left=n2.x+'px';el2.style.top=n2.y+'px';}
                    }
                    coUpdateEdgeLines(c2, ctx.drag);
                }
            }
        }
    }

    /* 中键平移 */
    if (_coPanning) {
        _coPanX = e.clientX - _coPanStartX;
        _coPanY = e.clientY - _coPanStartY;
        applyCoTransform();
    }
}

/* 拖拽时实时更新连线位置 */
function coUpdateEdgeLines(c, draggedId) {
    var es = c.edges || [];
    es.forEach(function(e) {
        if (e.source !== draggedId && e.target !== draggedId) return;
        var sn = findCN(c.id, e.source), tn = findCN(c.id, e.target);
        if (!sn || !tn) return;
        var sx = sn.x + sn.w/2, sy = sn.y + 14;
        var tx = tn.x + tn.w/2, ty = tn.y + 14;
        var line = document.querySelector('#canvasOverlayWorld svg line[data-eid="' + e.id + '"]');
        if (line) { line.setAttribute('x1', sx); line.setAttribute('y1', sy); line.setAttribute('x2', tx); line.setAttribute('y2', ty); }
        var dot = document.querySelector('#canvasOverlayWorld svg circle[data-eid="' + e.id + '-dot"]');
        if (dot) { dot.setAttribute('cx', tx); dot.setAttribute('cy', ty); }
        /* 更新连线标签位置 */
        var lbl = document.querySelector('#canvasOverlayWorld .cn-edge-label[data-eid="' + e.id + '"]');
        if (lbl) {
            lbl.style.left = ((sn.x + sn.w/2 + tn.x + tn.w/2)/2) + 'px';
            lbl.style.top = (sn.y + tn.y)/2 + 'px';
        }
    });

    /* 拖拽时同时更新自动逻辑连线 */
    if (_coAutoLogic) coUpdateAutoLines(c);
}

function coStageMouseUp() {
    if (_overlayCid) {
        var ctx = gCtx(_overlayCid);
        if (ctx._dragPrep) { clearTimeout(ctx._dragPrep.timer); ctx._dragPrep = null; }
        if (ctx.drag) saveWorld();
        ctx.drag = null;
    }
    _coPanning = false;
    var els = document.querySelectorAll('.canvas-overlay-world .cn-node.dragging');
    for (var i = 0; i < els.length; i++) els[i].classList.remove('dragging');
}

/* ====== 覆盖层操作按钮 ====== */
function coNodeToggle(nid) {
    if (!_overlayCid) return;
    var c = world.canvas.find(function(x) { return x.id === _overlayCid });
    if (!c) return;
    var n = (c.nodes||[]).find(function(x) { return x.id === nid });
    if (n) { n._open = !n._open; renderOverlayCanvas(); }
}

function coAddNode() {
    var cid = _overlayCid;
    if (!cid) return;
    openMultiPicker(function(selected) {
        canvasAddNodeOp(cid, selected);
    });
}

function coToggleLine() {
    canvasToggleLine(_overlayCid);
}

function coEdgeClick(eid) {
    if (!_overlayCid) return;
    var ctx = gCtx(_overlayCid);
    if (!ctx.lineMode) return;
    canvasDelEdgeOp(_overlayCid, eid);
    renderOverlayCanvas();
}

function coEdgeLabel(eid) {
    if (!_overlayCid) return;
    var c = world.canvas.find(function(x) { return x.id === _overlayCid });
    if (!c) return;
    var e = (c.edges||[]).find(function(x) { return x.id === eid });
    if (!e) return;
    showPrompt('关系描述', e.label || '', function(v) {
        if (v === undefined) return;
        e.label = v;
        saveWorld();
        renderOverlayCanvas();
    });
}

function coFitView() {
    if (!_overlayCid) return;
    var c = world.canvas.find(function(x) { return x.id === _overlayCid });
    if (!c || !c.nodes || !c.nodes.length) return;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    c.nodes.forEach(function(n) {
        var w = n.w || 140, h = 80;
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x + w > maxX) maxX = n.x + w;
        if (n.y + h > maxY) maxY = n.y + h;
    });
    var stage = document.getElementById('canvasOverlayStage');
    var sw = stage.offsetWidth, sh = stage.offsetHeight;
    _coZoom = 1;
    _coPanX = sw/2 - (minX + maxX)/2;
    _coPanY = sh/2 - (minY + maxY)/2;
    applyCoTransform();
    renderOverlayCanvas();
}

function coStageWheel(e) {
    if (!_overlayCid) return;
    e.preventDefault();
    var delta = -e.deltaY;
    var factor = 1 + delta * 0.001;
    var newZoom = Math.max(0.2, Math.min(5, _coZoom * factor));
    if (newZoom === _coZoom) return;
    var stage = document.getElementById('canvasOverlayStage');
    var sr = stage.getBoundingClientRect();
    var relX = e.clientX - sr.left, relY = e.clientY - sr.top;
    var worldX = (relX - _coPanX) / _coZoom, worldY = (relY - _coPanY) / _coZoom;
    _coZoom = newZoom;
    _coPanX = relX - worldX * _coZoom;
    _coPanY = relY - worldY * _coZoom;
    applyCoTransform();
    renderOverlayCanvas();
}

/* ====== 覆盖层右键菜单 ====== */
function showCanvasNodeMenu(x, y) {
    hideCanvasNodeMenu();
    var cid = _overlayCid;
    if (!cid) return;
    var ctx = gCtx(cid);
    var sels = ctx.sels || [];
    if (!sels.length) return;
    var cnt = sels.length;
    var items = [];
    if (cnt >= 2) items.push({ l:'🔗 连接选中 ('+cnt+' 个节点)', a:"coMenuConnect()" });
    if (cnt >= 1) {
        items.push({ l:'✏ 重命名', a:"coMenuRename()" });
        items.push({ l:'🗑 删除选中 ('+cnt+' 个节点)', a:"coMenuDelete()", d:1 });
    }
    items.push({ l:'取消', a:"hideCanvasNodeMenu()" });
    var m = document.createElement('div');
    m.id = 'coNodeMenu';
    m.style.cssText = 'position:fixed;left:'+x+'px;top:'+y+'px;z-index:1001;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.2);padding:4px 0;min-width:140px;';
    m.innerHTML = items.map(function(it){
        return '<div style="padding:6px 16px;cursor:pointer;font-size:13px;'+(it.d?'color:var(--accent);':'color:var(--text);')+'" onmouseover="this.style.background=\'var(--hover)\'" onmouseout="this.style.background=\'\'" onclick="'+it.a+'">'+it.l+'</div>';
    }).join('');
    document.body.appendChild(m);
    var bd = document.createElement('div');
    bd.id = 'coMenuBd';
    bd.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:1000;';
    bd.onclick = function(){hideCanvasNodeMenu()};
    document.body.appendChild(bd);
}

function hideCanvasNodeMenu() {
    var m = document.getElementById('coNodeMenu');
    if(m)m.remove();
    var b = document.getElementById('coMenuBd');
    if(b)b.remove();
    var em = document.getElementById('coEdgeMenu');
    if(em)em.remove();
    var eb = document.getElementById('coEdgeMenuBd');
    if(eb)eb.remove();
}

function coMenuConnect() {
    hideCanvasNodeMenu();
    if (!_overlayCid) return;
    var ctx = gCtx(_overlayCid), sels = (ctx.sels||[]).slice();
    if (sels.length < 2) return;
    for (var i = 0; i < sels.length-1; i++) canvasConnect(_overlayCid, sels[i], sels[i+1]);
}

function coMenuDelete() {
    hideCanvasNodeMenu();
    if (!_overlayCid) return;
    var ctx = gCtx(_overlayCid), sels = (ctx.sels||[]).slice();
    if (!sels.length) return;
    showConfirm('确认删除选中的 '+sels.length+' 个节点？', '删除', function(ok){
        if(!ok)return;
        sels.forEach(function(sid){canvasDelNode(_overlayCid,sid)});
        ctx.sels=[];
    });
}

function coMenuRename() {
    hideCanvasNodeMenu();
    if (!_overlayCid) return;
    var ctx = gCtx(_overlayCid);
    if (!ctx.sels.length) return;
    var c = world.canvas.find(function(x){return x.id===_overlayCid});
    if(!c)return;
    var n = (c.nodes||[]).find(function(x){return x.id===ctx.sels[0]});
    if(!n)return;
    var item = findWorldItem(n.type,n.refId);
    if(!item)return;
    var cur = item.name||item.event||item.title||'';
    showPrompt('重命名节点', cur, function(v){if(!v||!item)return;item.name=v;saveWorld();renderOverlayCanvas()});
}

/* ====== 右键删除连线 ====== */
function coEdgeCtx(e, eid) {
    e.preventDefault();
    e.stopPropagation();
    hideCanvasNodeMenu();
    if (!_overlayCid) return;
    var m = document.createElement('div');
    m.id = 'coEdgeMenu';
    m.style.cssText = 'position:fixed;left:'+e.clientX+'px;top:'+e.clientY+'px;z-index:1001;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.2);padding:4px 0;min-width:140px;';
    m.innerHTML = '<div style="padding:6px 16px;cursor:pointer;font-size:13px;color:var(--accent);" onmouseover="this.style.background=\'var(--hover)\'" onmouseout="this.style.background=\'\'" onclick="coEdgeDeleteCtx(\''+eid+'\')">🗑 删除连线</div>';
    document.body.appendChild(m);
    var bd = document.createElement('div');
    bd.id = 'coEdgeMenuBd';
    bd.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:1000;';
    bd.onclick = function(){hideCanvasNodeMenu()};
    document.body.appendChild(bd);
}

function coEdgeDeleteCtx(eid) {
    hideCanvasNodeMenu();
    if (!_overlayCid) return;
    canvasDelEdgeOp(_overlayCid, eid);
    renderOverlayCanvas();
}

/* ====== 自动逻辑连线模式 ====== */
function coToggleAutoLogic() {
    _coAutoLogic = !_coAutoLogic;
    var btn = document.getElementById('coAutoLogicBtn');
    if (btn) {
        btn.textContent = _coAutoLogic ? '✅ 逻辑' : '🤖 逻辑';
        btn.className = 'btn btn-sm' + (_coAutoLogic ? ' accent' : '');
    }
    if (_overlayCid) renderOverlayCanvas();
}

/** 识别关系标签分类 */
function coClassifyRel(label) {
    if (!label) return null;
    var l = label.trim();
    if (/敌对|敌人|仇[恨敌]?|对立|冲突|对抗|憎恨|仇恨|敌视|反感/.test(l)) return 'hostile';
    if (/友好|朋友|友[人谊好]?|盟友|同盟|伙伴|好友|友谊|队友|合作|搭档|知已|知己|挚友/.test(l)) return 'friendly';
    if (/中立|陌生|无关|普通|一般|认识|面熟/.test(l)) return 'neutral';
    if (/亲属|家人|夫妻|父子|母子|父女|母女|兄弟|姐妹|兄妹|姐弟|血亲|亲戚|家族|宗族/.test(l)) return 'kinship';
    return null;
}

/** 推断两个关系类型传递后的结果 */
function coInferType(typeA, typeB) {
    if (typeA === 'kinship' && typeB === 'kinship') return 'kinship';
    if (typeA === 'hostile' && typeB === 'hostile') return 'neutral';
    if (typeA === 'friendly' && typeB === 'friendly') return 'friendly';
    return 'neutral';
}

/** 构建自动逻辑连线（传递闭包） */
function coBuildAutoLogic(c) {
    var edges = c.edges || [];
    var nodes = c.nodes || [];
    if (!nodes.length || !edges.length) return [];

    var nodeIds = nodes.map(function(n) { return n.id; });
    var rel = {};
    nodeIds.forEach(function(id) { rel[id] = {}; });

    /* 从已有边构建关系矩阵 */
    edges.forEach(function(e) {
        var type = coClassifyRel(e.label);
        if (type) {
            rel[e.source][e.target] = type;
            rel[e.target][e.source] = type;
        }
    });

    /* 传递闭包（Floyd-Warshall 风格迭代） */
    var changed = true;
    var iter = 0;
    while (changed && iter < 10) {
        changed = false;
        iter++;
        for (var ki = 0; ki < nodeIds.length; ki++) {
            var k = nodeIds[ki];
            for (var ii = 0; ii < nodeIds.length; ii++) {
                var i = nodeIds[ii];
                if (!rel[i][k]) continue;
                for (var ji = 0; ji < nodeIds.length; ji++) {
                    var j = nodeIds[ji];
                    if (i === j) continue;
                    if (rel[i][j]) continue;
                    if (!rel[k][j]) continue;
                    var inferred = coInferType(rel[i][k], rel[k][j]);
                    if (inferred) {
                        rel[i][j] = inferred;
                        changed = true;
                    }
                }
            }
        }
    }

    /* 生成临时连线（排除直接已有连线的节点对） */
    var tempLines = [];
    var seen = {};
    nodeIds.forEach(function(i) {
        nodeIds.forEach(function(j) {
            if (i >= j) return;
            if (!rel[i][j]) return;
            var key = i < j ? i + '|' + j : j + '|' + i;
            if (seen[key]) return;
            var direct = edges.some(function(e) {
                return (e.source === i && e.target === j) || (e.source === j && e.target === i);
            });
            if (direct) return;
            seen[key] = true;
            var color = rel[i][j] === 'hostile' ? '#e74c3c' :
                        rel[i][j] === 'friendly' ? '#2ecc71' :
                        rel[i][j] === 'kinship' ? '#9b59b6' : '#3498db';
            tempLines.push({ source: i, target: j, type: rel[i][j], color: color });
        });
    });

    return tempLines;
}

/** 拖拽时更新自动逻辑连线位置 */
function coUpdateAutoLines(c) {
    var autoLines = _coAutoLogic ? coBuildAutoLogic(c) : [];
    var existing = document.querySelectorAll('#canvasOverlayWorld svg .co-auto-line');
    for (var i = 0; i < existing.length; i++) existing[i].remove();
    var svg = document.querySelector('#canvasOverlayWorld svg');
    if (!svg) return;
    autoLines.forEach(function(al) {
        var sn = findCN(c.id, al.source), tn = findCN(c.id, al.target);
        if (!sn || !tn) return;
        var sx = sn.x + sn.w/2, sy = sn.y + 14;
        var tx = tn.x + tn.w/2, ty = tn.y + 14;
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'co-auto-line ' + al.type);
        line.setAttribute('x1', sx); line.setAttribute('y1', sy);
        line.setAttribute('x2', tx); line.setAttribute('y2', ty);
        line.setAttribute('stroke', al.color);
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '6,3');
        line.setAttribute('pointer-events', 'none');
        svg.appendChild(line);
    });
}

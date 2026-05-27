/* ===== 大纲表格服务 ===== *
 * 管理：大纲表格的初始化、选中、编辑、行列操作、合并/拆分、拖拽调整
 */

function initOT(it) {
    if (it.tableData && Array.isArray(it.tableData)) {
        var old = it.tableData;
        var keys = Object.keys(old[0] || { col1: 1, col2: 1, col3: 1 });
        var cols = keys.length;
        it.table = {
            rows: old.map(function(r) {
                var a = [];
                for (var i = 0; i < cols; i++) a.push(r["col" + (i + 1)] || "");
                return a;
            }),
            merges: {}, colW: [], rowH: []
        };
        delete it.tableData;
    }
    if (!it.table) it.table = { rows: [["", "", ""]], merges: {}, colW: [], rowH: [] };
    var t = it.table, R = t.rows.length, C = R > 0 ? t.rows[0].length : 3;
    for (var i = 0; i < R; i++) while (t.rows[i].length < C) t.rows[i].push("");
    while (t.colW.length < C) t.colW.push(120);
    while (t.rowH.length < R) t.rowH.push(32);
    return t;
}

function cov(id, r, c) {
    var it = world.outline.find(function(x) { return x.id === id });
    if (!it || !it.table) return 0;
    var m = it.table.merges || {};
    for (var k in m) {
        var p = k.split("-"), mr = +p[0], mc = +p[1], mg = m[k];
        if (r >= mr && r < mr + mg.r && c >= mc && c < mc + mg.c && (r !== mr || c !== mc)) return 1;
    }
    return 0;
}

function gSpan(id, r, c) {
    var it = world.outline.find(function(x) { return x.id === id });
    return it && it.table ? (it.table.merges || {})[r + "-" + c] || null : null;
}

function updSel(id) {
    document.querySelectorAll("#ot-" + id + " .ocell").forEach(function(e) { e.classList.remove("osel") });
    _tSels.forEach(function(s) {
        if (s.id !== id) return;
        var r1 = Math.min(s.r1, s.r2), c1 = Math.min(s.c1, s.c2);
        var r2 = Math.max(s.r1, s.r2), c2 = Math.max(s.c1, s.c2);
        for (var r = r1; r <= r2; r++)
            for (var c = c1; c <= c2; c++) {
                if (cov(id, r, c)) continue;
                var e = document.querySelector("#ot-" + id + " [data-r=\"" + r + "\"][data-c=\"" + c + "\"]");
                if (e) e.classList.add("osel");
            }
    });
}

function tMD(id, r, c, e) {
    if (!e) e = window.event;
    if (e.button !== 0) return;
    if (e.shiftKey && _tSels.length > 0) {
        var ls = _tSels[_tSels.length - 1];
        _tSels[_tSels.length - 1] = { id: id, r1: ls.r1, c1: ls.c1, r2: r, c2: c };
        updSel(id);
        return;
    }
    if (e.ctrlKey || e.metaKey) {
        _tSels.push({ id: id, r1: r, c1: c, r2: r, c2: c });
        updSel(id);
        _tMD = true;
        _tDrag = { id: id, r: r, c: c };
        return;
    }
    _tSels = [{ id: id, r1: r, c1: c, r2: r, c2: c }];
    updSel(id);
    _tMD = true;
    _tDrag = { id: id, r: r, c: c };
}

function edTC(id, r, c) {
    var el = document.querySelector("#ot-" + id + " [data-r=\"" + r + "\"][data-c=\"" + c + "\"]");
    if (!el) return;
    el.contentEditable = true;
    el.focus();
    var rng = document.createRange();
    rng.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rng);
    el.addEventListener("blur", function() {
        el.contentEditable = false;
        var html = el.innerHTML.replace(/<br\s*\/?>/gi, "");
        var it = world.outline.find(function(x) { return x.id === id });
        if (it && it.table && it.table.rows[r]) {
            it.table.rows[r][c] = html;
            saveWorld();
        }
    }, { once: true });
}

function getActiveSel(id) {
    for (var i = _tSels.length - 1; i >= 0; i--) {
        var s = _tSels[i];
        if (s.id === id) return {
            r1: Math.min(s.r1, s.r2), c1: Math.min(s.c1, s.c2),
            r2: Math.max(s.r1, s.r2), c2: Math.max(s.c1, s.c2)
        };
    }
    return null;
}

function showTCtxMenu(e, id) {
    e.preventDefault();
    hideCtxMenu();
    var m = $ctx, its = [], sel = getActiveSel(id);
    its.push({ l: '在上方插入行', a: "insTR('" + id + "',1)" });
    its.push({ l: '在下方插入行', a: "insTR('" + id + "',0)" });
    its.push({ l: '在左侧插入列', a: "insTC('" + id + "',1)" });
    its.push({ l: '在右侧插入列', a: "insTC('" + id + "',0)" });
    if (sel) {
        its.push({ l: '删除选中行', a: "delTR('" + id + "')", d: 1 });
        its.push({ l: '删除选中列', a: "delTC('" + id + "')", d: 1 });
    }
    if (sel && !(sel.r1 === sel.r2 && sel.c1 === sel.c2))
        its.push({ l: '合并单元格', a: "mergeTC('" + id + "')" });
    if (sel) {
        var it = world.outline.find(function(x) { return x.id === id });
        if (it && it.table) {
            var fm = false;
            for (var r = sel.r1; !fm && r <= sel.r2; r++)
                for (var c = sel.c1; !fm && c <= sel.c2; c++)
                    if (it.table.merges[r + '-' + c]) fm = true;
            if (fm) its.push({ l: '拆分单元格', a: "splitTC('" + id + "')" });
        }
    }
    m.innerHTML = its.map(function(it) {
        return '<div class="' + (it.d ? 'danger' : '') + '" onclick="' + it.a + '">' + it.l + '</div>';
    }).join('');
    m.style.left = e.clientX + 'px';
    m.style.top = e.clientY + 'px';
    m.classList.add('show');
}

function insTR(id, bf) {
    var it = world.outline.find(function(x) { return x.id === id });
    if (!it || !it.table) return;
    var t = it.table;
    var sel = getActiveSel(id), pos = sel ? sel.r1 : t.rows.length;
    if (!bf) pos = Math.min(t.rows.length, pos + 1);
    var cols = t.colW.length, nr = [];
    for (var i = 0; i < cols; i++) nr.push("");
    t.rows.splice(pos, 0, nr);
    t.rowH.splice(pos, 0, 32);
    var nm = {};
    for (var k in t.merges) { var p = k.split("-"), mr = +p[0]; nm[(mr >= pos ? mr + 1 : mr) + "-" + p[1]] = t.merges[k]; }
    t.merges = nm;
    saveWorld(); rerOT(id);
}

function insTC(id, bf) {
    var it = world.outline.find(function(x) { return x.id === id });
    if (!it || !it.table) return;
    var t = it.table;
    var sel = getActiveSel(id), pos = sel ? sel.c1 : t.colW.length;
    if (!bf) pos = Math.min(t.colW.length, pos + 1);
    for (var i = 0; i < t.rows.length; i++) t.rows[i].splice(pos, 0, "");
    t.colW.splice(pos, 0, 120);
    var nm = {};
    for (var k in t.merges) { var p = k.split("-"), mr = +p[0]; nm[mr + "-" + ((+p[1]) >= pos ? (+p[1]) + 1 : +p[1])] = t.merges[k]; }
    t.merges = nm;
    saveWorld(); rerOT(id);
}

function delTR(id) {
    var sel = getActiveSel(id);
    if (!sel) return;
    var it = world.outline.find(function(x) { return x.id === id });
    if (!it || !it.table) return;
    var t = it.table;
    if (t.rows.length <= 1) return;
    for (var r = sel.r2; r >= sel.r1; r--) { t.rows.splice(r, 1); t.rowH.splice(r, 1); }
    var nm = {};
    for (var k in t.merges) { var p = k.split("-"), mr = +p[0]; if (mr < sel.r1 || mr > sel.r2) nm[k] = t.merges[k]; }
    t.merges = nm;
    _tSels = [];
    saveWorld(); rerOT(id);
}

function delTC(id) {
    var sel = getActiveSel(id);
    if (!sel) return;
    var it = world.outline.find(function(x) { return x.id === id });
    if (!it || !it.table) return;
    var t = it.table;
    if (t.colW.length <= 1) return;
    for (var c = sel.c2; c >= sel.c1; c--) { for (var r = 0; r < t.rows.length; r++) t.rows[r].splice(c, 1); t.colW.splice(c, 1); }
    var nm = {};
    for (var k in t.merges) { var p = k.split("-"), mc = +p[1]; if (mc < sel.c1 || mc > sel.c2) nm[k] = t.merges[k]; }
    t.merges = nm;
    _tSels = [];
    saveWorld(); rerOT(id);
}

function mergeTC(id) {
    var sel = getActiveSel(id);
    if (!sel || (sel.r1 === sel.r2 && sel.c1 === sel.c2)) return;
    var it = world.outline.find(function(x) { return x.id === id });
    if (!it || !it.table) return;
    var t = it.table, k = sel.r1 + "-" + sel.c1;
    t.merges[k] = { r: sel.r2 - sel.r1 + 1, c: sel.c2 - sel.c1 + 1 };
    for (var r = sel.r1; r <= sel.r2; r++)
        for (var c = sel.c1; c <= sel.c2; c++)
            if (r !== sel.r1 || c !== sel.c1) { delete t.merges[r + "-" + c]; if (t.rows[r]) t.rows[r][c] = ""; }
    _tSels = [];
    saveWorld(); rerOT(id);
}

function splitTC(id) {
    var sel = getActiveSel(id);
    if (!sel) return;
    var it = world.outline.find(function(x) { return x.id === id });
    if (!it || !it.table) return;
    var t = it.table, d = 0;
    for (var r = sel.r1; r <= sel.r2; r++)
        for (var c = sel.c1; c <= sel.c2; c++) {
            if (t.merges[r + "-" + c]) { delete t.merges[r + "-" + c]; d = 1; }
        }
    if (d) { _tSels = []; saveWorld(); rerOT(id); }
}

function selTR(id, r) { _tSels = [{ id: id, r1: r, c1: 0, r2: r, c2: 999 }]; updSel(id); }
function selTC(id, c) { _tSels = [{ id: id, r1: 0, c1: c, r2: 999, c2: c }]; updSel(id); }

function sCR(e, id, c) {
    e.preventDefault();
    _tRes = { id: id, type: "col", idx: c, start: e.clientX, sz: document.querySelector("#ot-" + id + " [data-col=\"" + c + "\"]").offsetWidth };
}
function sRR(e, id, r) {
    e.preventDefault();
    _tRes = { id: id, type: "row", idx: r, start: e.clientY, sz: document.querySelector("#ot-" + id + " [data-row=\"" + r + "\"]").offsetHeight };
}

function onTPaste(e, id) {
    var txt = (e.clipboardData || window.clipboardData).getData("text/plain");
    if (!txt) return;
    e.preventDefault();
    var it = world.outline.find(function(x) { return x.id === id });
    if (!it || !it.table) return;
    var t = it.table;
    var sel = getActiveSel(id);
    var s = sel ? { r: sel.r1, c: sel.c1 } : { r: 0, c: 0 };
    var rows = txt.split(/\r?\n/).filter(function(l) { return l.trim() != "" });
    if (!rows.length) return;
    rows.forEach(function(row, ri) {
        var cols = row.split("\t");
        cols.forEach(function(val, ci) {
            var rr = s.r + ri, cc = s.c + ci;
            if (rr >= t.rows.length) {
                var nr = [];
                for (var i = 0; i < t.colW.length; i++) nr.push("");
                t.rows.push(nr);
                t.rowH.push(32);
            }
            if (cc < t.colW.length) t.rows[rr][cc] = val;
        });
    });
    saveWorld(); rerOT(id);
}

function aFC(id, c) {
    var it = world.outline.find(function(x) { return x.id === id });
    if (!it || !it.table) return;
    var mx = 40;
    it.table.rows.forEach(function(r) {
        var t = (r[c] || "") + "", w = 0;
        for (var i = 0; i < t.length; i++) w += t.charCodeAt(i) > 127 ? 14 : 7;
        mx = Math.max(mx, w + 16);
    });
    mx = Math.min(400, mx);
    it.table.colW[c] = mx;
    var el = document.querySelector("#ot-" + id + " [data-col=\"" + c + "\"]");
    if (el) el.style.width = mx + "px";
    saveWorld();
}

function aFR(id, r) {
    var it = world.outline.find(function(x) { return x.id === id });
    if (!it || !it.table) return;
    var ln = 1;
    it.table.rows[r].forEach(function(t) {
        var c = 0;
        for (var i = 0; i < t.length; i++) {
            if (t.charCodeAt(i) > 127) c += 14;
            else if (t.charCodeAt(i) > 32) c += 7;
            if (c > 300) { ln++; c = 0; }
        }
    });
    var nh = Math.max(22, ln * 18);
    it.table.rowH[r] = nh;
    var el = document.querySelector("#ot-" + id + " [data-row=\"" + r + "\"]");
    if (el) el.style.height = nh + "px";
    saveWorld();
}

function doTResize(e) {
    if (!_tRes) return;
    if (_tRes.type == 'col') {
        var nw = Math.max(40, _tRes.sz + e.clientX - _tRes.start);
        var el = document.querySelector("#ot-" + _tRes.id + " [data-col=\"" + _tRes.idx + "\"]");
        if (el) el.style.width = nw + "px";
    } else {
        var nh = Math.max(22, _tRes.sz + e.clientY - _tRes.start);
        var el = document.querySelector("#ot-" + _tRes.id + " [data-row=\"" + _tRes.idx + "\"]");
        if (el) el.style.height = nh + "px";
    }
}

function endTResize() {
    if (!_tRes) return;
    var it = world.outline.find(function(x) { return x.id === _tRes.id });
    if (it && it.table) {
        if (_tRes.type == 'col') {
            var el = document.querySelector("#ot-" + _tRes.id + " [data-col=\"" + _tRes.idx + "\"]");
            if (el) it.table.colW[_tRes.idx] = el.offsetWidth || 120;
        } else {
            var el = document.querySelector("#ot-" + _tRes.id + " [data-row=\"" + _tRes.idx + "\"]");
            if (el) it.table.rowH[_tRes.idx] = el.offsetHeight || 32;
        }
        saveWorld();
    }
    _tRes = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
}

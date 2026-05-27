/* ===== 架构画布数据服务 ===== *
 * 管理：画布 CRUD、节点/边/标签操作（纯数据逻辑）
 *
 * 通知约定：
 *   canvas:listChanged  — 画布列表变更，需刷新世界面板的画布列表
 *   canvas:changed, cid — 画布内部变更（节点/边），需刷新小画布与覆盖层
 */

var _cnCtx = {};

function gCtx(id) {
    if (!_cnCtx[id]) {
        _cnCtx[id] = {
            sel: null, sels: [], lineMode: false,
            drag: null, offX: 0, offY: 0, eId: 1, nId: 1
        };
    }
    return _cnCtx[id];
}

function addCanvas() {
    var mx = world.canvas.reduce(function(m, c) { return Math.max(m, c.order || 0) }, 0);
    world.canvas.push({
        id: gid(), name: '新架构图 ' + (world.canvas.length + 1),
        content: '', nodes: [], edges: [], order: mx + 1
    });
    saveWorld();
    EventBus.emit('canvas:listChanged');
}

function delCanvas(id) {
    world.canvas = world.canvas.filter(function(c) { return c.id !== id });
    delete _cnCtx[id];
    saveWorld();
    EventBus.emit('canvas:listChanged');
    if (_overlayCid === id) EventBus.emit('canvas:overlayClosed');
}

function canvasRename(id) {
    var c = world.canvas.find(function(x) { return x.id === id });
    if (!c) return;
    showPrompt('重命名架构图', c.name || '', function(v) {
        if (!v) return;
        c.name = v;
        saveWorld();
        EventBus.emit('canvas:listChanged');
    });
}

function canvasAddNodeOp(cid, selected) {
    if (!selected || !selected.length) return;
    var c = world.canvas.find(function(x) { return x.id === cid });
    if (!c) return;
    var ctx = gCtx(cid);
    c.nodes = c.nodes || [];
    selected.forEach(function(item) {
        var maxN = 0;
        (c.nodes||[]).forEach(function(n) {
            var m = parseInt(n.id.replace('cn_','')) || 0;
            if (m > maxN) maxN = m;
        });
        ctx.nId = maxN + 1;
        var nid = 'cn_' + (ctx.nId++);
        var len = c.nodes.length;
        c.nodes.push({
            id: nid, type: item.type, refId: item.id,
            x: 20 + (len % 4) * 140, y: 20 + Math.floor(len/4) * 80, w: 130
        });
    });
    saveWorld();
    EventBus.emit('canvas:changed', cid);
}

function canvasDelNode(cid, nid) {
    CommandCanvas.deleteNode(cid, nid);
}

function canvasConnectOp(cid, sid, tid, label) {
    if (sid === tid) return;
    var c = world.canvas.find(function(x) { return x.id === cid });
    if (!c) return;
    var ctx = gCtx(cid);
    var eid = 'ce_' + (ctx.eId++);
    c.edges = c.edges || [];
    c.edges.push({ id: eid, source: sid, target: tid, label: label || '' });
    saveWorld();
    EventBus.emit('canvas:changed', cid);
    return eid;
}

function canvasDelEdgeOp(cid, eid) {
    CommandCanvas.deleteEdge(cid, eid);
}

function canvasEdgeLabelOp(cid, eid, label) {
    var c = world.canvas.find(function(x) { return x.id === cid });
    if (!c) return;
    var e = (c.edges||[]).find(function(x) { return x.id === eid });
    if (!e) return;
    e.label = label;
    saveWorld();
    EventBus.emit('canvas:changed', cid);
}

function cnToggle(cid, nid) {
    var c = world.canvas.find(function(x) { return x.id === cid });
    if (!c) return;
    var n = (c.nodes||[]).find(function(x) { return x.id === nid });
    if (n) { n._open = !n._open; EventBus.emit('canvas:changed', cid); }
}

function toggleCanvasCard(id) {
    EventBus.emit('canvas:overlayOpen', id);
}

function canvasToggleLineOp(cid, lineMode) {
    var ctx = gCtx(cid);
    ctx.lineMode = !!lineMode;
    ctx.sel = null;
    EventBus.emit('canvas:listChanged');
    EventBus.emit('canvas:changed', cid);
}

function findCN(cid, nid) {
    var c = world.canvas.find(function(x) { return x.id === cid });
    if (!c) return null;
    var n = (c.nodes||[]).find(function(x) { return x.id === nid });
    if (!n) return null;
    var el = document.getElementById('con-' + nid) || document.getElementById('ccn-' + nid);
    return {
        x: n.x, y: n.y,
        w: el ? el.offsetWidth : (n.w||130),
        h: el ? el.offsetHeight : 28
    };
}

/* ===== 内建命令 ===== *
 * 将服务层操作封装为可撤销/重做的命令
 * 每个命令包含 exec(data) 和 undo(data) 两个方法
 */

(function() {

// ====== 章节命令 ======

CommandChapter = {
    /** 添加卷 */
    addVolume: function() {
        var volId = gid();
        var mx = volumes.reduce(function(m, v) { return Math.max(m, v.order || 0) }, 0);
        CommandSystem.exec({
            name: 'addVolume',
            data: { id: volId, title: '新卷', order: mx + 1 },
            exec: function(d) {
                volumes.push({ id: d.id, title: d.title, order: d.order });
                Storage.set(pf() + 'volumes', volumes);
                AppState.set('volumes', volumes);
                EventBus.emit('chapterTree:changed');
            },
            undo: function(d) {
                volumes = volumes.filter(function(v) { return v.id !== d.id });
                Storage.set(pf() + 'volumes', volumes);
                AppState.set('volumes', volumes);
                EventBus.emit('chapterTree:changed');
            }
        });
    },

    /** 添加章节 */
    addChapter: function(vid) {
        var chId = gid();
        var order = chapters.filter(function(c) { return c.volumeId === vid }).length + 1;
        var oldActiveId = activeId;
        CommandSystem.exec({
            name: 'addChapter',
            data: { id: chId, volumeId: vid, order: order, oldActiveId: oldActiveId },
            exec: function(d) {
                chapters.push({ id: d.id, title: '新章', content: '', summary: '', volumeId: d.volumeId, order: d.order });
                activeId = d.id;
                persistChapters();
                EventBus.emit('chapterTree:changed');
                EventBus.emit('chapter:activated', d.id);
            },
            undo: function(d) {
                chapters = chapters.filter(function(c) { return c.id !== d.id });
                activeId = d.oldActiveId;
                persistChapters();
                EventBus.emit('chapterTree:changed');
                if (d.oldActiveId) EventBus.emit('chapter:activated', d.oldActiveId);
            }
        });
    },

    /** 删除章节 */
    deleteChapter: function(cid) {
        var idx = chapters.findIndex(function(c) { return c.id === cid });
        if (idx < 0) return;
        var ch = chapters[idx];
        var oldActiveId = activeId;
        CommandSystem.exec({
            name: 'deleteChapter',
            data: { chapter: JSON.parse(JSON.stringify(ch)), index: idx, oldActiveId: oldActiveId },
            exec: function(d) {
                chapters.splice(idx, 1);
                if (activeId === cid) activeId = chapters.length > 0 ? chapters[Math.min(idx, chapters.length - 1)].id : null;
                persistChapters();
                EventBus.emit('chapterTree:changed');
                EventBus.emit('chapter:activated', activeId);
            },
            undo: function(d) {
                chapters.splice(d.index, 0, d.chapter);
                activeId = d.oldActiveId;
                persistChapters();
                EventBus.emit('chapterTree:changed');
                EventBus.emit('chapter:activated', d.oldActiveId);
            }
        });
    },

    /** 删除卷（含所有章节） */
    deleteVolume: function(vid) {
        var vol = volumes.find(function(v) { return v.id === vid });
        if (!vol) return;
        var chs = chapters.filter(function(c) { return c.volumeId === vid });
        var oldActiveId = activeId;
        var oldVolumes = JSON.parse(JSON.stringify(volumes));
        CommandSystem.exec({
            name: 'deleteVolume',
            data: { volId: vid, chapters: JSON.parse(JSON.stringify(chs)), oldVolumes: oldVolumes, oldActiveId: oldActiveId },
            exec: function(d) {
                volumes = volumes.filter(function(v) { return v.id !== d.volId });
                chapters = chapters.filter(function(c) { return c.volumeId !== d.volId });
                if (!chapters.find(function(c) { return c.id === activeId }))
                    activeId = chapters.length > 0 ? chapters[0].id : null;
                Storage.set(pf() + 'volumes', volumes);
                persistChapters();
                EventBus.emit('chapterTree:changed');
                if (activeId) EventBus.emit('chapter:activated', activeId);
            },
            undo: function(d) {
                volumes = JSON.parse(JSON.stringify(d.oldVolumes));
                chapters = chapters.concat(d.chapters);
                activeId = d.oldActiveId;
                Storage.set(pf() + 'volumes', volumes);
                persistChapters();
                EventBus.emit('chapterTree:changed');
                EventBus.emit('chapter:activated', activeId);
            }
        });
    }
};

// ====== 世界观命令 ======

CommandWorld = {
    /** 添加人物 */
    addCharacter: function() {
        var id = gid();
        var n = autoName('char');
        CommandSystem.exec({
            name: 'addCharacter',
            data: { id: id, name: n, order: world.chars.length + 1 },
            exec: function(d) {
                world.chars.push({ id: d.id, name: d.name, age: '', gender: '', personality: '',
                    appearance: '', background: '', image: '', order: d.order });
                saveWorld();
                EventBus.emit('world:dataChanged', 'chars');
            },
            undo: function(d) {
                world.chars = world.chars.filter(function(c) { return c.id !== d.id });
                saveWorld();
                EventBus.emit('world:dataChanged', 'chars');
            }
        });
    },

    /** 添加地点 */
    addLocation: function() {
        var id = gid();
        var n = autoName('loc');
        CommandSystem.exec({
            name: 'addLocation',
            data: { id: id, name: n, order: world.locs.length + 1 },
            exec: function(d) {
                world.locs.push({ id: d.id, name: d.name, type: '', description: '',
                    significance: '', image: '', order: d.order });
                saveWorld();
                EventBus.emit('world:dataChanged', 'locs');
            },
            undo: function(d) {
                world.locs = world.locs.filter(function(l) { return l.id !== d.id });
                saveWorld();
                EventBus.emit('world:dataChanged', 'locs');
            }
        });
    },

    /** 添加设定 */
    addSetting: function() {
        var id = gid();
        var n = autoName('set');
        CommandSystem.exec({
            name: 'addSetting',
            data: { id: id, name: n, order: world.sets.length + 1 },
            exec: function(d) {
                world.sets.push({ id: d.id, name: d.name, category: '', description: '',
                    image: '', order: d.order });
                saveWorld();
                EventBus.emit('world:dataChanged', 'sets');
            },
            undo: function(d) {
                world.sets = world.sets.filter(function(s) { return s.id !== d.id });
                saveWorld();
                EventBus.emit('world:dataChanged', 'sets');
            }
        });
    },

    /** 添加时间线 */
    addTimeline: function() {
        var id = gid();
        var n = autoName('tl');
        var mx = world.tl.reduce(function(m, t) { return Math.max(m, t.order || 0) }, 0);
        CommandSystem.exec({
            name: 'addTimeline',
            data: { id: id, name: n, order: mx + 1 },
            exec: function(d) {
                world.tl.push({ id: d.id, era: '', event: d.name, description: '',
                    sortNum: '', image: '', order: d.order });
                saveWorld();
                EventBus.emit('world:dataChanged', 'tl');
            },
            undo: function(d) {
                world.tl = world.tl.filter(function(t) { return t.id !== d.id });
                saveWorld();
                EventBus.emit('world:dataChanged', 'tl');
            }
        });
    },

    /** 添加大纲 */
    addOutline: function(level) {
        var id = gid();
        var n = autoName('outline');
        var mx = world.outline.reduce(function(m, o) { return Math.max(m, o.order || 0) }, 0);
        CommandSystem.exec({
            name: 'addOutline',
            data: { id: id, name: n, level: level || 1, order: mx + 1 },
            exec: function(d) {
                world.outline.push({ id: d.id, title: d.name, content: '', level: d.level, parentId: null, order: d.order });
                saveWorld();
                EventBus.emit('world:dataChanged', 'outline');
            },
            undo: function(d) {
                world.outline = world.outline.filter(function(o) { return o.id !== d.id });
                saveWorld();
                EventBus.emit('world:dataChanged', 'outline');
            }
        });
    }
};

// ====== 世界观删除命令 ======

CommandWorld.deleteCharacter = function(id) {
    var item = world.chars.find(function(c) { return c.id === id });
    if (!item) return;
    var snapshot = JSON.parse(JSON.stringify(item));
    var idx = world.chars.findIndex(function(c) { return c.id === id });
    CommandSystem.exec({
        name: 'deleteCharacter',
        data: { snapshot: snapshot, index: idx },
        exec: function(d) { world.chars.splice(d.index, 1); saveWorld(); EventBus.emit('world:dataChanged', 'chars'); },
        undo: function(d) { world.chars.splice(d.index, 0, d.snapshot); saveWorld(); EventBus.emit('world:dataChanged', 'chars'); }
    });
};

CommandWorld.deleteLocation = function(id) {
    var item = world.locs.find(function(l) { return l.id === id });
    if (!item) return;
    var snapshot = JSON.parse(JSON.stringify(item));
    var idx = world.locs.findIndex(function(l) { return l.id === id });
    CommandSystem.exec({
        name: 'deleteLocation',
        data: { snapshot: snapshot, index: idx },
        exec: function(d) { world.locs.splice(d.index, 1); saveWorld(); EventBus.emit('world:dataChanged', 'locs'); },
        undo: function(d) { world.locs.splice(d.index, 0, d.snapshot); saveWorld(); EventBus.emit('world:dataChanged', 'locs'); }
    });
};

CommandWorld.deleteSetting = function(id) {
    var item = world.sets.find(function(s) { return s.id === id });
    if (!item) return;
    var snapshot = JSON.parse(JSON.stringify(item));
    var idx = world.sets.findIndex(function(s) { return s.id === id });
    CommandSystem.exec({
        name: 'deleteSetting',
        data: { snapshot: snapshot, index: idx },
        exec: function(d) { world.sets.splice(d.index, 1); saveWorld(); EventBus.emit('world:dataChanged', 'sets'); },
        undo: function(d) { world.sets.splice(d.index, 0, d.snapshot); saveWorld(); EventBus.emit('world:dataChanged', 'sets'); }
    });
};

CommandWorld.deleteTimeline = function(id) {
    var item = world.tl.find(function(t) { return t.id === id });
    if (!item) return;
    var snapshot = JSON.parse(JSON.stringify(item));
    var idx = world.tl.findIndex(function(t) { return t.id === id });
    CommandSystem.exec({
        name: 'deleteTimeline',
        data: { snapshot: snapshot, index: idx },
        exec: function(d) { world.tl.splice(d.index, 1); saveWorld(); EventBus.emit('world:dataChanged', 'tl'); },
        undo: function(d) { world.tl.splice(d.index, 0, d.snapshot); saveWorld(); EventBus.emit('world:dataChanged', 'tl'); }
    });
};

CommandWorld.deleteOutline = function(id) {
    var item = world.outline.find(function(o) { return o.id === id });
    if (!item) return;
    var snapshot = JSON.parse(JSON.stringify(item));
    var idx = world.outline.findIndex(function(o) { return o.id === id });
    CommandSystem.exec({
        name: 'deleteOutline',
        data: { snapshot: snapshot, index: idx },
        exec: function(d) { world.outline.splice(d.index, 1); saveWorld(); EventBus.emit('world:dataChanged', 'outline'); },
        undo: function(d) { world.outline.splice(d.index, 0, d.snapshot); saveWorld(); EventBus.emit('world:dataChanged', 'outline'); }
    });
};

// ====== 画布命令 ======

var CommandCanvas = {
    deleteNode: function(cid, nid) {
        var c = world.canvas.find(function(x) { return x.id === cid });
        if (!c) return;
        var node = (c.nodes||[]).find(function(n) { return n.id === nid });
        if (!node) return;
        var nodeSnapshot = JSON.parse(JSON.stringify(node));
        var edgesSnapshot = JSON.parse(JSON.stringify((c.edges||[]).filter(function(e) { return e.source === nid || e.target === nid })));
        var nodeIdx = (c.nodes||[]).findIndex(function(n) { return n.id === nid });
        var ctx = gCtx(cid);
        var wasSel = ctx.sel === nid;
        var wasSels = (ctx.sels||[]).indexOf(nid);
        CommandSystem.exec({
            name: 'deleteCanvasNode',
            data: { cid: cid, nid: nid, node: nodeSnapshot, edges: edgesSnapshot, nodeIdx: nodeIdx, wasSel: wasSel, wasSels: wasSels },
            exec: function(d) {
                var c2 = world.canvas.find(function(x) { return x.id === d.cid });
                if (!c2) return;
                c2.nodes = (c2.nodes||[]).filter(function(n) { return n.id !== d.nid });
                c2.edges = (c2.edges||[]).filter(function(e) { return e.source !== d.nid && e.target !== d.nid });
                var ctx2 = gCtx(d.cid);
                if (ctx2.sel === d.nid) ctx2.sel = null;
                var si = ctx2.sels.indexOf(d.nid);
                if (si !== -1) ctx2.sels.splice(si, 1);
                saveWorld();
                EventBus.emit('canvas:changed', d.cid);
            },
            undo: function(d) {
                var c2 = world.canvas.find(function(x) { return x.id === d.cid });
                if (!c2) return;
                c2.nodes.splice(d.nodeIdx, 0, JSON.parse(JSON.stringify(d.node)));
                c2.edges = (c2.edges||[]).concat(JSON.parse(JSON.stringify(d.edges)));
                var ctx2 = gCtx(d.cid);
                if (d.wasSel) ctx2.sel = d.nid;
                if (d.wasSels !== -1) ctx2.sels.push(d.nid);
                saveWorld();
                EventBus.emit('canvas:changed', d.cid);
            }
        });
    },

    deleteEdge: function(cid, eid) {
        var c = world.canvas.find(function(x) { return x.id === cid });
        if (!c) return;
        var edge = (c.edges||[]).find(function(e) { return e.id === eid });
        if (!edge) return;
        var edgeSnapshot = JSON.parse(JSON.stringify(edge));
        var edgeIdx = (c.edges||[]).findIndex(function(e) { return e.id === eid });
        CommandSystem.exec({
            name: 'deleteCanvasEdge',
            data: { cid: cid, eid: eid, edge: edgeSnapshot, edgeIdx: edgeIdx },
            exec: function(d) {
                var c2 = world.canvas.find(function(x) { return x.id === d.cid });
                if (!c2) return;
                c2.edges = (c2.edges||[]).filter(function(e) { return e.id !== d.eid });
                saveWorld();
                EventBus.emit('canvas:changed', d.cid);
            },
            undo: function(d) {
                var c2 = world.canvas.find(function(x) { return x.id === d.cid });
                if (!c2) return;
                c2.edges.splice(d.edgeIdx, 0, JSON.parse(JSON.stringify(d.edge)));
                saveWorld();
                EventBus.emit('canvas:changed', d.cid);
            }
        });
    }
};

})();

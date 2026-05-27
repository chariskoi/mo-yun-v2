/* ===== 章节服务 ===== *
 * 管理：卷/章节 CRUD、章节切换（纯数据逻辑，无 DOM 操作）
 */

function getActiveChapter() {
    return chapters.find(function(c) { return c.id === activeId });
}

function chaptersOfVolume(vid) {
    return chapters.filter(function(c) { return c.volumeId === vid })
        .sort(function(a, b) { return (a.order || 0) - (b.order || 0) });
}

function addVolume() {
    CommandChapter.addVolume();
}

function addChapterToVolume(vid) {
    CommandChapter.addChapter(vid);
}

function switchChapter(id) {
    if (activeId === id) return;
    saveUndoState();
    autoSaveNow();
    activeId = id;
    persistChapters();
    EventBus.emit('chapterTree:changed');
    EventBus.emit('chapter:activated', id);
}

function updateSummary(id, val) {
    var c = chapters.find(function(c) { return c.id === id });
    if (c) { c.summary = val; persistChapters(); EventBus.emit('chapterTree:changed'); }
}

function updateChapterTitle(id, title) {
    var c = chapters.find(function(c) { return c.id === id });
    if (c) { c.title = title; persistChapters(); EventBus.emit('chapterTree:changed'); }
}

function moveChapterAfter(mid, aid) {
    var mc = chapters.find(function(c) { return c.id === mid });
    var ac = chapters.find(function(c) { return c.id === aid });
    if (!mc || !ac) return;
    if (mc.volumeId !== ac.volumeId) mc.volumeId = ac.volumeId;
    var sibs = chaptersOfVolume(ac.volumeId).filter(function(c) { return c.id !== mid });
    var idx = sibs.findIndex(function(c) { return c.id === aid });
    for (var i = 0; i < sibs.length; i++) sibs[i].order = i + 1;
    mc.order = idx + 2;
    for (var i = idx + 1; i < sibs.length; i++) sibs[i].order = sibs[i].order + 1;
    var others = chapters.filter(function(c) { return c.volumeId !== ac.volumeId });
    chapters = others.concat(sibs.concat([mc]).sort(function(a, b) { return a.order - b.order }));
    persistChapters();
    EventBus.emit('chapterTree:changed');
}

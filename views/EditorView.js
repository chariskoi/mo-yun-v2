/* ===== 编辑器视图 ===== *
 * 管理：编辑区域、工具栏、章节树渲染、字数统计
 */

function renderChapterTree() {
    var l = document.getElementById('chapterList'), h = '';
    volumes.sort(function(a, b) { return (a.order || 0) - (b.order || 0); }).forEach(function(v) {
        var chs = chaptersOfVolume(v.id);
        h += '<div class="volume-header" onclick="toggleVolume(this)" data-vid="' + v.id + '" oncontextmenu="event.preventDefault();showCtxMenu(event,\'volume\',\'' + v.id + '\',\'title\')">📂 ' + esc(v.title) + ' (' + chs.length + ')</div><div class="volume-children" style="margin:0 0 0 12px;">';
        chs.forEach(function(c, i) {
            var cw = countChWords(c);
            h += '<div class="chapter-item ' + (c.id === activeId ? 'active' : '') + '" draggable="true" onclick="switchChapter(\'' + c.id + '\')" oncontextmenu="event.preventDefault();showCtxMenu(event,\'chapter\',\'' + c.id + '\')" ondragstart="dragChStart(event,\'' + c.id + '\')" ondragover="dragChOver(event)" ondragleave="dragChLeave(event)" ondrop="dragChDrop(event,\'' + c.id + '\')">📄 ' + (i + 1) + '. ' + esc(c.title || '未命名') + (cw > 0 ? ' <span class="ch-wc">' + cw + '字</span>' : '') + '</div>';
            h += '<div class="ch-summary-row" draggable="true" onclick="toggleSummaryEdit(\'' + c.id + '\')" ondragstart="dragSummaryStart(event,\'' + c.id + '\')">📝 梗概 ' + (c.summary ? '✓' : '+') + '</div>';
            h += '<div id="se-' + c.id + '" style="display:none;padding:4px 12px 4px 24px;"><textarea onchange="updateSummary(\'' + c.id + '\',this.value)" style="width:100%;min-height:36px;font-size:11px;">' + esc(c.summary || '') + '</textarea></div>';
        });
        h += '<button class="btn btn-sm" style="margin:6px 0 12px 12px;" onclick="addChapterToVolume(\'' + v.id + '\')">+ 章节</button></div>';
    });
    l.innerHTML = h || '<div style="padding:16px;color:var(--text2);">没有数据</div>';
}

async function loadChapterToEditor() {
    var ch = getActiveChapter();
    if (!ch) return;
    document.getElementById('chapterTitleDisplay').innerText = ch.title;
    $ed.innerHTML = '';
    var k = 'ns_content_' + activeBookId + '_' + ch.id;
    var saved = await Storage.getAsync(k, null);
    if (saved) ch.content = saved;
    $ed.innerHTML = ch.content || '';
    updateWordCount();
    updateFontDisplay();
    _undoStack = [$ed.innerHTML];
    _redoStack = [];
}

function updateWordCount() {
    document.getElementById('wordCount').innerHTML = '📊 ' + ($ed.textContent.replace(/\s/g, '').length) + '字';
}

function onEditorInput() {
    saveUndoState();
    updateWordCount();
    if (saveTimer) clearTimeout(saveTimer);
    var interval = parseInt(Storage.get('sc_save_interval', '20000')) || 20000;
    if (interval <= 0) return;
    saveTimer = setTimeout(autoSaveNow, interval);
}

function execCmd(cmd, val) {
    saveUndoState();
    var ce = document.activeElement && document.activeElement.closest('[contenteditable]');
    if (!ce && _lastCE) ce = _lastCE;
    if (!ce) $ed.focus();
    else if (ce !== $ed) ce.focus();
    document.execCommand(cmd, false, val || null);
    updateToolbarState();
}

function updateToolbarState() {
    ['bold', 'italic', 'underline', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].forEach(function(c) {
        var btn = document.querySelector('[onclick="execCmd(\'' + c + '\')"]');
        if (btn) btn.classList.toggle('active', document.queryCommandState(c));
    });
}

function updateFontDisplay() {
    var fs = AppState.get('editor.fontSize');
    var lh = AppState.get('editor.lineHeight');
    document.getElementById('fontSizeValue').textContent = fs;
    document.getElementById('lineHeightValue').textContent = lh.toFixed(2);
    document.documentElement.style.setProperty('--base-font-size', fs + 'px');
    document.documentElement.style.setProperty('--base-line-height', lh);
}

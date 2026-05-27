/* ===== 章节视图 ===== *
 * 负责：章节树渲染、内联编辑、拖拽等 DOM 操作
 */

function toggleVolume(el) {
    var next = el.nextElementSibling;
    if (next) next.style.display = next.style.display === 'none' ? 'block' : 'none';
}

function toggleSummaryEdit(cid) {
    var el = document.getElementById('se-' + cid);
    el.style.display = el.style.display === 'block' ? 'none' : 'block';
    if (el.style.display === 'block') el.querySelector('textarea').focus();
}

function inlineEditChapterTitle() {
    var disp = document.getElementById('chapterTitleDisplay');
    var old = disp.innerText;
    var ch = getActiveChapter();
    if (!ch) return;
    disp.innerHTML = '<input value="' + esc(old) + '" onblur="endInlineTitle(this.value)" onkeydown="if(event.key===\'Enter\')this.blur()" style="font-size:24px;background:transparent;border:none;border-bottom:2px solid var(--accent);text-align:center;outline:none;">';
    disp.querySelector('input').focus();
}

function endInlineTitle(val) {
    var ch = getActiveChapter();
    if (ch) {
        updateChapterTitle(ch.id, val.trim() || '未命名');
        document.getElementById('chapterTitleDisplay').innerText = ch.title;
    }
}

function dragChStart(e, cid) {
    dChId = cid;
    e.dataTransfer.effectAllowed = 'move';
    if (document.getElementById('aiFloat').classList.contains('show'))
        e.dataTransfer.setData('text/plain', 'summary:' + cid);
}

function dragSummaryStart(e, cid) {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', 'summary:' + cid);
}

function dragChOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function dragChLeave(e) { e.currentTarget.classList.remove('drag-over'); }

function dragChDrop(e, targetId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (!dChId || dChId === targetId) return;
    moveChapterAfter(dChId, targetId);
    dChId = null;
}

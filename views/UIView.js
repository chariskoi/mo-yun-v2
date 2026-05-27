/* ===== 通用 UI 组件 ===== *
 * 管理：模态框、提示框、确认框、右键菜单、裁剪、多选拾取器
 */

/* ====== 上下文菜单 ====== */
function hideCtxMenu() {
    $ctx.classList.remove('show');
    $ctxBd.classList.remove('show');
    _ctxMenuOpen = false;
}

function showCtxMenu(e, type, id, field) {
    _ctxMenuOpen = true;
    ctxE = e.target;
    ctxT = type;
    ctxId = id;
    ctxF = field || (type === 'tl' ? 'event' : type === 'chapter' ? 'title' : 'name');
    var m = $ctx, its = [];
    if (type === 'chapter') its = [
        { l: '✎ 重命名', a: 'ctxRename()' },
        { l: '📝 梗概', a: 'toggleSummaryEdit(\'' + id + '\')' },
        { l: '✕ 删除', d: 1, a: 'ctxDelete()' }
    ];
    else if (type === 'volume') its = [
        { l: '✎ 重命名', a: 'ctxRename()' },
        { l: '✕ 删除卷', d: 1, a: 'ctxDeleteVolume()' }
    ];
    else its = [
        { l: '✎ 重命名', a: 'ctxRename()' },
        { l: '📝 独立编辑', a: 'ctxOpenCardEditor()' },
        { l: '✕ 删除', d: 1, a: 'ctxDelete()' }
    ];
    m.innerHTML = its.map(function(it) {
        return '<div class="' + (it.d ? 'danger' : '') + '" onclick="' + it.a + '">' + it.l + '</div>';
    }).join('');
    m.style.left = Math.min(e.clientX, window.innerWidth - 160) + 'px';
    m.style.top = Math.min(e.clientY, window.innerHeight - 120) + 'px';
    m.classList.add('show');
    $ctxBd.classList.add('show');
}

function ctxRename() {
    if (!ctxE || !ctxId) return;
    renameStart(ctxE, ctxT, ctxId, ctxF);
    hideCtxMenu();
}

function ctxDelete() {
    hideCtxMenu();
    var t = ctxT, id = ctxId;
    showConfirm('确认删除？', '删除', function(ok) {
        if (!ok) return;
        if (t === 'chapter') {
            if (chapters.length <= 1) { showAlert('至少保留一个章节'); return; }
            CommandChapter.deleteChapter(id);
        } else if (t === 'outline') delOutline(id);
        else if (t === 'char') delCharacter(id);
        else if (t === 'loc') delLocation(id);
        else if (t === 'set') delSetting(id);
        else if (t === 'tl') delTimeline(id);
    });
}

function ctxDeleteVolume() {
    hideCtxMenu();
    if (volumes.length <= 1) { showAlert('至少保留一个卷'); return; }
    CommandChapter.deleteVolume(ctxId);
}

function ctxOpenCardEditor() {
    hideCtxMenu();
    openCardEditor(ctxT, ctxId);
}

function renameStart(el, type, id, field) {
    event.preventDefault();
    event.stopPropagation();
    var old = (el.textContent || el.innerText).replace(/\s+/g, ' ').trim();
    if (type === 'volume') old = old.replace(/^📂\s*/, '').replace(/\s*\(\d+\)\s*$/, '').trim();
    if (type === 'chapter') old = old.replace(/^📄\s*\d+\.\s*/, '').replace(/\s*\d+字\s*$/, '').trim();
    el.innerHTML = '<input value="' + esc(old) + '" onblur="renameEnd(this,\'' + type + '\',\'' + id + '\',\'' + field + '\')" onkeydown="if(event.key===\'Enter\')this.blur()" style="padding:2px;border:1px solid var(--accent);border-radius:3px;width:100%;">';
    el.querySelector('input').focus();
}

function renameEnd(inp, type, id, field) {
    var val = inp.value.trim();
    if (!val) return;
    if (type === 'chapter') {
        var c = chapters.find(function(c) { return c.id === id });
        if (c) { c[field] = val; persistChapters(); renderChapterTree(); document.getElementById('chapterTitleDisplay').innerText = val; }
    } else if (type === 'volume') {
        var v = volumes.find(function(v) { return v.id === id });
        if (v) { v[field] = val; Storage.set(pf() + 'volumes', volumes); AppState.set('volumes', volumes); renderChapterTree(); }
    } else if (type === 'outline') {
        var o = world.outline.find(function(o) { return o.id === id });
        if (o) { o[field] = val; saveWorld(); renderOutline(); }
    } else {
        var it = wa(type).find(function(x) { return x.id === id });
        if (it) { it[field] = val; saveWorld(); }
        if (type === 'char') renderChars();
        else if (type === 'loc') renderLocs();
        else if (type === 'set') renderSets();
        else if (type === 'tl') renderTimeline();
    }
}

/* ====== 提示框 ====== */
var _promptCB = null;

function showPrompt(title, val, cb) {
    _promptCB = cb;
    document.getElementById('promptTitle').textContent = title;
    document.getElementById('promptInput').value = val || '';
    document.getElementById('promptModal').classList.add('show');
    setTimeout(function() {
        document.getElementById('promptInput').focus();
        document.getElementById('promptInput').select();
    }, 100);
}

function confirmPrompt() {
    var v = document.getElementById('promptInput').value.trim();
    var cb = _promptCB;
    document.getElementById('promptModal').classList.remove('show');
    _promptCB = null;
    if (cb) cb(v);
}

function cancelPrompt() {
    document.getElementById('promptModal').classList.remove('show');
    _promptCB = null;
}

/* ====== 确认框 ====== */
var _confirmCB = null;

function showConfirm(msg, okLabel, cb) {
    _confirmCB = cb;
    document.getElementById('confirmTitle').textContent = '确认';
    document.getElementById('confirmMsg').textContent = msg;
    document.getElementById('confirmOkBtn').textContent = okLabel || '确认';
    document.getElementById('confirmModal').classList.add('show');
}

function confirmConfirm() {
    var cb = _confirmCB;
    document.getElementById('confirmModal').classList.remove('show');
    _confirmCB = null;
    if (cb) cb(true);
}

function cancelConfirm() {
    document.getElementById('confirmModal').classList.remove('show');
    _confirmCB = null;
}

/* ====== 提示 ====== */
function showAlert(msg) {
    document.getElementById('alertTitle').textContent = '提示';
    document.getElementById('alertMsg').innerHTML = msg.replace(/\n/g, '<br>');
    document.getElementById('alertModal').classList.add('show');
}

function closeAlert() {
    document.getElementById('alertModal').classList.remove('show');
}

/* ====== 图片裁剪 ====== */
var _cropCB = null;
var _cropD = null;

function openCropModal(imgData, cb) {
    _cropCB = cb;
    var modal = document.getElementById('cropModal'), img = document.getElementById('cropImage');
    var container = document.getElementById('cropContainer'), box = document.getElementById('cropBox');
    img.onload = function() {
        var nw = img.naturalWidth, nh = img.naturalHeight;
        var cw = Math.min(580, nw), ch = cw * nh / nw;
        if (ch > 420) { ch = 420; cw = ch * nw / nh; }
        img.style.width = cw + 'px'; img.style.height = ch + 'px';
        container.style.width = cw + 'px'; container.style.height = ch + 'px';
        var ratio = 190 / 210, bw = cw * 0.85, bh = bw / ratio;
        if (bh > ch * 0.85) { bh = ch * 0.85; bw = bh * ratio; }
        box.style.width = bw + 'px'; box.style.height = bh + 'px';
        box.style.left = (cw - bw) / 2 + 'px'; box.style.top = (ch - bh) / 2 + 'px';
        _cropD = { cw: cw, ch: ch, nw: nw, nh: nh, bw: bw, bh: bh, ratio: ratio };
        box.onmousedown = function(ev) {
            ev.preventDefault();
            var sx = ev.clientX, sy = ev.clientY;
            var left = parseFloat(box.style.left) || 0, top = parseFloat(box.style.top) || 0;
            function mv(e) {
                var dx = e.clientX - sx, dy = e.clientY - sy;
                box.style.left = Math.max(0, Math.min(cw - bw, left + dx)) + 'px';
                box.style.top = Math.max(0, Math.min(ch - bh, top + dy)) + 'px';
            }
            function up() { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); }
            document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
        };
    };
    img.src = imgData;
    modal.classList.add('show');
}

function confirmCrop() {
    var modal = document.getElementById('cropModal'), img = document.getElementById('cropImage');
    var box = document.getElementById('cropBox'), d = _cropD;
    if (!d) return;
    var sx = parseFloat(box.style.left) / d.cw * d.nw, sy = parseFloat(box.style.top) / d.ch * d.nh;
    var sw = parseFloat(box.style.width) / d.cw * d.nw, sh = parseFloat(box.style.height) / d.ch * d.nh;
    var ca = document.createElement('canvas');
    ca.width = sw; ca.height = sh;
    var cx = ca.getContext('2d');
    cx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    var data = ca.toDataURL('image/jpeg', 0.92);
    var cb = _cropCB;
    closeCrop();
    if (cb) cb(data);
}

function closeCrop() {
    document.getElementById('cropModal').classList.remove('show');
    _cropCB = null;
    _cropD = null;
}

/* ====== 卡片编辑器 ====== */
function openCardEditor(type, id) {
    var old = document.getElementById('cardEditorOverlay');
    if (old) old.remove();
    var item = wa(type).find(function(x) { return x.id === id });
    if (!item) return;
    var title = item.name || item.event || item.title || '';
    var fields = getCardEditorFields(type);
    var h = '<div class="card-editor-header"><span>编辑：' + esc(title) + '</span><button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:#fff;border:none;" onclick="closeCardEditor()">✕ 收起</button></div><div class="card-editor-scroll">';
    if (type !== 'outline') {
        var img = item.image || '';
        h += '<div style="margin-bottom:4px;padding:4px 6px;background:var(--tag-bg);border-radius:6px;flex-shrink:0;"><span style="font-size:10px;color:var(--text2);">🖼</span>';
        if (img) h += '<img src="' + esc(img) + '" class="img-preview" onclick="window.open(\'' + esc(img) + '\')">';
        h += '<div class="img-actions"><button class="btn btn-sm" style="font-size:10px;padding:1px 6px;" onclick="_cardImgCtx={type:\'' + type + '\',id:\'' + id + '\'};document.getElementById(\'cardImageInput\').click()">📤</button>';
        if (img) h += '<button class="btn btn-sm" style="font-size:10px;padding:1px 6px;" onclick="removeCardImage(\'' + type + '\',\'' + id + '\')">🗑</button>';
        h += '</div></div>';
    }
    if (type === 'outline') {
        var tf = fields[0];
        h += '<label>' + tf.l + '</label><div contenteditable="true" class="ce-field ce-line" oninput="updateCardField(\'' + type + '\',\'' + id + '\',\'' + tf.k + '\',this.innerHTML)" onkeydown="if(event.key==\'Enter\')event.preventDefault()">' + (item[tf.k] || '') + '</div>';
        h += buildOT(id);
        var cf = fields[1];
        h += '<label style="margin-top:4px;">' + cf.l + '</label><div contenteditable="true" class="ce-field ce-field-grow" oninput="updateCardField(\'' + type + '\',\'' + id + '\',\'' + cf.k + '\',this.innerHTML)">' + (item[cf.k] || '') + '</div>';
    } else {
        fields.forEach(function(f) {
            var v = item[f.k] || '';
            h += '<label>' + f.l + '</label><div contenteditable="true" class="ce-field' + (f.t ? ' ce-field-grow' : ' ce-line') + '" oninput="updateCardField(\'' + type + '\',\'' + id + '\',\'' + f.k + '\',this.innerHTML)"' + (f.t ? '' : ' onkeydown="if(event.key==\'Enter\')event.preventDefault()"') + '>' + v + '</div>';
        });
    }
    h += '</div>';
    var ov = document.createElement('div');
    ov.id = 'cardEditorOverlay';
    ov.className = 'card-editor-overlay';
    ov.innerHTML = h;
    document.querySelector('.editor-scroll-container').appendChild(ov);
}

function closeCardEditor() {
    var ov = document.getElementById('cardEditorOverlay');
    if (ov) ov.remove();
    renderAllWorld();
}

function removeCardImage(type, id) {
    var item = wa(type).find(function(x) { return x.id === id });
    if (item) { item.image = ''; saveWorld(); openCardEditor(type, id); }
}

function updateCardField(type, id, field, value) {
    var item = wa(type).find(function(x) { return x.id === id });
    if (item) {
        var d = document.createElement('div');
        d.innerHTML = value;
        item[field] = (d.innerText || d.textContent || '');
        saveWorld();
    }
}

/* ====== 多选拾取器 ====== */
function openMultiPicker(callback) {
    var types = [{v:'char',l:'👤 人物'},{v:'loc',l:'📍 地点'},{v:'set',l:'⚙ 设定'},{v:'tl',l:'🕐 事件'},{v:'outline',l:'📋 大纲'}];
    var items = [];
    types.forEach(function(t) {
        var arr = world[worldKey(t.v)] || [];
        arr.forEach(function(it) {
            items.push({ type: t.v, typeLabel: t.l, id: it.id, label: (it.name||it.event||it.title||'?') });
        });
    });
    if (!items.length) { showAlert('还没有任何卡片可以导入'); return; }
    _mpItems = items;
    _mpCallback = callback;
    var h = '<div class="cp-overlay" id="mpOverlay"><div class="cp-box"><h3>📥 导入卡片到架构图</h3><div style="padding:0 16px 4px;display:flex;gap:6px;flex-shrink:0;"><button class="btn btn-sm" onclick="mpSelectAll(true)">全选</button><button class="btn btn-sm" onclick="mpSelectAll(false)">反选</button></div><div class="cp-list">';
    var ct = '';
    items.forEach(function(it, i) {
        if (it.typeLabel !== ct) { ct = it.typeLabel; h += '<div class="cp-group-label">' + ct + '</div>'; }
        h += '<label class="cp-item"><input type="checkbox" class="mp-cb" data-idx="' + i + '"><span class="cp-label">' + esc(it.label) + '</span></label>';
    });
    h += '</div><div class="cp-footer"><span id="mpCount" style="font-size:11px;color:var(--text2);flex:1;">已选 0 项</span><button class="btn" onclick="document.getElementById(\'mpOverlay\').remove()">取消</button><button class="btn accent" onclick="mpConfirm()">导入选中 (0)</button></div></div></div>';
    var div = document.createElement('div');
    div.innerHTML = h;
    document.body.appendChild(div.firstElementChild);
    document.querySelectorAll('.mp-cb').forEach(function(cb) { cb.onchange = mpUpdateCount; });
}

function mpUpdateCount() {
    var checked = document.querySelectorAll('.mp-cb:checked').length;
    var el = document.getElementById('mpCount');
    if (el) el.textContent = '已选 ' + checked + ' 项';
    var btn = document.querySelector('.cp-footer .accent');
    if (btn) btn.textContent = '导入选中 (' + checked + ')';
}

function mpSelectAll(val) {
    document.querySelectorAll('.mp-cb').forEach(function(cb) { cb.checked = val; });
    mpUpdateCount();
}

function mpConfirm() {
    var selected = [];
    document.querySelectorAll('.mp-cb:checked').forEach(function(cb) {
        var idx = parseInt(cb.dataset.idx);
        if (_mpItems && _mpItems[idx]) selected.push(_mpItems[idx]);
    });
    var ov = document.getElementById('mpOverlay');
    if (ov) ov.remove();
    if (selected.length && _mpCallback) _mpCallback(selected);
}

/* ====== 图片上传 ====== */
var _cardImgCtx = null;

function onCardImageSelected(e) {
    var file = e.target.files[0];
    if (!file || !_cardImgCtx) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        var item = wa(_cardImgCtx.type).find(function(x) { return x.id === _cardImgCtx.id });
        if (item) {
            item.image = ev.target.result;
            saveWorld();
            openCardEditor(_cardImgCtx.type, _cardImgCtx.id);
        }
        _cardImgCtx = null;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

/* ====== 查找替换 ====== */
function openReplaceDialog() { document.getElementById('replaceModal').classList.add('show'); }
function closeReplaceDialog() { document.getElementById('replaceModal').classList.remove('show'); }
function doReplace() {
    var f = document.getElementById('replaceFind').value;
    var r = document.getElementById('replaceWith').value;
    var s = document.getElementById('replaceScope').value;
    if (!f) { showAlert('请输入查找文字'); return; }
    var c = 0, re = new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (s === 'current') {
        autoSaveNow();
        var ch = getActiveChapter();
        if (!ch) return;
        var b = ch.content;
        ch.content = ch.content.replace(re, r);
        c = (b.match(re) || []).length;
        persistChapters();
        loadChapterToEditor();
    } else {
        chapters.forEach(function(ch) {
            var b = ch.content;
            ch.content = ch.content.replace(re, r);
            c += (b.match(re) || []).length;
        });
        persistChapters();
        loadChapterToEditor();
    }
    showAlert('替换完成，共 ' + c + ' 处');
    closeReplaceDialog();
}

/* ====== 窗口控制 ====== */
function toggleFs() { if(window.electronAPI)window.electronAPI.toggleFullscreen(); }
function toggleSettings(e) { e.stopPropagation(); document.getElementById('settingsDropdown').classList.toggle('show'); }
function hideSettings() { document.getElementById('settingsDropdown').classList.remove('show'); }
function ipcMinimize() { if(window.electronAPI)window.electronAPI.minimize(); }
function ipcClose() { if(window.electronAPI)window.electronAPI.close(); }

function stopAllDrag() {
    aDrag = false;
    if (resizing) {
        Storage.set('sc_layout', { left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--left-w')), right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--right-w')) });
        resizing = null;
    }
    if (_tRes) endTResize();
    _tMD = false;
    _tDrag = null;
    dChId = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.querySelectorAll('.resizer').forEach(function(r) { r.classList.remove('active'); });
    coStageMouseUp();
}

function startResize(side, e) {
    resizing = side;
    rsX = e.clientX;
    var p = side === 'left' ? '--left-w' : '--right-w';
    rsW = parseInt(getComputedStyle(document.documentElement).getPropertyValue(p));
    document.querySelectorAll('.resizer').forEach(function(r) { r.classList.add('active'); });
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
}

function handleEnterIndent(e) {
    if (e.key === 'Enter') {
        var n = document.getSelection().anchorNode;
        if (n && n.parentElement && n.parentElement.closest('li, td, th, table, [contenteditable="false"]')) return;
        e.preventDefault();
        document.execCommand('insertHTML', false, '<br>' + '　'.repeat(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--indent')) || 2));
    }
}

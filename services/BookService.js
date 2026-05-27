/* ===== 书籍服务 ===== *
 * 管理：书籍 CRUD、封面、书库数据加载
 */

/** 从 localStorage 加载书籍列表（含封面迁移） */
function loadBooks() {
    books = Storage.get('ns_books', []);
    activeBookId = Storage.get('ns_active_book', null);
    var mig = 0;
    books.forEach(function(b) {
        if (b.cover && typeof b.cover === 'string' && b.cover.length > 20000) {
            Storage.set('ns_cover_' + b.id, b.cover);
            b.cover = null;
            b.coverInIDB = 1;
            mig = 1;
        } else if (b.coverInIDB && b.cover) {
            b.cover = null;
            mig = 1;
        }
    });
    AppState.set('books', books);
    AppState.set('activeBookId', activeBookId);
    if (mig) {
        Storage.set('ns_books', books.map(function(x) {
            return x.coverInIDB ? Object.assign({}, x, { cover: null }) : x;
        }));
    }
}

/** 创建新书 */
function createBook() {
    showPrompt('书名', '新作', function(t) {
        if (!t) return;
        books.push({
            id: gid(),
            title: t,
            coverColor: '#' + (0x1000000 + Math.random() * 0xffffff).toString(16).slice(0, 6),
            cover: null
        });
        Storage.set('ns_books', books);
        AppState.set('books', books);
        renderShelf();
        // 同步到云端
        if (AuthService.isLoggedIn()) {
          var newBook = books[books.length - 1];
          AuthService._request('POST', '/api/books', {
            title: newBook.title, coverColor: newBook.coverColor
          }).then(function() {
            SyncService.triggerSync();
          }).catch(function(e) { Log.warn('Sync', '书籍同步失败', e); });
        }
    });
}

/** 打开书籍（带动画过渡） */
function animateOpenBook(el) {
    if (_ctxMenuOpen) return;
    refreshQuote();
    _bookOpening = true;
    setTimeout(function(){ _bookOpening = false }, 2000);
    el.classList.remove('hover-active');
    clearTimeout(el._hoverTimer);
    var id = el.dataset.id, rect = el.getBoundingClientRect();
    activeBookId = id;
    AppState.set('activeBookId', id);
    loadBookData();
    var ov = document.createElement('div');
    ov.className = 'book-overlay';
    document.body.appendChild(ov);
    requestAnimationFrame(function() {
        ov.style.opacity = '1';
        el.style.position = 'fixed';
        el.style.zIndex = '600';
        el.style.top = rect.top + 'px';
        el.style.left = rect.left + 'px';
        el.style.width = rect.width + 'px';
        el.style.height = rect.height + 'px';
        el.style.margin = '0';
        void el.offsetHeight;
        var aspect = rect.height / rect.width, vw = window.innerWidth, vh = window.innerHeight;
        var targetW = vw * 1.15, targetH = targetW * aspect;
        if (targetH < vh * 1.15) {
            targetH = vh * 1.15;
            targetW = targetH / aspect;
        }
        el.style.transition = 'all .7s cubic-bezier(.34,1.56,.64,1)';
        el.style.top = (vh - targetH) / 2 + 'px';
        el.style.left = (vw - targetW) / 2 + 'px';
        el.style.width = targetW + 'px';
        el.style.height = targetH + 'px';
        el.style.boxShadow = 'var(--card-shadow-open)';
        el.style.borderRadius = '20px';
    });
    var transEnd = function h(e) {
        if (e.propertyName === 'width' || e.propertyName === 'height') {
            el.removeEventListener('transitionend', h);
            ov.remove();
            _bookOpening = false;
            openBook(id);
        }
    };
    el.addEventListener('transitionend', transEnd);
}

/** 打开书籍（实际加载） */
function openBook(bid) {
    activeBookId = bid;
    Storage.set('ns_active_book', bid);
    AppState.set('activeBookId', bid);
    CommandSystem.clear();
    loadBookData();
    EventBus.emit('chapterTree:changed');
    EventBus.emit('chapter:activated', activeId);
    EventBus.emit('world:allChanged');
    document.getElementById('shelfView').style.display = 'none';
    document.getElementById('editorView').classList.add('show');
    document.getElementById('backToShelfBtn').style.display = 'inline-block';
    document.getElementById('topbar').classList.add('in-editor');
    var b = books.find(function(x){return x.id===bid});
    var t = document.getElementById('topbarTitle');
    if(b) t.textContent = b.title;
    EventBus.emit('book:opened', bid);
}

/** 返回书架 */
function backToShelf() {
    autoSaveNow();
    closeCanvasOverlay();
    document.getElementById('shelfView').style.display = 'flex';
    document.getElementById('editorView').classList.remove('show');
    document.getElementById('backToShelfBtn').style.display = 'none';
    document.getElementById('topbar').classList.remove('in-editor');
    document.getElementById('topbarTitle').textContent = '我的书库';
    renderShelf();
    EventBus.emit('book:closed');
}

/** 加载当前书籍的完整数据 */
function loadBookData() {
    if (!activeBookId) return;
    var p = pf();
    volumes = Storage.get(p + 'volumes', []);
    chapters = Storage.get(p + 'chapters', []);
    activeId = Storage.get(p + 'active', null);
    if (!volumes.length) {
        volumes.push({ id: gid(), title: '第一卷', order: 1 });
        Storage.set(p + 'volumes', volumes);
    }
    if (!chapters.length) {
        var c = { id: gid(), title: '启程', content: '', summary: '', volumeId: volumes[0].id, order: 1 };
        chapters = [c];
        activeId = c.id;
        persistChapters();
    }
    if (!chapters.find(function(c) { return c.id === activeId }))
        activeId = chapters[0].id;
    ['chars', 'locs', 'sets', 'tl', 'outline'].forEach(function(k) {
        world[k] = Storage.get(p + 'world_' + k, []);
    });
    AppState.set('volumes', volumes);
    AppState.set('chapters', chapters);
    AppState.set('activeId', activeId);
    AppState.set('world', world);
}

/** 保存章节元数据 */
function persistChapters() {
    if (!activeBookId) return;
    Storage.set(pf() + 'chapters', chapters);
    AppState.set('chapters', chapters);
    Storage.set(pf() + 'active', activeId);
    AppState.set('activeId', activeId);
}

/** 导入 TXT 书籍 */
function importTxtBook() { document.getElementById('txtFileInput').click(); }
function onTxtFileSelected(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        var content = ev.target.result;
        var title = file.name.replace(/\.txt$/i, '');
        var book = {
            id: gid(),
            title: title || '导入作品',
            coverColor: '#' + (0x1000000 + Math.random() * 0xffffff).toString(16).slice(0, 6),
            cover: null
        };
        books.push(book);
        Storage.set('ns_books', books);
        AppState.set('books', books);
        var volume = { id: gid(), title: '第一卷', order: 1 };
        var chapter = { id: gid(), title: '第一章', content: content, summary: '', volumeId: volume.id, order: 1 };
        var p = 'ns_book_' + book.id + '_';
        Storage.set(p + 'volumes', [volume]);
        Storage.set(p + 'chapters', [chapter]);
        Storage.set(p + 'active', chapter.id);
        ['chars','locs','sets','tl','outline'].forEach(function(k){ Storage.set(p + 'world_' + k, []) });
        renderShelf();
    };
    reader.readAsText(file);
    e.target.value = '';
}

/** 悬停效果 */
function startBookHover(el) {
    if (_bookOpening || _ctxMenuOpen) return;
    clearTimeout(el._hoverTimer);
    el._hoverTimer = setTimeout(function() { el.classList.add('hover-active') }, 150);
}
function endBookHover(el) {
    clearTimeout(el._hoverTimer);
    el.classList.remove('hover-active');
}

/** 右键菜单操作 */
function showBookCtx(e, bid) {
    _ctxMenuOpen = true;
    ctxB = bid;
    var m = $ctx;
    m.innerHTML = '<div onclick="ctxRenameBook()">✎ 重命名</div><div onclick="ctxBookCover()">🎨 封面</div><div class="danger" onclick="ctxDeleteBook()">✕ 删除</div>';
    m.style.left = Math.min(e.clientX, window.innerWidth - 160) + 'px';
    m.style.top = Math.min(e.clientY, window.innerHeight - 120) + 'px';
    m.classList.add('show');
    $ctxBd.classList.add('show');
}
function ctxRenameBook() {
    var b = books.find(function(b) { return b.id === ctxB });
    if (b) {
        showPrompt('新书名', b.title, function(n) {
            if (n) { b.title = n; Storage.set('ns_books', books); renderShelf(); }
        });
    }
    hideCtxMenu();
}
function ctxBookCover() {
    _coverBookId = ctxB;
    document.getElementById('bookCoverInput').click();
    hideCtxMenu();
}
function onBookCoverSelected(e) {
    var file = e.target.files[0];
    if (!file || !_coverBookId) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        openCropModal(ev.target.result, function(cropped) {
            var b = books.find(function(x) { return x.id === _coverBookId });
            if (b) {
                b.cover = cropped;
                b.coverColor = '';
                if (cropped.length > 8000) {
                    b.coverInIDB = 1;
                    Storage.setAsync('ns_cover_' + b.id, cropped);
                    var meta = JSON.parse(JSON.stringify(books));
                    meta.forEach(function(x) { if (x.id === _coverBookId) x.cover = null });
                    Storage.set('ns_books', meta);
                } else {
                    b.coverInIDB = 0;
                    Storage.set('ns_books', books);
                }
                renderShelf();
            }
            _coverBookId = null;
        });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}
function ctxDeleteBook() {
    hideCtxMenu();
    var id = ctxB;
    showConfirm('确认删除该书？所有章节和世界设定将被删除。', '确认删除', function(ok) {
        if (!ok) return;
        var p = 'ns_book_' + id + '_';
        ['volumes', 'chapters', 'world_chars', 'world_locs', 'world_sets', 'world_tl', 'world_outline', 'active'].forEach(function(k) {
            Storage.del(p + k);
        });
        var chs = Storage.get(p + 'chapters', []);
        chs.forEach(function(ch) {
            Storage.del('ns_content_' + id + '_' + ch.id);
        });
        Storage.del('ns_cover_' + id);
        ['world_chars','world_locs','world_sets','world_tl','world_outline'].forEach(function(k) { Storage.del(p + k) });
        books = books.filter(function(b) { return b.id !== id });
        Storage.set('ns_books', books);
        AppState.set('books', books);
        renderShelf();
        // 从云端删除
        if (AuthService.isLoggedIn()) {
          AuthService._request('DELETE', '/api/books/' + id).catch(function(e) { Log.warn('Sync', '云端删除失败', e); });
        }
    });
}

/** 加载延迟封面（IndexedDB 中的封面图） */
function loadPendingCovers() {
    var ids = [];
    for (var i = 0; i < books.length; i++)
        if (books[i].coverInIDB && !books[i].cover) ids.push(books[i].id);
    if (!ids.length) return;
    var left = ids.length;
    ids.forEach(function(id) {
        Storage.getAsync('ns_cover_' + id, null).then(function(data) {
            var b = books.find(function(x) { return x.id === id });
            if (b && data) b.cover = data;
            left--;
            if (left <= 0) renderShelf();
        });
    });
}

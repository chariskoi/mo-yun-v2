/* ===== 书架视图 ===== *
 * 管理：书架渲染、书籍卡片、名言面板
 */

function renderShelf() {
    var g = document.getElementById('shelfGrid');
    if (!books.length) {
        g.innerHTML = '<div style="padding:40px;color:var(--text2);">暂无作品</div>';
        loadPendingCovers();
        renderQuote();
        return;
    }
    g.innerHTML = books.map(function(b) {
        var n = (Storage.get('ns_book_' + b.id + '_chapters', [])).length;
        var cv = b.cover ? 'background-image:url(' + b.cover + ')' : 'background:' + (b.coverColor || '#8b5a2b');
        return '<div class="book-card" data-id="' + b.id + '" onmouseenter="startBookHover(this)" onmouseleave="endBookHover(this)" onclick="animateOpenBook(this)" oncontextmenu="event.preventDefault();showBookCtx(event,\'' + b.id + '\')"><div class="book-cover" style="' + cv + '"></div><div class="book-info"><h4>' + esc(b.title) + '</h4><div style="font-size:12px;color:var(--text2);">' + n + '章</div></div></div>';
    }).join('');
    loadPendingCovers();
    renderQuote();
}

/* ====== 名言面板 ====== */
function renderQuote() {
    var today = new Date();
    var ds = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var off = parseInt(Storage.get('sc_quote_off','0'));
    var lastDay = Storage.get('sc_quote_day','');
    if (lastDay !== ds) { off = 0; Storage.set('sc_quote_off','0'); Storage.set('sc_quote_day',ds); }
    var idx = (Math.abs(hashStr(ds))+off) % _quotes.length;
    var q = _quotes[idx];
    document.getElementById('quoteText').textContent = '「'+q.q+'」';
    document.getElementById('quoteSource').textContent = '—— '+q.s;
}

function refreshQuote() {
    var today = new Date();
    var ds = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var off = parseInt(Storage.get('sc_quote_off','0'))+1;
    Storage.set('sc_quote_off',off+'');
    Storage.set('sc_quote_day',ds);
    renderQuote();
}

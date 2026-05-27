/* ===== 同步服务 ===== *
 * 管理：云端数据上传/下载/防抖
 */

var SyncService = {
  _syncTimer: null,

  /** 下载用户所有书籍+数据 → 覆盖本地 */
  downloadAllData: async function() {
    if (!AuthService.isLoggedIn()) return;
    var data = await AuthService._request('GET', '/api/sync/data');
    var books = data.books || [];
    var bookData = data.bookData || {};

    // 写入书籍列表
    Storage.set('ns_books', books);
    AppState.set('books', books);

    // 为每本书写入数据
    Object.keys(bookData).forEach(function(bookId) {
      var bd = bookData[bookId];
      if (!bd) return;
      var p = 'ns_book_' + bookId + '_';

      if (bd.volumes !== undefined) Storage.set(p + 'volumes', bd.volumes);
      if (bd.chapters !== undefined) Storage.set(p + 'chapters', bd.chapters);
      if (bd.active !== undefined) Storage.set(p + 'active', bd.active);

      // world
      if (bd.world) {
        ['chars', 'locs', 'sets', 'tl', 'outline', 'canvas'].forEach(function(k) {
          if (bd.world[k] !== undefined) Storage.set(p + 'world_' + k, bd.world[k]);
        });
      }

      // contents
      if (bd.contents) {
        Object.keys(bd.contents).forEach(function(chId) {
          Storage.set('ns_content_' + bookId + '_' + chId, bd.contents[chId]);
        });
      }
    });
  },

  /** 上传当前用户的所有本地书籍到云端（注册后调用） */
  uploadAllData: async function() {
    if (!AuthService.isLoggedIn()) return;
    var localBooks = Storage.get('ns_books', []);

    for (var i = 0; i < localBooks.length; i++) {
      var book = localBooks[i];
      // 先确保云端有这本书
      try {
        await AuthService._request('POST', '/api/books', {
          title: book.title, coverColor: book.coverColor || '#8b5a2b'
        });
      } catch (e) {
        // 可能已存在，继续
      }
      // 上传数据
      await this._uploadBook(book.id);
    }
  },

  /** 上传当前书籍（自动保存后调用，2s 防抖） */
  triggerSync: function() {
    if (!AuthService.isLoggedIn() || !activeBookId) return;
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(this._doSync.bind(this), 2000);
  },

  _doSync: function() {
    if (!activeBookId || !AuthService.isLoggedIn()) return;
    this._uploadBook(activeBookId).then(function() {
      _lastSyncTime = Date.now();
      _syncInProgress = false;
    }).catch(function(e) {
      _syncInProgress = false;
      Log.warn('Sync', '同步失败', e.message);
    });
  },

  /** 上传单本书的全部数据 */
  _uploadBook: async function(bookId) {
    var p = 'ns_book_' + bookId + '_';
    var data = {
      volumes: Storage.get(p + 'volumes', []),
      chapters: Storage.get(p + 'chapters', []),
      active: Storage.get(p + 'active', null),
      world: {
        chars: Storage.get(p + 'world_chars', []),
        locs: Storage.get(p + 'world_locs', []),
        sets: Storage.get(p + 'world_sets', []),
        tl: Storage.get(p + 'world_tl', []),
        outline: Storage.get(p + 'world_outline', []),
        canvas: Storage.get(p + 'world_canvas', [])
      },
      contents: {}
    };

    // 收集章节内容
    var chapters = data.chapters || [];
    for (var i = 0; i < chapters.length; i++) {
      var content = Storage.get('ns_content_' + bookId + '_' + chapters[i].id, null);
      if (content !== null) data.contents[chapters[i].id] = content;
    }

    await AuthService._request('POST', '/api/sync/data', {
      bookId: bookId,
      data: data
    });
  }
};

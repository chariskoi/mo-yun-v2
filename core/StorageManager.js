/* ===== 存储管理器 ===== *
 * 统一管理 localStorage 和 IndexedDB 的读写
 * 负责：数据持久化、缓存管理、大容量存储自动切换
 */

var idb = null;

/** 打开 IndexedDB 连接 */
function openIDB() {
    return new Promise(function(ok, no) {
        var r = indexedDB.open('SCDB', 2);
        r.onupgradeneeded = function(e) {
            if (!e.target.result.objectStoreNames.contains('kv'))
                e.target.result.createObjectStore('kv');
        };
        r.onsuccess = function(e) { idb = e.target.result; ok(idb) };
        r.onerror = function(e) { no(e) };
    });
}

/** IndexedDB 读取 */
async function idbGet(k, d) {
    if (!idb) await openIDB();
    return new Promise(function(ok) {
        var t = idb.transaction('kv', 'readonly').objectStore('kv').get(k);
        t.onsuccess = function() { ok(t.result !== undefined ? t.result : d) };
        t.onerror = function() { ok(d) };
    });
}

/** IndexedDB 写入 */
async function idbSet(k, v) {
    if (!idb) await openIDB();
    idb.transaction('kv', 'readwrite').objectStore('kv').put(v, k);
}

/** IndexedDB 删除 */
async function idbDel(k) {
    if (!idb) await openIDB();
    idb.transaction('kv', 'readwrite').objectStore('kv').delete(k);
}

/** localStorage 读取（自动 JSON 解析） */
function lsGet(k, d) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d }
    catch (e) { return d }
}

/** localStorage 写入（自动 JSON 序列化） */
function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {}
}

/** 保存世界数据（自动降级到大存储） */
function saveWorld() {
    if (!activeBookId) return;
    Object.keys(world).forEach(function(k) {
        Storage.set(pf() + 'world_' + k, world[k]);
    });
    AppState.set('world', world);
}

/** 保存所有状态（编辑内容 + 世界数据 + 章节元数据） */
function autoSaveNow() {
    var ch = getActiveChapter();
    if (!ch) return;
    ch.title = document.getElementById('chapterTitleDisplay').innerText.trim();
    ch.content = $ed.innerHTML;
    Storage.set('ns_content_' + activeBookId + '_' + ch.id, ch.content);
    persistChapters();
    saveWorld();
    document.getElementById('saveIndicator').style.opacity = '1';
    setTimeout(function() { document.getElementById('saveIndicator').style.opacity = '0' }, 1000);
}

function manualSave() {
    autoSaveNow();
    document.getElementById('saveIndicator').textContent = '✓ 已全部保存';
    document.getElementById('saveIndicator').style.opacity = '1';
    if (AuthService.isLoggedIn()) {
      document.getElementById('saveIndicator').textContent = '⏳ 同步中...';
      SyncService._uploadBook(activeBookId).then(function() {
        _lastSyncTime = Date.now();
        document.getElementById('saveIndicator').textContent = '✓ 已同步';
      }).catch(function() {
        document.getElementById('saveIndicator').textContent = '⚠ 同步失败';
      });
    }
    setTimeout(function() {
        document.getElementById('saveIndicator').textContent = '✓ 已保存';
        document.getElementById('saveIndicator').style.opacity = '0';
    }, 1500);
}

/* ====== 统一存储抽象层 ====== */

var Storage = {
    /** 读取（同步：优先 localStorage，大容量数据走 IDB 需用 getAsync） */
    get: function(key, def) {
        return lsGet(key, def);
    },

    /** 写入（自动路由：≤30KB → localStorage，更大 → IndexedDB） */
    set: function(key, value) {
        try {
            var str = JSON.stringify(value);
            if (str.length > 30000) {
                idbSet(key, value).catch(function() {});
                return;
            }
            localStorage.setItem(key, str);
        } catch (e) {
            // localStorage 满 → 降级到 IDB
            idbSet(key, value).catch(function() {});
        }
    },

    /** 异步读取（先 IDB 再 localStorage） */
    getAsync: async function(key, def) {
        var v = await idbGet(key, undefined);
        if (v !== undefined) return v;
        return lsGet(key, def);
    },

    /** 异步写入（强制走 IDB） */
    setAsync: function(key, value) {
        return idbSet(key, value);
    },

    /** 删除（从两个存储中同时移除） */
    del: function(key) {
        localStorage.removeItem(key);
        idbDel(key).catch(function() {});
    },

    /** 写入并自动路由（兼容 async/await） */
    setAuto: async function(key, value) {
        try {
            var str = JSON.stringify(value);
            if (str.length > 30000) {
                await idbSet(key, value);
            } else {
                localStorage.setItem(key, str);
            }
        } catch (e) {
            await idbSet(key, value);
        }
    }
};

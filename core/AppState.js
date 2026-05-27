/* ===== 统一状态中心 ===== *
 * 提供状态的统一读写入口，变更时通过 EventBus 通知
 * 不替代现有全局变量，旧代码继续可用，逐步迁移
 */

function AppState() {
    this._data = {
        books: [],
        activeBookId: null,
        volumes: [],
        chapters: [],
        activeId: null,
        world: { chars: [], locs: [], sets: [], tl: [], outline: [], canvas: [] },
        editor: {
            fontSize: 15,
            lineHeight: 1.85
        }
    };
}

/** 读取状态：AppState.get('editor.fontSize') */
AppState.prototype.get = function(path) {
    var parts = path.split('.');
    var val = this._data;
    for (var i = 0; i < parts.length; i++) {
        if (val == null) return undefined;
        val = val[parts[i]];
    }
    return val;
};

/** 写入状态：AppState.set('editor.fontSize', 16) → 自动触发事件 */
AppState.prototype.set = function(path, value) {
    var parts = path.split('.');
    var key = parts.pop();
    var target = this._data;
    for (var i = 0; i < parts.length; i++) {
        if (target[parts[i]] == null) target[parts[i]] = {};
        target = target[parts[i]];
    }
    var old = target[key];
    if (old === value) return;
    target[key] = value;
    EventBus.emit('stateChanged', { path: path, value: value, old: old });
};

/** 直接引用内部数据（用于批量操作场景） */
AppState.prototype.raw = function() {
    return this._data;
};

var AppState = new AppState();

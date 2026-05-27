/* ===== 命令系统 ===== *
 * 将操作封装为可撤销/重做的命令对象
 * 每个命令包含 name、exec 和 undo 方法
 *
 * 用法：
 *   CommandSystem.exec({
 *       name: 'addChapter',
 *       exec: function(ctx) { ... },
 *       undo: function(ctx) { ... },
 *       data: { ... }
 *   });
 *
 *  CommandSystem.undo();
 *  CommandSystem.redo();
 */

var CommandSystem = {
    _stack: [],
    _cursor: -1,

    /** 执行一个命令并压入栈 */
    exec: function(cmd) {
        if (!cmd || typeof cmd.exec !== 'function') return;
        // 丢弃 cursor 之后的命令（新操作分支）
        this._stack.length = this._cursor + 1;
        cmd.exec(cmd.data || {});
        this._stack.push(cmd);
        this._cursor = this._stack.length - 1;
    },

    /** 撤销上一个命令 */
    undo: function() {
        if (this._cursor < 0) return;
        var cmd = this._stack[this._cursor];
        if (typeof cmd.undo === 'function') {
            cmd.undo(cmd.data || {});
        }
        this._cursor--;
    },

    /** 重做下一个命令 */
    redo: function() {
        if (this._cursor + 1 >= this._stack.length) return;
        var cmd = this._stack[this._cursor + 1];
        if (typeof cmd.exec === 'function') {
            cmd.exec(cmd.data || {});
        }
        this._cursor++;
    },

    /** 清空命令栈 */
    clear: function() {
        this._stack = [];
        this._cursor = -1;
    },

    /** 获取当前栈状态 */
    canUndo: function() { return this._cursor >= 0; },
    canRedo: function() { return this._cursor + 1 < this._stack.length; }
};

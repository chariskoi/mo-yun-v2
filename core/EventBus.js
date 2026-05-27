/* ===== 事件总线 ===== *
 * 解耦模块间通信的发布/订阅系统
 * 用法: EventBus.on('chapter:switched', fn) / EventBus.emit('chapter:switched', id)
 */

var EventBus = (function() {
    var _handlers = {};

    return {
        /** 订阅事件 */
        on: function(event, fn) {
            if (!_handlers[event]) _handlers[event] = [];
            _handlers[event].push(fn);
            return function() { // 返回取消订阅函数
                _handlers[event] = _handlers[event].filter(function(h) { return h !== fn });
            };
        },

        /** 发布事件 */
        emit: function(event, data) {
            var list = _handlers[event];
            if (list) {
                list.forEach(function(fn) { fn(data) });
            }
        },

        /** 一次性订阅 */
        once: function(event, fn) {
            var off = this.on(event, function(data) {
                off();
                fn(data);
            });
        },

        /** 清除所有事件 */
        clear: function() {
            _handlers = {};
        }
    };
})();

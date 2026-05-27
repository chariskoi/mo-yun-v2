/* ===== 统一日志系统 ===== */

var Logger = {
    _enabled: true,
    _level: 2, // 0=debug, 1=info, 2=warn, 3=error
    _levels: ['DEBUG', 'INFO', 'WARN', 'ERROR'],

    /** 配置：enable=false 关闭日志；level='debug'|'info'|'warn'|'error' */
    config: function(opts) {
        if (opts.enable !== undefined) this._enabled = !!opts.enable;
        if (opts.level) {
            var i = this._levels.indexOf(opts.level.toUpperCase());
            if (i >= 0) this._level = i;
        }
    },

    _log: function(lvl, tag, msg, data) {
        if (!this._enabled || lvl < this._level) return;
        var ts = new Date().toISOString().slice(11, 19);
        var prefix = '[' + ts + '][' + this._levels[lvl] + ']';
        if (data !== undefined) {
            console[this._levels[lvl].toLowerCase()](prefix, tag, msg, data);
        } else {
            console[this._levels[lvl].toLowerCase()](prefix, tag, msg);
        }
    },

    debug: function(tag, msg, data) { this._log(0, tag, msg, data); },
    info:  function(tag, msg, data) { this._log(1, tag, msg, data); },
    warn:  function(tag, msg, data) { this._log(2, tag, msg, data); },
    error: function(tag, msg, data) { this._log(3, tag, msg, data); }
};

// 暴露简写（可选）
var Log = Logger;

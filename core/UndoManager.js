/* ===== 撤销/重做管理器 ===== */

function saveUndoState() {
    if (_undoLock) return;
    var el = $ed;
    if (!el) return;
    var c = el.innerHTML;
    if (_undoStack.length > 0 && _undoStack[_undoStack.length - 1] === c) return;
    _undoStack.push(c);
    if (_undoStack.length > _undoMax) _undoStack.shift();
    _redoStack = [];
}

function undoContent() {
    var el = $ed;
    if (!el) return;
    var c = el.innerHTML;
    while (_undoStack.length > 0 && _undoStack[_undoStack.length - 1] === c) _undoStack.pop();
    if (_undoStack.length === 0) return;
    _redoStack.push(c);
    _undoLock = true;
    el.innerHTML = _undoStack.pop();
    _undoLock = false;
    updateWordCount();
}

function redoContent() {
    var el = $ed;
    if (!el) return;
    var c = el.innerHTML;
    while (_redoStack.length > 0 && _redoStack[_redoStack.length - 1] === c) _redoStack.pop();
    if (_redoStack.length === 0) return;
    _undoStack.push(c);
    _undoLock = true;
    el.innerHTML = _redoStack.pop();
    _undoLock = false;
    updateWordCount();
}

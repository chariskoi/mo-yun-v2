/* ===== 世界观数据服务 ===== *
 * 管理：人物、地点、设定、时间线、大纲的 CRUD（纯数据逻辑）
 *
 * 通知约定：
 *   EventBus.emit('world:dataChanged', type) — type: chars/locs/sets/tl/outline
 *   EventBus.emit('world:allChanged')
 *   EventBus.emit('world:itemsReordered', type)
 */

function addCharacter() {
    CommandWorld.addCharacter();
}
function delCharacter(id) {
    CommandWorld.deleteCharacter(id);
}

function addLocation() {
    CommandWorld.addLocation();
}
function delLocation(id) {
    CommandWorld.deleteLocation(id);
}

function addSetting() {
    CommandWorld.addSetting();
}
function delSetting(id) {
    CommandWorld.deleteSetting(id);
}

function addTimeline() {
    CommandWorld.addTimeline();
}
function delTimeline(id) {
    CommandWorld.deleteTimeline(id);
}

function addOutline(level) {
    CommandWorld.addOutline(level);
}
function delOutline(id) {
    CommandWorld.deleteOutline(id);
}

function reorderWorldItems(type, id, targetId) {
    var arr = wa(type);
    var tIdx = arr.findIndex(function(x) { return x.id === targetId });
    var mIdx = arr.findIndex(function(x) { return x.id === id });
    if (tIdx < 0 || mIdx < 0) return;
    var item = arr.splice(mIdx, 1)[0];
    arr.splice(arr.findIndex(function(x) { return x.id === targetId }), 0, item);
    for (var i = 0; i < arr.length; i++) arr[i].order = i + 1;
    saveWorld();
    EventBus.emit('world:dataChanged', type);
}

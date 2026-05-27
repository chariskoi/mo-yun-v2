/* ===== 通用工具函数 ===== */

/** 生成唯一ID */
function gid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** HTML转义 */
function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 简单的字符串哈希 */
function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h |= 0;
    }
    return h;
}

/** 从HTML提取纯文本 */
function plainText(html) {
    var d = document.createElement('div');
    d.innerHTML = html || '';
    return d.innerText || d.textContent || '';
}

/** 世界类型映射 */
function wa(t) {
    var map = { char: 'chars', loc: 'locs', set: 'sets', tl: 'tl', outline: 'outline', canvas: 'canvas' };
    return world[map[t]] || [];
}

/** 当前书籍前缀 */
function pf() {
    return activeBookId ? 'ns_book_' + activeBookId + '_' : '';
}

/** 世界类型 → 图标映射 */
function worldIcon(type) {
    return { char: '👤', loc: '📍', set: '⚙', tl: '🕐', outline: '📋', canvas: '🕸' }[type] || '📌';
}

/** 世界类型 → 文字标签 */
function worldLabel(type) {
    return { char: '人物', loc: '地点', set: '设定', tl: '事件', outline: '大纲' }[type] || type;
}

/** 根据世界类型获取数组Key */
function worldKey(type) {
    return { char: 'chars', loc: 'locs', set: 'sets', tl: 'tl', outline: 'outline' }[type] || '';
}

/** 计算章节字数 */
function countChWords(ch) {
    var t = ch.content || '';
    return t.replace(/<[^>]*>/g, '').replace(/\s/g, '').length;
}

/** 计算卡片字数 */
function countCardWords(item) {
    var t = '';
    var skip = { id: 1, image: 1, order: 1, sortNum: 1, era: 1 };
    for (var k in item) {
        if (typeof item[k] === 'string' && !skip[k]) t += item[k].replace(/<[^>]*>/g, '');
    }
    return t.replace(/\s/g, '').length;
}

/** 自动命名 */
function autoName(type) {
    if (!autoCt[type]) autoCt[type] = wa(type).length;
    autoCt[type]++;
    return worldLabel(type) + autoCt[type];
}

/** 获取卡片编辑器字段配置 */
function getCardEditorFields(type) {
    if (type === 'outline') return [{ k: 'title', l: '标题' }, { k: 'content', l: '详细内容', t: !0 }];
    return [{ k: 'name', l: '名称' }, { k: 'content', l: '', t: !0 }];
}

/** 根据类型和引用ID查找世界数据项 */
function findWorldItem(type, id) {
    var arr = world[worldKey(type)];
    if (!arr) return null;
    return arr.find(function(x) { return x.id === id }) || null;
}

/* ===== AI 服务 ===== *
 * 管理：AI API 配置、对话生成、提示词组装
 */

function toggleAiFloat() {
    var f = document.getElementById('aiFloat');
    f.classList.toggle('show');
    if (f.classList.contains('show')) {
        var ek = Storage.get('ns_ai_key', '');
        try { ek = atob(ek) } catch (e) {}
        document.getElementById('aiApiKey').value = ek;
        document.getElementById('aiEndpoint').value = Storage.get('ns_ai_endpoint', 'https://api.deepseek.com/chat/completions');
        document.getElementById('aiModel').value = Storage.get('ns_ai_model', 'deepseek-chat');
        renderAiChips();
    }
}

function saveAiConfig() {
    var key = document.getElementById('aiApiKey').value.trim();
    Storage.set('ns_ai_key', btoa(key));
    Storage.set('ns_ai_endpoint', document.getElementById('aiEndpoint').value.trim());
    Storage.set('ns_ai_model', document.getElementById('aiModel').value.trim());
}

function renderAiChips() {
    var zone = document.getElementById('aiDropZone');
    zone.innerHTML = aiChips.length === 0
        ? '<span style="font-size:11px;color:var(--text2);">拖拽卡片到此区域</span>'
        : aiChips.map(function(c, i) {
            return '<span class="ai-chip"><span title="' + esc(c.text) + '">' + esc(c.label) + '</span><span style="cursor:pointer;" onclick="delAiChip(' + i + ')">✕</span></span>';
          }).join('');
}

function delAiChip(i) {
    aiChips.splice(i, 1);
    renderAiChips();
}

function onAiDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    var raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    var parts = raw.split(':'), type = parts[0], id = parts.slice(1).join(':');
    var item = null, label = '', text = '', color = chipColors[type] || '#888';
    if (type == 'char')       { item = world.chars.find(function(c) { return c.id === id }); label = item ? item.name : ''; }
    else if (type == 'loc')   { item = world.locs.find(function(l) { return l.id === id }); label = item ? item.name : ''; }
    else if (type == 'set')   { item = world.sets.find(function(s) { return s.id === id }); label = item ? item.name : ''; }
    else if (type == 'tl')    { item = world.tl.find(function(t) { return t.id === id }); label = item ? item.event : ''; }
    else if (type == 'outline') { item = world.outline.find(function(o) { return o.id === id }); label = item ? item.title : ''; }
    else if (type == 'summary') { item = chapters.find(function(c) { return c.id === id }); label = item ? (item.title + '梗概') : ''; text = item ? (item.summary || '') : ''; }
    text = text || (item ? Object.values(item).filter(function(v) { return typeof v == 'string' }).join(' ') : '');
    if (!label) return;
    if (aiChips.find(function(c) { return c.id === id && c.type === type })) return;
    aiChips.push({ type: type, id: id, label: label, text: text, color: color });
    renderAiChips();
}

async function aiAction(action) {
    saveAiConfig();
    var kk = Storage.get('ns_ai_key', ''), key = kk;
    try { key = atob(kk) } catch (e) { key = kk }
    var ep = document.getElementById('aiEndpoint').value.trim();
    var md = document.getElementById('aiModel').value.trim();
    if (!key) { showAlert('请先配置API Key'); return }
    var ed = $ed, sel = window.getSelection(), st = sel.toString().trim();
    var ft = ed.innerText.trim();
    var ctx = aiChips.map(function(c) { return '【' + c.label + '】\n' + c.text }).join('\n\n');
    var inst = document.getElementById('aiInstruction').value.trim();
    var prompt = '';
    if (action == 'custom') {
        if (!inst && !ctx) { showAlert('请输入指令或导入卡片'); return }
        prompt = inst + (ctx ? '\n\n参考卡片：\n' + ctx : '') + (ft ? '\n\n当前：\n' + ft.slice(-1500) : '');
    } else if (action == 'continue') {
        prompt = '请用中文续写（200-500字），保持文风。' + (inst ? '\n要求：' + inst : '') + '\n\n' + ft.slice(-1500) + (ctx ? '\n\n参考：\n' + ctx : '');
    } else if (action == 'polish') {
        if (!st && !ctx) { showAlert('请选中文字或导入卡片'); return }
        prompt = '请润色以下段落。' + (inst ? '\n要求：' + inst : '') + '\n\n' + (st || ctx);
    } else if (action == 'expand') {
        if (!st && !ctx) { showAlert('请选中文字或导入卡片'); return }
        prompt = '请扩写（约2倍）。' + (inst ? '\n要求：' + inst : '') + '\n\n' + (st || ctx);
    } else if (action == 'summarize') {
        if (!st && !ctx) { showAlert('请选中文字或导入卡片'); return }
        prompt = '请缩写。' + (inst ? '\n要求：' + inst : '') + '\n\n' + (st || ctx);
    }
    document.getElementById('aiOutput').textContent = '⏳ 生成中…';
    try {
        var resp = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
            body: JSON.stringify({
                model: md,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 2000,
                temperature: 0.8
            })
        });
        var data = await resp.json();
        if (data.choices && data.choices[0])
            document.getElementById('aiOutput').textContent = data.choices[0].message.content;
        else
            document.getElementById('aiOutput').textContent = '❌ API异常';
    } catch (e) {
        document.getElementById('aiOutput').textContent = '❌ 失败：' + e.message;
    }
}

function insertAiOutput() {
    saveUndoState();
    var t = document.getElementById('aiOutput').textContent;
    if (t && !t.startsWith('❌') && !t.startsWith('⏳')) {
        $ed.focus();
        document.execCommand('insertHTML', false, t.replace(/\n/g, '<br>'));
        onEditorInput();
    }
}

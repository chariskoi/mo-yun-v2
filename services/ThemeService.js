/* ===== 主题服务 ===== *
 * 管理：主题切换、背景图片、主题按钮状态
 */

function setActiveThemeBtn(t) {
    document.querySelectorAll('.theme-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.theme === t);
    });
}

function changeTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    Storage.set('sc_theme', t);
    setActiveThemeBtn(t);
    EventBus.emit('theme:changed', t);
}

function loadTheme() {
    var t = Storage.get('sc_theme', 'light');
    document.documentElement.setAttribute('data-theme', t);
    setActiveThemeBtn(t);
    var bg = Storage.get('sc_bg_img', '');
    if (bg) {
        document.body.style.backgroundImage = 'url("' + esc(bg) + '")';
        document.body.classList.add('bg-custom');
    } else {
        document.body.style.backgroundImage = '';
        document.body.classList.remove('bg-custom');
    }
}

function importThemeBg() {
    document.getElementById('themeBgInput').click();
}

function onThemeBgSelected(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        var data = ev.target.result;
        Storage.setAuto('sc_bg_img', data);
        document.body.style.backgroundImage = 'url("' + data + '")';
        document.body.classList.add('bg-custom');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

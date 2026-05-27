/* ===== 认证视图 ===== *
 * 管理：登录/注册模态框、用户指示器
 */

/* ====== 认证状态 ====== */
var _authResolve = null;   // initApp 等待认证的 resolve 回调

/** 显示认证模态框（返回 Promise<boolean>：true=已认证/跳过） */
function showAuthModal() {
  return new Promise(function(resolve) {
    _authResolve = resolve;
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authRegEmail').value = '';
    document.getElementById('authRegPassword').value = '';
    document.getElementById('authRegNickname').value = '';
    hideAuthError();
    hideAuthLoading();
    switchAuthTab('login');
    document.getElementById('authModal').classList.add('show');
  });
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('show');
}

function skipAuth() {
  closeAuthModal();
  if (_authResolve) { _authResolve(false); _authResolve = null; }
}

/* ====== 标签切换 ====== */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelector('.auth-tab[data-tab="' + tab + '"]').classList.add('active');
  document.getElementById('authLoginForm').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('authRegisterForm').style.display = tab === 'register' ? '' : 'none';
  hideAuthError();
}

/* ====== 登录 ====== */
async function handleAuthLogin() {
  var email = document.getElementById('authEmail').value.trim();
  var password = document.getElementById('authPassword').value;
  if (!email || !password) { showAuthError('请填写邮箱和密码'); return; }

  showAuthLoading();
  try {
    await AuthService.login(email, password);
    closeAuthModal();
    // 登录成功后拉取云端数据
    try {
      document.getElementById('authLoading').textContent = '⏳ 同步数据中...';
      await SyncService.downloadAllData();
    } catch (e) {
      Log.warn('Auth', '同步失败，使用本地数据', e);
    }
    renderUserIndicator();
    loadBooks();
    renderShelf();
    if (_authResolve) { _authResolve(true); _authResolve = null; }
  } catch (e) {
    showAuthError(e.message);
  }
  hideAuthLoading();
}

/* ====== 注册 ====== */
async function handleAuthRegister() {
  var email = document.getElementById('authRegEmail').value.trim();
  var password = document.getElementById('authRegPassword').value;
  var nickname = document.getElementById('authRegNickname').value.trim();
  if (!email || !password) { showAuthError('请填写邮箱和密码'); return; }
  if (password.length < 6) { showAuthError('密码至少6位'); return; }

  showAuthLoading();
  try {
    await AuthService.register(email, password, nickname);
    closeAuthModal();
    // 注册后推送本地数据到云端
    try {
      document.getElementById('authLoading').textContent = '⏳ 上传数据中...';
      await SyncService.uploadAllData();
    } catch (e) {
      Log.warn('Auth', '上传失败', e);
    }
    renderUserIndicator();
    loadBooks();
    renderShelf();
    if (_authResolve) { _authResolve(true); _authResolve = null; }
  } catch (e) {
    showAuthError(e.message);
  }
  hideAuthLoading();
}

/* ====== 登出 ====== */
function handleLogout() {
  hideUserMenu();
  AuthService.logout();
  _authSkip = false;
  document.getElementById('userIndicator').style.display = 'none';
  document.getElementById('userMenu').classList.remove('show');
  showAuthModal();
}

/* ====== 用户指示器 ====== */
function renderUserIndicator() {
  var el = document.getElementById('userIndicator');
  if (!el) return;
  var user = AuthService.getUser();
  if (user) {
    el.textContent = '👤 ' + (user.nickname || user.email);
    el.style.display = 'inline';
  } else {
    el.style.display = 'none';
  }
}

function showUserMenu() {
  var menu = document.getElementById('userMenu');
  if (menu) menu.classList.toggle('show');
}

function hideUserMenu() {
  var menu = document.getElementById('userMenu');
  if (menu) menu.classList.remove('show');
}

/* ====== 服务器配置 ====== */
function showServerConfig() {
  document.getElementById('serverUrlInput').value = AuthService.getApiBase();
  document.getElementById('serverConfigModal').classList.add('show');
}

function closeServerConfig() {
  document.getElementById('serverConfigModal').classList.remove('show');
}

function saveServerConfig() {
  var url = document.getElementById('serverUrlInput').value.trim();
  if (url) AuthService.setApiBase(url);
  closeServerConfig();
}

/* ====== 辅助函数 ====== */
function showAuthError(msg) {
  var el = document.getElementById('authError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideAuthError() {
  var el = document.getElementById('authError');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

function showAuthLoading() {
  document.getElementById('authLoginForm').style.display = 'none';
  document.getElementById('authRegisterForm').style.display = 'none';
  document.getElementById('authLoading').style.display = '';
  document.getElementById('authLoading').textContent = '⏳ 请稍候...';
  hideAuthError();
}

/* ====== 密码可视化切换 ====== */
function togglePasswordVisibility(inputId, el) {
  var input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    el.textContent = '👁‍';
  } else {
    input.type = 'password';
    el.textContent = '👁';
  }
}

function hideAuthLoading() {
  document.getElementById('authLoading').style.display = 'none';
  document.getElementById('authLoginForm').style.display = '';
  // 恢复当前标签显示
  var active = document.querySelector('.auth-tab.active');
  if (active) switchAuthTab(active.dataset.tab);
}

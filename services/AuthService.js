/* ===== 认证服务 ===== *
 * 管理：JWT 令牌、用户会话、API 通信
 */

var AuthService = {
  _apiBase: '',

  getApiBase: function() {
    if (!this._apiBase)
      this._apiBase = Storage.get('ns_server_url', 'http://localhost:3001');
    return this._apiBase;
  },

  setApiBase: function(url) {
    this._apiBase = url;
    Storage.set('ns_server_url', url);
  },

  isLoggedIn: function() {
    return !!Storage.get('ns_auth_token', null);
  },

  getUser: function() {
    return Storage.get('ns_auth_user', null);
  },

  getToken: function() {
    return Storage.get('ns_auth_token', null);
  },

  setSession: function(token, user) {
    Storage.set('ns_auth_token', token);
    Storage.set('ns_auth_user', user);
  },

  clearSession: function() {
    Storage.del('ns_auth_token');
    Storage.del('ns_auth_user');
  },

  /** 通用 API 请求 */
  _request: async function(method, path, body) {
    var url = this.getApiBase() + path;
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    var token = this.getToken();
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body !== undefined) opts.body = JSON.stringify(body);

    var resp = await fetch(url, opts);
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || '请求失败 (' + resp.status + ')');
    return data;
  },

  /** 注册 */
  register: async function(email, password, nickname) {
    var data = await this._request('POST', '/api/auth/register', {
      email: email, password: password, nickname: nickname || ''
    });
    this.setSession(data.token, data.user);
    return data.user;
  },

  /** 登录 */
  login: async function(email, password) {
    var data = await this._request('POST', '/api/auth/login', {
      email: email, password: password
    });
    this.setSession(data.token, data.user);
    return data.user;
  },

  /** 登出 */
  logout: function() {
    this.clearSession();
  },

  /** 验证当前 token 是否有效 */
  validateToken: async function() {
    var token = this.getToken();
    if (!token) return false;
    try {
      await this._request('GET', '/api/auth/me');
      return true;
    } catch (e) {
      this.clearSession();
      return false;
    }
  }
};

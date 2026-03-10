// ============================================================
// apiClient.js — Cloud API client with JWT auto-refresh
// No dependencies — load before authState.js
// ============================================================

const ApiClient = (function(){

  var LS_ACCESS  = 'golf_access_token';
  var LS_REFRESH = 'golf_refresh_token';

  // ── Base URL — auto-detect or configure ──
  var _baseUrl = '';  // empty = same origin; set to 'http://host:port' for cross-origin

  function setBaseUrl(url){
    _baseUrl = (url || '').replace(/\/+$/, '');
  }

  function getBaseUrl(){
    return _baseUrl;
  }

  // ── Token storage ──

  function getAccessToken(){
    try { return localStorage.getItem(LS_ACCESS); } catch(e){ return null; }
  }
  function setAccessToken(t){
    try { if(t) localStorage.setItem(LS_ACCESS, t); else localStorage.removeItem(LS_ACCESS); } catch(e){}
  }
  function getRefreshToken(){
    try { return localStorage.getItem(LS_REFRESH); } catch(e){ return null; }
  }
  function setRefreshToken(t){
    try { if(t) localStorage.setItem(LS_REFRESH, t); else localStorage.removeItem(LS_REFRESH); } catch(e){}
  }

  function clearTokens(){
    setAccessToken(null);
    setRefreshToken(null);
  }

  function hasTokens(){
    return !!getAccessToken();
  }

  // ── Core fetch wrapper ──

  var _refreshing = null;  // dedup concurrent refresh calls

  async function request(path, options){
    options = options || {};
    var url = _baseUrl + path;
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});

    // Attach auth header if we have a token (unless explicitly skipped)
    if(!options.noAuth){
      var token = getAccessToken();
      if(token) headers['Authorization'] = 'Bearer ' + token;
    }

    var fetchOpts = {
      method: options.method || 'GET',
      headers: headers
    };
    if(options.body){
      fetchOpts.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    var res = await fetch(url, fetchOpts);

    // Auto-refresh on 401
    if(res.status === 401 && !options.noAuth && !options._retried){
      var refreshed = await _tryRefresh();
      if(refreshed){
        options._retried = true;
        return request(path, options);
      }
      // Refresh failed — clear tokens
      clearTokens();
      if(typeof AuthState !== 'undefined' && AuthState.onLoggedOut){
        AuthState.onLoggedOut();
      }
    }

    return res;
  }

  async function _tryRefresh(){
    var rt = getRefreshToken();
    if(!rt) return false;

    // Dedup: if already refreshing, wait for that result
    if(_refreshing) return _refreshing;

    _refreshing = (async function(){
      try {
        var res = await fetch(_baseUrl + '/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt })
        });
        if(!res.ok){
          clearTokens();
          return false;
        }
        var data = await res.json();
        if(data.accessToken){
          setAccessToken(data.accessToken);
          return true;
        }
        return false;
      } catch(e){
        return false;
      } finally {
        _refreshing = null;
      }
    })();

    return _refreshing;
  }

  // ── Convenience methods ──

  async function get(path, options){
    return request(path, Object.assign({}, options, { method: 'GET' }));
  }

  async function post(path, body, options){
    return request(path, Object.assign({}, options, { method: 'POST', body: body }));
  }

  async function patch(path, body, options){
    return request(path, Object.assign({}, options, { method: 'PATCH', body: body }));
  }

  // ── Helper: parse JSON response ──
  async function json(response){
    try { return await response.json(); } catch(e){ return null; }
  }

  return {
    setBaseUrl: setBaseUrl,
    getBaseUrl: getBaseUrl,
    getAccessToken: getAccessToken,
    setAccessToken: setAccessToken,
    getRefreshToken: getRefreshToken,
    setRefreshToken: setRefreshToken,
    clearTokens: clearTokens,
    hasTokens: hasTokens,
    request: request,
    get: get,
    post: post,
    patch: patch,
    json: json
  };

})();

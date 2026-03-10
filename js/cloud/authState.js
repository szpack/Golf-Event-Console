// ============================================================
// authState.js — Login state management
// Depends on: apiClient.js
// ============================================================

const AuthState = (function(){

  var _user = null;          // { id, email, displayName, status }
  var _player = null;        // { id, displayName, handicap, ... }
  var _authProviders = [];
  var _ready = false;        // init complete (may or may not be logged in)
  var _listeners = [];

  // ── Check if logged in ──
  function isLoggedIn(){ return !!_user; }
  function getUser(){ return _user; }
  function getPlayer(){ return _player; }
  function isReady(){ return _ready; }

  // ── Event system ──
  function onChange(fn){ _listeners.push(fn); }
  function _notify(){
    for(var i = 0; i < _listeners.length; i++){
      try { _listeners[i]({ user: _user, player: _player, loggedIn: !!_user }); } catch(e){}
    }
  }

  // ── Init: check existing token on startup ──
  async function init(){
    if(!ApiClient.hasTokens()){
      _ready = true;
      _notify();
      return;
    }

    try {
      var res = await ApiClient.get('/api/v1/me');
      if(res.ok){
        var data = await ApiClient.json(res);
        _user = data.user || null;
        _player = data.defaultPlayer || null;
        _authProviders = data.authProviders || [];
      } else {
        // Token invalid — clear
        ApiClient.clearTokens();
        _user = null;
        _player = null;
      }
    } catch(e){
      // Network error — stay as guest, don't clear tokens (might be offline)
      console.warn('[AuthState] init network error, continuing as guest');
    }

    _ready = true;
    _notify();
  }

  // ── Register ──
  async function register(email, password, displayName){
    var res = await ApiClient.post('/api/v1/auth/register', {
      email: email,
      password: password,
      displayName: displayName
    }, { noAuth: true });

    var data = await ApiClient.json(res);
    if(!res.ok){
      return { error: data && data.error || 'Registration failed' };
    }

    // Store tokens
    ApiClient.setAccessToken(data.accessToken);
    ApiClient.setRefreshToken(data.refreshToken);
    _user = data.user;
    _player = data.defaultPlayer;
    _notify();
    return { success: true };
  }

  // ── Login ──
  async function login(email, password){
    var res = await ApiClient.post('/api/v1/auth/login', {
      email: email,
      password: password
    }, { noAuth: true });

    var data = await ApiClient.json(res);
    if(!res.ok){
      return { error: data && data.error || 'Login failed' };
    }

    ApiClient.setAccessToken(data.accessToken);
    ApiClient.setRefreshToken(data.refreshToken);
    _user = data.user;
    _player = data.defaultPlayer;
    _notify();
    return { success: true };
  }

  // ── Logout ──
  async function logout(){
    try {
      await ApiClient.post('/api/v1/auth/logout', {});
    } catch(e){
      // Ignore errors — clear local state anyway
    }
    ApiClient.clearTokens();
    _user = null;
    _player = null;
    _authProviders = [];
    _notify();
  }

  // ── Called by apiClient when refresh fails ──
  function onLoggedOut(){
    _user = null;
    _player = null;
    _authProviders = [];
    _notify();
  }

  // ── Refresh user data ──
  async function refreshMe(){
    var res = await ApiClient.get('/api/v1/me');
    if(res.ok){
      var data = await ApiClient.json(res);
      _user = data.user || null;
      _player = data.defaultPlayer || null;
      _notify();
    }
  }

  return {
    isLoggedIn: isLoggedIn,
    isReady: isReady,
    getUser: getUser,
    getPlayer: getPlayer,
    onChange: onChange,
    init: init,
    register: register,
    login: login,
    logout: logout,
    onLoggedOut: onLoggedOut,
    refreshMe: refreshMe
  };

})();

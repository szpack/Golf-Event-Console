// ============================================================
// router.js — Hash-based SPA Router
// No dependencies — lightweight route matching & navigation
// ============================================================

const Router = (function(){

  var _routes = [];
  var _current = null;    // { path, params, route }
  var _onChange = null;    // callback(current, prev)

  /**
   * Register a route pattern.
   * Supports :param segments: '/round/:id' matches '/round/abc123'
   *
   * @param {string} pattern - e.g. '/', '/rounds', '/round/:id'
   * @param {string} name    - unique route name
   */
  function add(pattern, name){
    var parts = pattern.split('/').filter(Boolean);
    var paramNames = [];
    var regexParts = parts.map(function(p){
      if(p.charAt(0) === ':'){
        paramNames.push(p.slice(1));
        return '([^/]+)';
      }
      return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    var regex = new RegExp('^/?' + regexParts.join('/') + '/?$');
    _routes.push({ pattern:pattern, name:name, regex:regex, paramNames:paramNames });
  }

  /**
   * Match a path against registered routes.
   * @returns {{ name, params, path }} or null
   */
  function _match(path){
    path = path || '/';
    // Exact root match
    if(path === '/' || path === ''){
      for(var i = 0; i < _routes.length; i++){
        if(_routes[i].pattern === '/') return { name:_routes[i].name, params:{}, path:'/' };
      }
    }
    for(var i = 0; i < _routes.length; i++){
      var r = _routes[i];
      var m = path.match(r.regex);
      if(m){
        var params = {};
        for(var j = 0; j < r.paramNames.length; j++){
          params[r.paramNames[j]] = decodeURIComponent(m[j+1]);
        }
        return { name:r.name, params:params, path:path };
      }
    }
    return null;
  }

  /**
   * Navigate to a path (updates hash).
   */
  function navigate(path){
    window.location.hash = '#' + path;
  }

  /**
   * Read current hash and dispatch route change.
   */
  function _dispatch(){
    var hash = window.location.hash.slice(1) || '/';
    var matched = _match(hash);
    if(!matched) matched = { name:'home', params:{}, path:'/' };

    var prev = _current;
    _current = matched;

    if(_onChange){
      _onChange(_current, prev);
    }
  }

  /**
   * Start listening to hash changes.
   * @param {Function} onChange - callback(current, prev)
   */
  function start(onChange){
    _onChange = onChange;
    window.addEventListener('hashchange', _dispatch);
    _dispatch(); // initial route
  }

  /**
   * Get current route info.
   */
  function current(){
    return _current;
  }

  /**
   * Stop listening.
   */
  function stop(){
    window.removeEventListener('hashchange', _dispatch);
  }

  return {
    add: add,
    navigate: navigate,
    start: start,
    current: current,
    stop: stop
  };

})();

// ============================================================
// authPage.js — Login / Register page component
// Routes: #/login, #/register
// Depends on: AuthState, ApiClient, Router
// ============================================================

const AuthPage = (function(){

  var _mode = 'login';     // 'login' | 'register'
  var _loading = false;
  var _error = '';
  var _composing = false;  // IME support

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════

  function render(route){
    _mode = (route && route.name === 'register') ? 'register' : 'login';
    _error = '';
    _loading = false;
    _renderInner();
  }

  function _renderInner(){
    var el = document.getElementById('page-auth-content');
    if(!el) return;

    var isReg = _mode === 'register';
    var html = '';

    html += '<div class="auth-card">';
    html += '<h2 class="auth-title">' + (isReg ? 'Create Account' : 'Sign In') + '</h2>';

    if(_error){
      html += '<div class="auth-error">' + _esc(_error) + '</div>';
    }

    html += '<form id="auth-form" class="auth-form" autocomplete="on">';

    if(isReg){
      html += '<div class="auth-field">';
      html += '<label for="auth-name">Display Name</label>';
      html += '<input type="text" id="auth-name" autocomplete="name" maxlength="50" placeholder="Your name" required>';
      html += '</div>';
    }

    html += '<div class="auth-field">';
    html += '<label for="auth-email">Email</label>';
    html += '<input type="email" id="auth-email" autocomplete="email" placeholder="email@example.com" required>';
    html += '</div>';

    html += '<div class="auth-field">';
    html += '<label for="auth-password">Password</label>';
    html += '<input type="password" id="auth-password" autocomplete="' + (isReg ? 'new-password' : 'current-password') + '" minlength="6" placeholder="' + (isReg ? 'At least 6 characters' : 'Password') + '" required>';
    html += '</div>';

    html += '<button type="submit" class="auth-submit"' + (_loading ? ' disabled' : '') + '>';
    html += _loading ? 'Please wait...' : (isReg ? 'Create Account' : 'Sign In');
    html += '</button>';

    html += '</form>';

    // Toggle link
    html += '<div class="auth-toggle">';
    if(isReg){
      html += 'Already have an account? <a href="#/login">Sign In</a>';
    } else {
      html += 'No account yet? <a href="#/register">Create Account</a>';
    }
    html += '</div>';

    // Future login methods placeholder
    html += '<div class="auth-future">';
    html += '<div class="auth-divider"><span>or</span></div>';
    html += '<div class="auth-coming-soon">WeChat / Phone login coming soon</div>';
    html += '</div>';

    html += '</div>';

    el.innerHTML = html;
    _wireForm();
  }

  function _wireForm(){
    var form = document.getElementById('auth-form');
    if(form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        _handleSubmit();
      });
    }

    // IME support for all inputs
    var inputs = document.querySelectorAll('#auth-form input[type="text"]');
    for(var i = 0; i < inputs.length; i++){
      inputs[i].addEventListener('compositionstart', function(){ _composing = true; });
      inputs[i].addEventListener('compositionend', function(){ _composing = false; });
    }
  }

  async function _handleSubmit(){
    if(_loading) return;

    var email = (document.getElementById('auth-email') || {}).value || '';
    var password = (document.getElementById('auth-password') || {}).value || '';
    var name = (document.getElementById('auth-name') || {}).value || '';

    // Basic client-side validation
    if(!email.trim()){
      _error = 'Please enter your email'; _renderInner(); return;
    }
    if(!password || password.length < 6){
      _error = 'Password must be at least 6 characters'; _renderInner(); return;
    }
    if(_mode === 'register' && !name.trim()){
      _error = 'Please enter your name'; _renderInner(); return;
    }

    _loading = true;
    _error = '';
    _renderInner();

    var result;
    if(_mode === 'register'){
      result = await AuthState.register(email, password, name);
    } else {
      result = await AuthState.login(email, password);
    }

    if(result.error){
      _loading = false;
      _error = result.error;
      _renderInner();
      return;
    }

    // Success — navigate to home
    _loading = false;
    Router.navigate('/');
  }

  function goBack(){
    Router.navigate('/');
  }

  function _esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    render: render,
    goBack: goBack
  };

})();

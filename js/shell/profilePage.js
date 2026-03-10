// ============================================================
// profilePage.js — User profile page
// Route: #/profile
// Depends on: AuthState, ApiClient, Router
// ============================================================

const ProfilePage = (function(){

  var _editing = false;
  var _saving = false;
  var _error = '';
  var _success = '';

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════

  function render(){
    var el = document.getElementById('page-profile-content');
    if(!el) return;

    _editing = false;
    _saving = false;
    _error = '';
    _success = '';

    if(!AuthState.isLoggedIn()){
      el.innerHTML = '<div class="profile-card"><p class="profile-guest">Not signed in.</p>' +
        '<a href="#/login" class="auth-submit" style="display:inline-block;text-align:center;text-decoration:none;margin-top:12px">Sign In</a></div>';
      return;
    }

    _renderInner(el);
  }

  function _renderInner(el){
    el = el || document.getElementById('page-profile-content');
    if(!el) return;

    var user = AuthState.getUser();
    var player = AuthState.getPlayer();
    if(!user){ el.innerHTML = ''; return; }

    var html = '<div class="profile-card">';

    // Header
    html += '<div class="profile-header">';
    html += '<div class="profile-avatar">' + _esc((user.displayName || '?').charAt(0)).toUpperCase() + '</div>';
    html += '<div class="profile-info">';
    html += '<div class="profile-name">' + _esc(user.displayName) + '</div>';
    html += '<div class="profile-email">' + _esc(user.email || '') + '</div>';
    html += '</div>';
    html += '</div>';

    if(_error){
      html += '<div class="auth-error">' + _esc(_error) + '</div>';
    }
    if(_success){
      html += '<div class="profile-success">' + _esc(_success) + '</div>';
    }

    // Account section
    html += '<div class="profile-section">';
    html += '<div class="profile-section-title">Account</div>';
    html += '<div class="profile-row"><span class="profile-label">Name</span>';
    if(_editing){
      html += '<input type="text" id="profile-edit-name" class="profile-input" value="' + _esc(user.displayName) + '" maxlength="50">';
    } else {
      html += '<span class="profile-value">' + _esc(user.displayName) + '</span>';
    }
    html += '</div>';
    html += '<div class="profile-row"><span class="profile-label">Email</span><span class="profile-value">' + _esc(user.email || '—') + '</span></div>';
    html += '</div>';

    // Player section
    if(player){
      html += '<div class="profile-section">';
      html += '<div class="profile-section-title">Default Player</div>';
      html += '<div class="profile-row"><span class="profile-label">Name</span>';
      if(_editing){
        html += '<input type="text" id="profile-edit-player-name" class="profile-input" value="' + _esc(player.displayName) + '" maxlength="50">';
      } else {
        html += '<span class="profile-value">' + _esc(player.displayName) + '</span>';
      }
      html += '</div>';
      html += '<div class="profile-row"><span class="profile-label">Handicap</span>';
      if(_editing){
        html += '<input type="number" id="profile-edit-handicap" class="profile-input profile-input-sm" value="' + (player.handicap != null ? player.handicap : '') + '" min="-10" max="54" step="0.1">';
      } else {
        html += '<span class="profile-value">' + (player.handicap != null ? player.handicap : '—') + '</span>';
      }
      html += '</div>';
      html += '</div>';
    }

    // Actions
    html += '<div class="profile-actions">';
    if(_editing){
      html += '<button class="auth-submit" onclick="ProfilePage.save()"' + (_saving ? ' disabled' : '') + '>' + (_saving ? 'Saving...' : 'Save') + '</button>';
      html += '<button class="profile-btn-cancel" onclick="ProfilePage.cancelEdit()">Cancel</button>';
    } else {
      html += '<button class="profile-btn-edit" onclick="ProfilePage.startEdit()">Edit Profile</button>';
    }
    html += '</div>';

    // Logout
    html += '<div class="profile-logout">';
    html += '<button class="profile-btn-logout" onclick="ProfilePage.doLogout()">Sign Out</button>';
    html += '</div>';

    html += '</div>';
    el.innerHTML = html;
  }

  function startEdit(){
    _editing = true;
    _error = '';
    _success = '';
    _renderInner();
  }

  function cancelEdit(){
    _editing = false;
    _error = '';
    _renderInner();
  }

  async function save(){
    if(_saving) return;
    _saving = true;
    _error = '';
    _success = '';
    _renderInner();

    var nameInput = document.getElementById('profile-edit-name');
    var playerNameInput = document.getElementById('profile-edit-player-name');
    var hcpInput = document.getElementById('profile-edit-handicap');

    try {
      // Update user
      if(nameInput){
        var name = nameInput.value.trim();
        if(name){
          var res = await ApiClient.patch('/api/v1/me', { displayName: name });
          if(!res.ok){
            var d = await ApiClient.json(res);
            _error = (d && d.error) || 'Failed to update name';
            _saving = false;
            _renderInner();
            return;
          }
        }
      }

      // Update player
      if(playerNameInput || hcpInput){
        var body = {};
        if(playerNameInput) body.displayName = playerNameInput.value.trim();
        if(hcpInput) body.handicap = hcpInput.value ? Number(hcpInput.value) : null;

        var res2 = await ApiClient.patch('/api/v1/players/me/default', body);
        if(!res2.ok){
          var d2 = await ApiClient.json(res2);
          _error = (d2 && d2.error) || 'Failed to update player';
          _saving = false;
          _renderInner();
          return;
        }
      }

      // Refresh auth state
      await AuthState.refreshMe();
      _saving = false;
      _editing = false;
      _success = 'Profile updated';
      _renderInner();
    } catch(e){
      _saving = false;
      _error = 'Network error';
      _renderInner();
    }
  }

  async function doLogout(){
    await AuthState.logout();
    Router.navigate('/');
  }

  function _esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    render: render,
    startEdit: startEdit,
    cancelEdit: cancelEdit,
    save: save,
    doLogout: doLogout
  };

})();

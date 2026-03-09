// ============================================================
// homePage.js — Home Page Renderer
// Depends on: roundHelper.js
// ============================================================

const HomePage = (function(){

  var H = null; // lazy ref to RoundHelper

  function _h(){ if(!H) H = RoundHelper; return H; }

  function render(){
    var el = document.getElementById('page-home-content');
    if(!el) return;

    var active = _h().getActiveSummary();
    var recent = _h().getStoredRounds(5);

    var html = '';

    // ── 1. Current Round ──
    html += '<div class="sh-section">';
    html += '<h2 class="sh-section-title">Current Round</h2>';
    if(active){
      html += _renderHero(active);
    } else {
      html += '<div class="sh-empty-state sh-empty-compact">';
      html += '<div class="sh-empty-text">No active round</div>';
      html += '<button class="sh-btn-primary" onclick="Shell.newRound()">New Round</button>';
      html += '</div>';
    }
    html += '</div>';

    // ── 2. Recent Rounds ──
    if(recent.length > 0){
      html += '<div class="sh-section">';
      html += '<h2 class="sh-section-title">Recent Rounds</h2>';
      html += '<div class="sh-round-list">';
      recent.forEach(function(r){ html += _renderCard(r); });
      html += '</div>';
      html += '</div>';
    }

    // ── 3. Quick Actions ──
    html += '<div class="sh-section">';
    html += '<h2 class="sh-section-title">Quick Actions</h2>';
    html += '<div class="sh-actions">';
    html += '<button class="sh-action-btn" onclick="Shell.newRound()">';
    html += '<span class="sh-action-icon">&#10133;</span><span>New Round</span></button>';
    html += '<button class="sh-action-btn" onclick="Shell.importRound()">';
    html += '<span class="sh-action-icon">&#128229;</span><span>Import</span></button>';
    html += '<button class="sh-action-btn" onclick="Router.navigate(\'/rounds\')">';
    html += '<span class="sh-action-icon">&#128203;</span><span>All Rounds</span></button>';
    html += '</div>';
    html += '</div>';

    // ── 4. Management (subdued) ──
    html += '<div class="sh-section sh-section-subdued">';
    html += '<h2 class="sh-section-title">Management</h2>';
    html += '<div class="sh-mgmt-row">';
    html += _pill('Players', '/players');
    html += _pill('Teams', '/teams');
    html += _pill('Clubs', '/clubs');
    html += '</div>';
    html += '</div>';

    el.innerHTML = html;
  }

  // ── Hero card (current round) ──

  function _renderHero(r){
    var html = '<div class="sh-hero-card">';

    // Head: status + date
    html += '<div class="sh-hero-head">';
    html += '<span class="sh-card-status sh-status-' + r.status + '">' + _h().statusLabel(r.status) + '</span>';
    var gp = _h().formatGameplay(r.gameplay);
    if(gp) html += '<span class="sh-hero-gameplay">' + _h().esc(gp) + '</span>';
    if(r.date) html += '<span class="sh-hero-date">' + r.date + '</span>';
    html += '</div>';

    // Course + routing
    html += '<div class="sh-hero-course">' + _h().esc(r.courseName || 'Untitled Round') + '</div>';
    if(r.routingName){
      html += '<div class="sh-hero-routing">' + _h().esc(r.routingName) + '</div>';
    }

    // Stats
    html += '<div class="sh-hero-stats">';
    html += _stat(r.playerCount, 'Players');
    html += _stat(r.holeCount, 'Holes');
    html += _stat(r.playedCount + '/' + r.holeCount, 'Progress');
    html += '</div>';

    // Progress bar
    var pct = r.holeCount > 0 ? Math.round(r.playedCount / r.holeCount * 100) : 0;
    html += '<div class="sh-hero-progress"><div class="sh-hero-progress-bar" style="width:' + pct + '%"></div></div>';

    // Player names (truncated)
    if(r.playerNames && r.playerNames.length > 0){
      html += '<div class="sh-hero-players">' + _h().formatPlayerNames(r.playerNames) + '</div>';
    }

    // Actions
    html += '<div class="sh-hero-actions">';
    html += '<button class="sh-btn-primary sh-btn-lg" onclick="Shell.enterOverlay()">Continue Round</button>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  // ── Compact card (recent rounds, same as Rounds page card) ──

  function _renderCard(r){
    var html = '<div class="sh-card sh-card-compact" onclick="Router.navigate(\'/round/' + r.id + '\')">';
    html += '<div class="sh-card-head">';
    html += '<span class="sh-card-status sh-status-' + r.status + '">' + _h().statusLabel(r.status) + '</span>';
    html += '<span class="sh-card-date">' + r.date + '</span>';
    html += '</div>';
    html += '<div class="sh-card-title">' + _h().esc(r.courseName || 'Untitled') + '</div>';
    html += '<div class="sh-card-meta">' + _h().formatMeta(r) + '</div>';
    html += '</div>';
    return html;
  }

  function _stat(val, label){
    return '<div class="sh-hero-stat"><span class="sh-hero-stat-val">' + val + '</span><span class="sh-hero-stat-lbl">' + label + '</span></div>';
  }

  function _pill(label, path){
    return '<button class="sh-mgmt-pill" onclick="Router.navigate(\'' + path + '\')">' + label + '</button>';
  }

  return { render: render };
})();

// ============================================================
// roundsPage.js — Rounds List Page Renderer
// Depends on: roundHelper.js, data.js (D API), round.js (Round)
// ============================================================

const RoundsPage = (function(){

  var H = null;
  function _h(){ if(!H) H = RoundHelper; return H; }

  // ── State ──
  var _searchTerm = '';
  var _confirmingId = null;  // round id pending delete confirm
  var _confirmTimer = null;

  // ── Status group order ──
  var GROUPS = [
    { key:'playing',  label:'Playing' },
    { key:'planned',  label:'Planned' },
    { key:'finished', label:'Finished' }
  ];

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════

  function render(){
    var el = document.getElementById('page-rounds-content');
    if(!el) return;

    var active = _h().getActiveSummary();
    var stored = _h().getStoredRounds();

    // Merge all into one list
    var all = [];
    if(active) all.push(active);
    stored.forEach(function(r){ all.push(r); });

    var html = '';

    // ── Header with search ──
    html += '<div class="sh-page-header">';
    html += '<h1 class="sh-page-title">Rounds</h1>';
    html += '<div class="sh-header-right">';
    if(all.length > 0){
      html += '<input type="text" class="sh-search-input" id="rounds-search" placeholder="Search..." value="' + _esc(_searchTerm) + '" oninput="RoundsPage.onSearch(this.value)">';
    }
    html += '<button class="sh-btn-primary" onclick="Shell.newRound()">+ New Round</button>';
    html += '</div>';
    html += '</div>';

    if(all.length === 0){
      html += '<div class="sh-empty-state">';
      html += '<div class="sh-empty-icon">&#9971;</div>';
      html += '<div class="sh-empty-text">No rounds yet</div>';
      html += '<button class="sh-btn-primary" onclick="Shell.newRound()">Create your first round</button>';
      html += '</div>';
      el.innerHTML = html;
      return;
    }

    // ── Filter ──
    var filtered = _filter(all, _searchTerm);

    if(filtered.length === 0){
      html += '<div class="sh-empty">';
      html += 'No matching rounds';
      html += '</div>';
      el.innerHTML = html;
      return;
    }

    // ── Group by status ──
    var groups = {};
    filtered.forEach(function(r){
      var k = r.status || 'finished';
      if(!groups[k]) groups[k] = [];
      groups[k].push(r);
    });

    // Sort each group by date descending
    for(var k in groups){
      groups[k].sort(function(a, b){
        return b.date < a.date ? -1 : b.date > a.date ? 1 : 0;
      });
    }

    // Render groups in order
    GROUPS.forEach(function(g){
      var items = groups[g.key];
      if(!items || items.length === 0) return;

      html += '<div class="sh-round-group">';
      html += '<div class="sh-group-header">';
      html += '<span class="sh-group-title">' + g.label + '</span>';
      html += '<span class="sh-group-count">' + items.length + '</span>';
      html += '</div>';
      items.forEach(function(r){ html += _renderCard(r); });
      html += '</div>';
    });

    el.innerHTML = html;

    // Restore focus to search if active
    var inp = document.getElementById('rounds-search');
    if(inp && _searchTerm) inp.focus();
  }

  // ══════════════════════════════════════════
  // CARD
  // ══════════════════════════════════════════

  function _renderCard(r){
    var cls = 'sh-card sh-card-round' + (r.isActive ? ' sh-card-active' : '');
    var html = '<div class="' + cls + '">';

    // Head: status + gameplay + date
    html += '<div class="sh-card-head">';
    html += '<span class="sh-card-status sh-status-' + r.status + '">' + _h().statusLabel(r.status) + '</span>';
    var gp = _h().formatGameplay(r.gameplay);
    if(gp) html += '<span class="sh-card-gameplay">' + _h().esc(gp) + '</span>';
    html += '<span class="sh-card-date">' + r.date + '</span>';
    html += '</div>';

    // Title
    html += '<div class="sh-card-title">' + _h().esc(r.courseName || 'Untitled Round') + '</div>';

    // Meta
    html += '<div class="sh-card-meta">' + _h().formatMeta(r) + '</div>';

    // Player names
    if(r.playerNames && r.playerNames.length > 0){
      html += '<div class="sh-card-players">' + _h().formatPlayerNames(r.playerNames) + '</div>';
    }

    // Actions
    html += '<div class="sh-card-actions">';
    html += '<button class="sh-btn-sm" onclick="event.stopPropagation(); Router.navigate(\'/round/' + r.id + '\')">Open</button>';
    html += '<button class="sh-btn-sm" onclick="event.stopPropagation(); RoundsPage.duplicateRound(\'' + r.id + '\', ' + r.isActive + ')">Duplicate</button>';

    if(!r.isActive){
      if(_confirmingId === r.id){
        html += '<button class="sh-btn-sm sh-btn-confirm-del" onclick="event.stopPropagation(); RoundsPage.confirmDelete(\'' + r.id + '\')">Confirm</button>';
        html += '<button class="sh-btn-sm" onclick="event.stopPropagation(); RoundsPage.cancelDelete()">Cancel</button>';
      } else {
        html += '<button class="sh-btn-sm sh-btn-danger" onclick="event.stopPropagation(); RoundsPage.startDelete(\'' + r.id + '\')">Delete</button>';
      }
    }
    html += '</div>';

    html += '</div>';
    return html;
  }

  // ══════════════════════════════════════════
  // SEARCH
  // ══════════════════════════════════════════

  function onSearch(val){
    _searchTerm = (val || '').trim();
    _cancelConfirm();
    render();
  }

  function _filter(list, term){
    if(!term) return list;
    var lc = term.toLowerCase();
    return list.filter(function(r){
      if((r.courseName || '').toLowerCase().indexOf(lc) >= 0) return true;
      if((r.date || '').indexOf(lc) >= 0) return true;
      if(r.playerNames){
        for(var i = 0; i < r.playerNames.length; i++){
          if(r.playerNames[i].toLowerCase().indexOf(lc) >= 0) return true;
        }
      }
      return false;
    });
  }

  // ══════════════════════════════════════════
  // DELETE (inline confirm)
  // ══════════════════════════════════════════

  function startDelete(id){
    _cancelConfirm();
    _confirmingId = id;
    render();
    // Auto-cancel after 3s
    _confirmTimer = setTimeout(function(){
      _confirmingId = null;
      _confirmTimer = null;
      render();
    }, 3000);
  }

  function confirmDelete(id){
    _cancelConfirm();
    if(D.deleteRound(id)) render();
  }

  function cancelDelete(){
    _cancelConfirm();
    render();
  }

  function _cancelConfirm(){
    _confirmingId = null;
    if(_confirmTimer){ clearTimeout(_confirmTimer); _confirmTimer = null; }
  }

  // ══════════════════════════════════════════
  // DUPLICATE
  // ══════════════════════════════════════════

  function duplicateRound(id, isActive){
    var round;
    if(isActive){
      // Active round: build from scorecard
      if(typeof Round !== 'undefined'){
        round = Round.fromScorecard(D.sc());
      }
    } else {
      round = D.getRound(id);
    }
    if(!round) return;

    var clone = Round.cloneRound(round, { clearScores: true });
    if(D.putRound(clone)){
      render();
    }
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

  function _esc(s){
    return (s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  }

  return {
    render: render,
    onSearch: onSearch,
    startDelete: startDelete,
    confirmDelete: confirmDelete,
    cancelDelete: cancelDelete,
    duplicateRound: duplicateRound
  };
})();

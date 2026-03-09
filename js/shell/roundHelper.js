// ============================================================
// roundHelper.js — Shared Round summary helpers
// Used by homePage.js and roundsPage.js
// Depends on: data.js (D API), round.js (optional)
// ============================================================

const RoundHelper = (function(){

  /**
   * Build a summary object for the current active round from D.sc().
   * @returns {RoundSummary|null}
   */
  function getActiveSummary(){
    if(typeof D === 'undefined') return null;
    var sc = D.sc();
    if(!sc || !sc.course) return null;

    var players = sc.players || [];
    if(players.length === 0 && (!sc.scores || Object.keys(sc.scores).length === 0)) return null;

    var hc = sc.course.holeCount || 18;
    var id = (sc.meta && sc.meta.roundId) || D.getActiveRoundId() || 'current';

    var playedCount = 0;
    if(players.length > 0){
      playedCount = D.playedCount(D.rpid(players[0]), 0, hc - 1);
    }

    var playerNames = players.map(function(p){
      return D.playerDisplayName(p);
    });

    var status = 'playing';
    var gameplay = null;
    if(typeof Round !== 'undefined'){
      var ar = D.getActiveRound();
      if(ar){
        status = ar.status || 'playing';
        if(ar.game && ar.game.type) gameplay = ar.game.type;
      }
    }

    return {
      id: id,
      courseName: sc.course.courseName || '',
      routingName: sc.course.routingName || '',
      playerCount: players.length,
      holeCount: hc,
      playedCount: playedCount,
      playerNames: playerNames,
      date: (sc.meta && sc.meta.createdAt) ? sc.meta.createdAt.slice(0, 10) : '',
      status: status,
      gameplay: gameplay,
      isActive: true
    };
  }

  /**
   * Build a summary object from a stored Round object.
   * @param {Object} r - Round object from D.getRound(id)
   * @param {string} rid - Round ID
   * @returns {RoundSummary}
   */
  function fromStoredRound(r, rid){
    var pc = 0;
    var playerNames = [];
    if(r.players && r.players.length > 0){
      playerNames = r.players.map(function(p){ return p.name || ''; });
      if(r.scores){
        var rpId = r.players[0].roundPlayerId;
        var holes = r.scores[rpId] ? (r.scores[rpId].holes || []) : [];
        holes.forEach(function(h){ if(h && h.gross !== null) pc++; });
      }
    }
    var courseName = '';
    if(r._courseSnapshot && r._courseSnapshot.length > 0){
      // No course name in snapshot — try event
    }
    if(r.event && r.event.name) courseName = r.event.name;

    return {
      id: rid,
      courseName: courseName,
      routingName: '',
      playerCount: (r.players || []).length,
      holeCount: r.holeCount || 18,
      playedCount: pc,
      playerNames: playerNames,
      date: r.date || '',
      status: r.status || 'finished',
      gameplay: (r.game && r.game.type) || null,
      isActive: false
    };
  }

  /**
   * Get non-active rounds from the Round store.
   * @param {number} [limit] - max results (default all)
   * @returns {RoundSummary[]}
   */
  function getStoredRounds(limit){
    if(typeof D === 'undefined') return [];
    var ids = D.listRoundIds();
    var activeId = D.getActiveRoundId();
    var rounds = [];
    ids.forEach(function(rid){
      if(rid === activeId) return;
      var r = D.getRound(rid);
      if(!r) return;
      rounds.push(fromStoredRound(r, rid));
    });
    rounds.sort(function(a, b){
      return b.date < a.date ? -1 : b.date > a.date ? 1 : 0;
    });
    if(limit) rounds = rounds.slice(0, limit);
    return rounds;
  }

  // ── Shared formatting ──

  var STATUS_LABELS = { planned:'Planned', playing:'Playing', finished:'Finished' };

  function statusLabel(s){
    return STATUS_LABELS[s] || s || 'Unknown';
  }

  /**
   * Format player names with truncation.
   * Shows max 3 names, then "+ N more".
   */
  function formatPlayerNames(names){
    if(!names || names.length === 0) return '';
    var MAX = 3;
    var shown = names.slice(0, MAX).map(esc);
    var rest = names.length - MAX;
    var result = shown.join(' &middot; ');
    if(rest > 0) result += ' <span class="sh-more">+' + rest + '</span>';
    return result;
  }

  /**
   * Format the meta line: "N players · N holes · X/Y played"
   */
  function formatMeta(r){
    var parts = [];
    parts.push(r.playerCount + (r.playerCount === 1 ? ' player' : ' players'));
    parts.push(r.holeCount + ' holes');
    if(r.playedCount > 0){
      parts.push(r.playedCount + '/' + r.holeCount + ' played');
    }
    return parts.join(' &middot; ');
  }

  /**
   * Format gameplay type for display.
   */
  function formatGameplay(type){
    if(!type) return null;
    var map = {
      'stroke':     'Stroke Play',
      'match':      'Match Play',
      'stableford': 'Stableford',
      'skins':      'Skins',
      'bestball':   'Best Ball',
      'scramble':   'Scramble',
      'nassau':     'Nassau'
    };
    return map[type] || type;
  }

  function esc(s){
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  return {
    getActiveSummary: getActiveSummary,
    fromStoredRound: fromStoredRound,
    getStoredRounds: getStoredRounds,
    statusLabel: statusLabel,
    formatPlayerNames: formatPlayerNames,
    formatMeta: formatMeta,
    formatGameplay: formatGameplay,
    esc: esc
  };

})();

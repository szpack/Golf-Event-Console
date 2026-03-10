// ============================================================
// roundHelper.js — Shared Round summary helpers
// Used by homePage.js and roundsPage.js
// Depends on: RoundStore, data.js (D API for active round compat)
// ============================================================

const RoundHelper = (function(){

  /**
   * Build a summary object for the current active round.
   * Reads from RoundStore Summary, enriched with live D.sc() progress.
   * @returns {RoundSummary|null}
   */
  function getActiveSummary(){
    if(typeof RoundStore === 'undefined') return null;
    var activeId = RoundStore.getActiveId();
    if(!activeId) return null;

    var summary = RoundStore.get(activeId);
    if(!summary) return null;

    // Enrich with live progress from D.sc()
    if(typeof D !== 'undefined'){
      var sc = D.sc();
      var players = sc.players || [];
      if(players.length > 0){
        var hc = sc.course ? (sc.course.holeCount || 18) : 18;
        summary.playedCount = D.playedCount(D.rpid(players[0]), 0, hc - 1);
        summary.playerNames = players.map(function(p){ return D.playerDisplayName(p); });
        summary.playerCount = players.length;
      }
      // Course name from D.sc() may be richer
      if(sc.course && sc.course.courseName && !summary.courseName){
        summary.courseName = sc.course.courseName;
      }
    }

    summary.isActive = true;
    return summary;
  }

  /**
   * Get non-active rounds from RoundStore.
   * @param {number} [limit] - max results (default all)
   * @returns {RoundSummary[]}
   */
  function getStoredRounds(limit){
    if(typeof RoundStore === 'undefined') return [];
    var all = RoundStore.list({ sortBy:'updatedAt', sortOrder:'desc' });
    var activeId = RoundStore.getActiveId();
    var result = [];
    for(var i = 0; i < all.length; i++){
      if(all[i].id === activeId) continue;
      result.push(all[i]);
      if(limit && result.length >= limit) break;
    }
    return result;
  }

  // ── Shared formatting ──

  var STATUS_LABELS = {
    scheduled:'Scheduled', in_progress:'Playing', finished:'Finished', abandoned:'Abandoned',
    // Legacy compat
    planned:'Scheduled', playing:'Playing'
  };

  function statusLabel(s){
    return STATUS_LABELS[s] || s || 'Unknown';
  }

  function formatPlayerNames(names){
    if(!names || names.length === 0) return '';
    var MAX = 3;
    var shown = names.slice(0, MAX).map(esc);
    var rest = names.length - MAX;
    var result = shown.join(' &middot; ');
    if(rest > 0) result += ' <span class="sh-more">+' + rest + '</span>';
    return result;
  }

  function formatMeta(r){
    var parts = [];
    parts.push(r.playerCount + (r.playerCount === 1 ? ' player' : ' players'));
    var hc = r.holesPlanned || r.holeCount || 18;
    parts.push(hc + ' holes');
    var played = r.playedCount || r.holesCompleted || 0;
    if(played > 0){
      parts.push(played + '/' + hc + ' played');
    }
    return parts.join(' &middot; ');
  }

  function formatGameplay(type){
    if(!type) return null;
    var map = {
      'stroke':'Stroke Play', 'match':'Match Play', 'stableford':'Stableford',
      'skins':'Skins', 'bestball':'Best Ball', 'scramble':'Scramble', 'nassau':'Nassau'
    };
    return map[type] || type;
  }

  /**
   * Format derivedStats for a single player as a short text line.
   * @param {Object} pStats - playerStats entry from derivedStats
   * @returns {string} e.g. "78 (+6) · 2B 5P 8Bo 3D+ · 32 putts"
   */
  function formatPlayerStats(pStats){
    if(!pStats) return '';
    var parts = [];
    // Gross + toPar
    var grossStr = '' + pStats.totalGross;
    if(pStats.toPar > 0) grossStr += ' (+' + pStats.toPar + ')';
    else if(pStats.toPar < 0) grossStr += ' (' + pStats.toPar + ')';
    else grossStr += ' (E)';
    parts.push(grossStr);

    // Score distribution
    var dist = [];
    if(pStats.birdieOrBetter) dist.push(pStats.birdieOrBetter + 'B');
    if(pStats.pars) dist.push(pStats.pars + 'P');
    if(pStats.bogeys) dist.push(pStats.bogeys + 'Bo');
    if(pStats.doublePlus) dist.push(pStats.doublePlus + 'D+');
    if(dist.length > 0) parts.push(dist.join(' '));

    // Putts
    if(pStats.totalPutts > 0) parts.push(pStats.totalPutts + ' putts');

    return parts.join(' &middot; ');
  }

  /**
   * Format lightweight summaryStats for list cards (totalGross + toPar only).
   * @param {Object} p - { totalGross, toPar }
   * @returns {string} e.g. "78 (+6)"
   */
  function formatSummaryStats(p){
    if(!p || p.totalGross == null) return '';
    var s = '' + p.totalGross;
    if(p.toPar > 0) s += ' (+' + p.toPar + ')';
    else if(p.toPar < 0) s += ' (' + p.toPar + ')';
    else s += ' (E)';
    return s;
  }

  function esc(s){
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  return {
    getActiveSummary: getActiveSummary,
    getStoredRounds: getStoredRounds,
    statusLabel: statusLabel,
    formatPlayerNames: formatPlayerNames,
    formatMeta: formatMeta,
    formatGameplay: formatGameplay,
    formatPlayerStats: formatPlayerStats,
    formatSummaryStats: formatSummaryStats,
    esc: esc
  };

})();

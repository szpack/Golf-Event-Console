// ============================================================
// roundManager.js — V4.0
// Round 状态管理：创建、洞切换、查询
// Depends on: ClubStore, CourseRouting
// ============================================================

const RoundManager = (function(){

  let _round = null;        // Current active round (null = manual mode)
  let _orderedHoles = null;  // Cached ordered hole data array

  /**
   * Create a new round from a club + runtime routing object.
   * routing must have: { id, name, holeCount, holeRefs, sourceType, meta }
   */
  function createRoundFromRouting(clubId, routing, selectedTee){
    const club = ClubStore.get(clubId);
    const holeRefs = routing.holeRefs.slice();
    const holeStates = {};
    holeRefs.forEach((ref, i)=>{
      holeStates[ref] = i === 0 ? 'in_progress' : 'pending';
    });

    _round = {
      roundId:            _genId(),
      clubId:             clubId,
      clubName:           club ? club.name : '',
      routingId:          routing.id,
      routingName:        routing.name,
      routingSourceType:  routing.sourceType,
      routingMeta:        routing.meta || {},
      startHoleRef:       holeRefs[0],
      playSequence:       holeRefs,
      currentHoleRef:     holeRefs[0],
      holeStates:         holeStates,
      _routing:           routing
    };

    _orderedHoles = CourseRouting.getOrderedHolesFromRouting(routing, selectedTee);
    return _round;
  }

  /**
   * Restore a round from saved state (e.g. localStorage).
   * Rebuilds ordered holes from the saved routing or re-derives it.
   */
  function restoreRound(savedRound, selectedTee){
    if(!savedRound || !savedRound.clubId || !savedRound.routingId){
      _round = null;
      _orderedHoles = null;
      return null;
    }
    try {
      let routing = savedRound._routing;
      if(!routing || !Array.isArray(routing.holeRefs)){
        routing = CourseRouting.rebuildFromSavedRound(savedRound);
      }
      if(!routing){
        throw new Error('Cannot rebuild routing for: ' + savedRound.routingId);
      }
      _round = savedRound;
      _round._routing = routing;
      _orderedHoles = CourseRouting.getOrderedHolesFromRouting(routing, selectedTee);
      return _round;
    } catch(e){
      console.warn('[RoundManager] restoreRound failed:', e.message);
      _round = null;
      _orderedHoles = null;
      return null;
    }
  }

  /** Get current round (or null) */
  function getRound(){ return _round; }

  /** Get ordered holes for current round */
  function getOrderedHoles(){
    return _orderedHoles ? _orderedHoles.slice() : null;
  }

  /** Get current hole data */
  function getCurrentHole(){
    if(!_round || !_orderedHoles) return null;
    const idx = _round.playSequence.indexOf(_round.currentHoleRef);
    return idx >= 0 ? _orderedHoles[idx] : null;
  }

  /** Get current hole index (0-based) */
  function getCurrentIndex(){
    if(!_round) return 0;
    const idx = _round.playSequence.indexOf(_round.currentHoleRef);
    return idx >= 0 ? idx : 0;
  }

  /** Set current hole by holeId */
  function setCurrentHole(holeId){
    if(!_round) return;
    const idx = _round.playSequence.indexOf(holeId);
    if(idx < 0){ console.warn('[RoundManager] holeId not in playSequence:', holeId); return; }
    _round.currentHoleRef = holeId;
    if(_round.holeStates[holeId] === 'pending'){
      _round.holeStates[holeId] = 'in_progress';
    }
  }

  /** Next hole. Returns new index or -1. */
  function nextHole(){
    if(!_round) return -1;
    const idx = _round.playSequence.indexOf(_round.currentHoleRef);
    if(idx < 0 || idx >= _round.playSequence.length - 1) return -1;
    const ref = _round.playSequence[idx + 1];
    _round.currentHoleRef = ref;
    if(_round.holeStates[ref] === 'pending') _round.holeStates[ref] = 'in_progress';
    return idx + 1;
  }

  /** Previous hole. Returns new index or -1. */
  function prevHole(){
    if(!_round) return -1;
    const idx = _round.playSequence.indexOf(_round.currentHoleRef);
    if(idx <= 0) return -1;
    _round.currentHoleRef = _round.playSequence[idx - 1];
    return idx - 1;
  }

  function holeCount(){
    return _round ? _round.playSequence.length : 18;
  }

  function clearRound(){
    _round = null;
    _orderedHoles = null;
  }

  function hasScoreData(sHoles){
    return (sHoles||[]).some(h => h.delta !== null);
  }

  function _genId(){
    return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6);
  }

  return {
    createRoundFromRouting,
    restoreRound, clearRound,
    getRound, getOrderedHoles, getCurrentHole, getCurrentIndex,
    setCurrentHole, nextHole, prevHole, holeCount,
    hasScoreData
  };
})();

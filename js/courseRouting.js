// ============================================================
// courseRouting.js — Routing utility based on ClubStore
// Replaces CourseDatabase's routing generation functions.
// All data reads from ClubStore (single source of truth).
// Depends on: ClubStore
// ============================================================

const CourseRouting = (function(){

  /**
   * Determine routing mode for a club.
   * Returns 'composable_9' if club has 3+ nines, else 'fixed_18'.
   */
  function getRoutingMode(clubId){
    var club = ClubStore.get(clubId);
    if(!club) return null;
    var nines = _validNines(club);
    return nines.length >= 3 ? 'composable_9' : 'fixed_18';
  }

  /**
   * Build routing from a layout.
   * Resolves layout.segments → nines → holes.
   */
  function buildRoutingFromLayout(clubId, layoutId){
    var club = ClubStore.get(clubId);
    if(!club) throw new Error('CourseRouting: club not found: ' + clubId);

    var layout = _findLayout(club, layoutId);
    if(!layout) throw new Error('CourseRouting: layout not found: ' + clubId + '/' + layoutId);

    var nineMap = _buildNineMap(club);
    var holeRefs = [];
    var segments = (layout.segments || []).slice().sort(function(a,b){ return (a.sequence||a.order||0) - (b.sequence||b.order||0); });

    for(var s = 0; s < segments.length; s++){
      var nine = nineMap[segments[s].nine_id];
      if(!nine) continue;
      var holes = nine.holes || [];
      for(var h = 0; h < holes.length; h++){
        holeRefs.push(nine.id + '_h' + (h + 1));
      }
    }

    return {
      id:         clubId + '__' + layoutId,
      name:       layout.name || layoutId,
      holeCount:  holeRefs.length,
      holeRefs:   holeRefs,
      sourceType: 'layout',
      meta:       { clubId: clubId, layoutId: layoutId }
    };
  }

  /**
   * Build routing from two nines (front 9 + back 9).
   */
  function buildRoutingFromNines(clubId, frontNineId, backNineId){
    var club = ClubStore.get(clubId);
    if(!club) throw new Error('CourseRouting: club not found: ' + clubId);

    var nineMap = _buildNineMap(club);
    var frontNine = nineMap[frontNineId];
    var backNine = nineMap[backNineId];
    if(!frontNine) throw new Error('CourseRouting: nine not found: ' + clubId + '/' + frontNineId);
    if(!backNine) throw new Error('CourseRouting: nine not found: ' + clubId + '/' + backNineId);

    var holeRefs = [];
    var fHoles = frontNine.holes || [];
    for(var i = 0; i < fHoles.length; i++) holeRefs.push(frontNineId + '_h' + (i + 1));
    var bHoles = backNine.holes || [];
    for(var i = 0; i < bHoles.length; i++) holeRefs.push(backNineId + '_h' + (i + 1));

    return {
      id:         clubId + '__' + frontNineId + '__' + backNineId,
      name:       (frontNine.name || frontNineId) + '+' + (backNine.name || backNineId),
      holeCount:  holeRefs.length,
      holeRefs:   holeRefs,
      sourceType: 'dual_nine',
      meta:       { clubId: clubId, frontNineId: frontNineId, backNineId: backNineId }
    };
  }

  /**
   * Resolve routing holeRefs to ordered hole data array.
   * Returns [{ holeId, displayNumber, par, yard, sourceName }]
   */
  function getOrderedHolesFromRouting(routing, selectedTee){
    if(!routing || !Array.isArray(routing.holeRefs)) return [];

    var clubId = routing.meta ? routing.meta.clubId : null;
    var club = clubId ? ClubStore.get(clubId) : null;
    var nineMap = club ? _buildNineMap(club) : {};

    return routing.holeRefs.map(function(holeRef, i){
      var parsed = _parseHoleRef(holeRef);
      if(!parsed){
        return _placeholder(holeRef, i);
      }

      var nine = nineMap[parsed.nineId];
      if(!nine || !nine.holes || !nine.holes[parsed.holeIndex]){
        return _placeholder(holeRef, i);
      }

      var hole = nine.holes[parsed.holeIndex];
      var yard = null;
      if(hole.tees && selectedTee && hole.tees[selectedTee] != null){
        yard = hole.tees[selectedTee];
      }

      return {
        holeId:        holeRef,
        displayNumber: i + 1,
        par:           hole.par || null,
        yard:          yard,
        isPlaceholder: false,
        sourceId:      nine.id,
        sourceName:    nine.name || nine.display_name || nine.id
      };
    });
  }

  /**
   * Validate a nine pair (no repeat by default).
   */
  function validateNinePair(clubId, frontNineId, backNineId){
    var club = ClubStore.get(clubId);
    var errors = [];

    if(!club){ errors.push('Club not found: ' + clubId); return { valid: false, errors: errors }; }

    var nineMap = _buildNineMap(club);
    if(!nineMap[frontNineId]) errors.push('Front nine not found: ' + frontNineId);
    if(!nineMap[backNineId]) errors.push('Back nine not found: ' + backNineId);
    if(errors.length) return { valid: false, errors: errors };

    // No repeat by default
    if(frontNineId === backNineId){
      errors.push('Same nine not allowed for front and back');
    }

    return { valid: errors.length === 0, errors: errors };
  }

  /**
   * Get available tee keys for an entire club (scan all nines).
   */
  function getAvailableTeesForClub(clubId){
    var club = ClubStore.get(clubId);
    if(!club) return [];

    var teeSet = {};
    var nines = club.nines || [];
    for(var n = 0; n < nines.length; n++){
      var holes = nines[n].holes || [];
      for(var h = 0; h < holes.length; h++){
        if(holes[h].tees){
          for(var k in holes[h].tees){
            if(holes[h].tees.hasOwnProperty(k)) teeSet[k] = true;
          }
        }
      }
    }
    return Object.keys(teeSet);
  }

  /**
   * Get nines for a club (equivalent to old getSegments).
   */
  function getNines(clubId){
    var club = ClubStore.get(clubId);
    if(!club) return [];
    return _validNines(club);
  }

  /**
   * Get layouts for a club (equivalent to old getFixedCourses).
   */
  function getLayouts(clubId){
    var club = ClubStore.get(clubId);
    if(!club) return [];
    return (club.layouts || []).slice();
  }

  // ══════════════════════════════════════════
  // BACKWARD COMPAT: map old CourseDatabase IDs to ClubStore IDs
  // ══════════════════════════════════════════

  /**
   * Rebuild routing from old saved round metadata.
   * Handles both old CourseDatabase formats and new ClubStore formats.
   */
  function rebuildFromSavedRound(saved){
    var clubId = saved.clubId;
    var meta = saved.routingMeta || {};
    var srcType = saved.routingSourceType;

    var club = ClubStore.get(clubId);
    if(!club) return null;

    // New format: layout or dual_nine
    if(srcType === 'layout' && meta.layoutId){
      return buildRoutingFromLayout(clubId, meta.layoutId);
    }
    if(srcType === 'dual_nine' && meta.frontNineId && meta.backNineId){
      return buildRoutingFromNines(clubId, meta.frontNineId, meta.backNineId);
    }

    // Old format: fixed_course → find matching layout
    if(srcType === 'fixed_course' && meta.courseId){
      var layoutId = clubId + '_layout_' + meta.courseId;
      var layout = _findLayout(club, layoutId);
      if(layout) return buildRoutingFromLayout(clubId, layoutId);
    }

    // Old format: composed_segments → map segment IDs to nine IDs
    if(srcType === 'composed_segments' && meta.frontSegmentId && meta.backSegmentId){
      var frontId = clubId + '_' + meta.frontSegmentId;
      var backId = clubId + '_' + meta.backSegmentId;
      var nineMap = _buildNineMap(club);
      if(nineMap[frontId] && nineMap[backId]){
        return buildRoutingFromNines(clubId, frontId, backId);
      }
    }

    // Fallback: if playSequence exists, use it directly
    if(Array.isArray(saved.playSequence) && saved.playSequence.length > 0){
      return {
        id: saved.routingId || 'restored',
        name: saved.routingName || 'Restored',
        holeCount: saved.playSequence.length,
        holeRefs: saved.playSequence,
        sourceType: 'restored',
        meta: { clubId: clubId }
      };
    }

    return null;
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

  function _validNines(club){
    return (club.nines || []).filter(function(n){ return n.holes && n.holes.length > 0; });
  }

  function _buildNineMap(club){
    var map = {};
    var nines = club.nines || [];
    for(var i = 0; i < nines.length; i++) map[nines[i].id] = nines[i];
    return map;
  }

  function _findLayout(club, layoutId){
    var layouts = club.layouts || [];
    for(var i = 0; i < layouts.length; i++){
      if(layouts[i].id === layoutId) return layouts[i];
    }
    return null;
  }

  /** Parse holeRef like "nine_id_h3" → { nineId, holeIndex } */
  function _parseHoleRef(ref){
    var m = ref.match(/^(.+)_h(\d+)$/);
    if(!m) return null;
    return { nineId: m[1], holeIndex: parseInt(m[2], 10) - 1 };
  }

  function _placeholder(holeRef, idx){
    return {
      holeId: holeRef,
      displayNumber: idx + 1,
      par: null,
      yard: null,
      isPlaceholder: true,
      sourceId: 'unknown',
      sourceName: 'Unknown'
    };
  }

  return {
    getRoutingMode: getRoutingMode,
    buildRoutingFromLayout: buildRoutingFromLayout,
    buildRoutingFromNines: buildRoutingFromNines,
    getOrderedHolesFromRouting: getOrderedHolesFromRouting,
    validateNinePair: validateNinePair,
    getAvailableTeesForClub: getAvailableTeesForClub,
    getNines: getNines,
    getLayouts: getLayouts,
    rebuildFromSavedRound: rebuildFromSavedRound
  };

})();

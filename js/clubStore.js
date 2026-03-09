// ============================================================
// clubStore.js — Club Master Data CRUD + localStorage
// No dependencies — load after data.js
// ============================================================

const ClubStore = (function(){

  const LS_KEY = 'golf_v5_clubs';
  const VERSION = '1.0';

  var _clubs = {};  // { id: clubObj }

  // ══════════════════════════════════════════
  // ID GENERATION
  // ══════════════════════════════════════════

  function _uid(){
    return 'club_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  }
  function _nineId(){
    return 'nine_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  }
  function _teeId(){
    return 'tee_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  }
  function _layId(){
    return 'lay_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  }

  // ══════════════════════════════════════════
  // DEFAULT FACTORIES
  // ══════════════════════════════════════════

  function defaultClub(overrides){
    var now = new Date().toISOString();
    var c = {
      id: _uid(),
      name: '',
      name_en: '',
      aliases: [],

      // Geography
      city: '',
      province: '',
      district: '',
      country: 'CN',
      geo: null,

      // Structure
      nines: [],
      layouts: [],
      tee_sets: [],

      // Status
      status: 'operating',          // operating | closed | archived | unknown
      verification_level: 'unverified', // unverified | partial | verified
      status_source: null,          // e.g. "golflive", "manual", "web"
      status_as_of: null,           // ISO date string

      // Source
      source: 'manual',            // manual | golflive | import
      source_ref: null,

      // External source tracking
      external: {},

      // Metadata
      phone: '',
      website: '',
      notes: '',

      // Archive
      archive_reason: null,         // closed | archived | merged | duplicate_hidden
      merged_into: null,
      archived_at: null,

      // Timestamps
      createdAt: now,
      updatedAt: now
    };
    if(overrides){
      for(var k in overrides){
        if(overrides.hasOwnProperty(k)) c[k] = overrides[k];
      }
    }
    return c;
  }

  function defaultNine(overrides){
    var n = {
      id: _nineId(),
      name: '',
      display_name: '',
      sequence: 1,
      hole_start: 1,
      hole_end: 9,
      holes: []
    };
    // Generate 9 default holes
    for(var i = 0; i < 9; i++){
      n.holes.push({ number: n.hole_start + i, par: 4, hcp: null, tees: {} });
    }
    if(overrides){
      for(var k in overrides){
        if(overrides.hasOwnProperty(k)) n[k] = overrides[k];
      }
    }
    return n;
  }

  function defaultTeeSet(overrides){
    var t = { id: _teeId(), name: '', color: '#FFFFFF', gender: 'any' };
    if(overrides){
      for(var k in overrides){
        if(overrides.hasOwnProperty(k)) t[k] = overrides[k];
      }
    }
    return t;
  }

  function defaultLayout(overrides){
    var l = { id: _layId(), name: '', segments: [], hole_count: 18, is_default: false };
    if(overrides){
      for(var k in overrides){
        if(overrides.hasOwnProperty(k)) l[k] = overrides[k];
      }
    }
    return l;
  }

  // ══════════════════════════════════════════
  // PERSISTENCE
  // ══════════════════════════════════════════

  function _persist(){
    try {
      var data = { version: VERSION, clubs: _clubs };
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch(e){
      console.warn('[ClubStore] persist failed:', e);
    }
  }

  function _load(){
    try {
      var raw = localStorage.getItem(LS_KEY);
      if(!raw) { _clubs = {}; return; }
      var data = JSON.parse(raw);
      _clubs = (data && data.clubs) ? data.clubs : {};
    } catch(e){
      console.warn('[ClubStore] load failed:', e);
      _clubs = {};
    }
  }

  // ══════════════════════════════════════════
  // CRUD
  // ══════════════════════════════════════════

  /** List all non-archived clubs, sorted by updatedAt desc */
  function list(opts){
    opts = opts || {};
    var arr = [];
    for(var id in _clubs){
      if(!_clubs.hasOwnProperty(id)) continue;
      var c = _clubs[id];
      if(!opts.includeArchived && (c.status === 'closed' || c.status === 'archived')){
        if(c.archive_reason) continue; // truly archived
      }
      arr.push(c);
    }
    arr.sort(function(a,b){
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
    return arr;
  }

  /** List only active clubs (operating + unknown) */
  function listActive(){
    var arr = [];
    for(var id in _clubs){
      if(!_clubs.hasOwnProperty(id)) continue;
      var c = _clubs[id];
      if(c.status === 'operating' || c.status === 'unknown') arr.push(c);
    }
    arr.sort(function(a,b){
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
    return arr;
  }

  /** List archived clubs */
  function listArchived(reason){
    var arr = [];
    for(var id in _clubs){
      if(!_clubs.hasOwnProperty(id)) continue;
      var c = _clubs[id];
      if(!c.archive_reason) continue;
      if(reason && c.archive_reason !== reason) continue;
      arr.push(c);
    }
    arr.sort(function(a,b){
      return (b.archived_at || '').localeCompare(a.archived_at || '');
    });
    return arr;
  }

  function get(id){
    return _clubs[id] || null;
  }

  function save(club){
    if(!club || !club.id) return null;
    club.updatedAt = new Date().toISOString();
    _clubs[club.id] = club;
    _persist();
    return club;
  }

  function create(overrides){
    var club = defaultClub(overrides);
    _clubs[club.id] = club;
    _persist();
    return club;
  }

  function archive(id, reason){
    var c = _clubs[id];
    if(!c) return null;
    c.archive_reason = reason || 'archived';
    c.status = (reason === 'closed') ? 'closed' : 'archived';
    c.archived_at = new Date().toISOString();
    c.updatedAt = new Date().toISOString();
    _persist();
    return c;
  }

  function restore(id){
    var c = _clubs[id];
    if(!c) return null;
    c.archive_reason = null;
    c.status = 'operating';
    c.archived_at = null;
    c.updatedAt = new Date().toISOString();
    _persist();
    return c;
  }

  function remove(id){
    if(!_clubs[id]) return false;
    // Check references first
    var refs = getRefCount(id);
    if(refs > 0) return false; // cannot delete, must archive
    delete _clubs[id];
    _persist();
    return true;
  }

  // ══════════════════════════════════════════
  // SEARCH & QUERY
  // ══════════════════════════════════════════

  function search(query){
    if(!query) return listActive();
    var q = query.toLowerCase();
    var arr = [];
    for(var id in _clubs){
      if(!_clubs.hasOwnProperty(id)) continue;
      var c = _clubs[id];
      if(c.archive_reason) continue;
      var haystack = [c.name, c.name_en, c.city, c.province].concat(c.aliases || []).join(' ').toLowerCase();
      if(haystack.indexOf(q) >= 0) arr.push(c);
    }
    arr.sort(function(a,b){
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
    return arr;
  }

  function findByAlias(name){
    if(!name) return null;
    var n = name.toLowerCase();
    for(var id in _clubs){
      if(!_clubs.hasOwnProperty(id)) continue;
      var c = _clubs[id];
      if((c.name || '').toLowerCase() === n) return c;
      if((c.name_en || '').toLowerCase() === n) return c;
      var aliases = c.aliases || [];
      for(var i = 0; i < aliases.length; i++){
        if(aliases[i].toLowerCase() === n) return c;
      }
    }
    return null;
  }

  /** Count rounds referencing this club */
  function getRefCount(id){
    var count = 0;
    // Check active scorecard
    if(typeof D !== 'undefined'){
      var sc = D.sc();
      if(sc && sc.meta && sc.meta.clubId === id) count++;
      // Check rounds store
      var roundIds = D.listRoundIds ? D.listRoundIds() : [];
      for(var i = 0; i < roundIds.length; i++){
        var r = D.getRound ? D.getRound(roundIds[i]) : null;
        if(r && r.clubId === id) count++;
      }
    }
    return count;
  }

  // ══════════════════════════════════════════
  // COMPLETENESS SCORE
  // ══════════════════════════════════════════

  function completeness(club){
    if(!club) return 0;
    var score = 0;

    // Base info (20 pts)
    if(club.name) score += 5;
    if(club.city) score += 5;
    if(club.nines && club.nines.length > 0) score += 5;
    if(club.tee_sets && club.tee_sets.length > 0) score += 5;

    // Hole data (60 pts)
    var totalHoles = 0;
    var holesWithPar = 0;
    var holesWithYards = 0;
    var nines = club.nines || [];
    for(var i = 0; i < nines.length; i++){
      var holes = nines[i].holes || [];
      for(var j = 0; j < holes.length; j++){
        totalHoles++;
        if(holes[j].par && holes[j].par > 0) holesWithPar++;
        var tees = holes[j].tees || {};
        var hasTee = false;
        for(var t in tees){
          if(tees.hasOwnProperty(t) && tees[t] && (tees[t].yards || tees[t].meters)){
            hasTee = true; break;
          }
        }
        if(hasTee) holesWithYards++;
      }
    }
    if(totalHoles > 0){
      var parScore = holesWithPar / totalHoles;
      var yardsScore = holesWithYards / totalHoles;
      score += ((parScore + yardsScore) / 2) * 60;
    }

    // Layouts (10 pts)
    if(club.layouts && club.layouts.length > 0) score += 10;

    // Metadata (10 pts)
    if(club.phone) score += 3;
    if(club.website) score += 3;
    if(club.geo) score += 4;

    return Math.round(score);
  }

  function completenessColor(pct){
    if(pct <= 30) return '#ef4444';
    if(pct <= 60) return '#f97316';
    if(pct <= 85) return '#eab308';
    return '#22c55e';
  }

  // ══════════════════════════════════════════
  // STRUCTURE MUTATION API
  // ══════════════════════════════════════════

  /** Add a new nine to a club. Returns the new nine. */
  function createNine(clubId, overrides){
    var c = _clubs[clubId];
    if(!c) return null;
    var seq = (c.nines || []).length + 1;
    var nine = defaultNine(Object.assign({ sequence: seq }, overrides || {}));
    c.nines.push(nine);
    c.updatedAt = new Date().toISOString();
    _persist();
    return nine;
  }

  /** Update a nine's metadata (not holes). Returns the nine. */
  function updateNine(clubId, nineId, fields){
    var c = _clubs[clubId];
    if(!c) return null;
    var nine = _findById(c.nines, nineId);
    if(!nine) return null;
    for(var k in fields){
      if(fields.hasOwnProperty(k) && k !== 'id' && k !== 'holes'){
        nine[k] = fields[k];
      }
    }
    c.updatedAt = new Date().toISOString();
    _persist();
    return nine;
  }

  /** Delete a nine from a club. Also removes segments referencing it. */
  function deleteNine(clubId, nineId){
    var c = _clubs[clubId];
    if(!c) return false;
    var idx = _findIndexById(c.nines, nineId);
    if(idx < 0) return false;
    c.nines.splice(idx, 1);
    // Clean up layout segments
    (c.layouts || []).forEach(function(lay){
      lay.segments = (lay.segments || []).filter(function(s){ return s.nine_id !== nineId; });
      lay.hole_count = _countLayoutHoles(c, lay);
    });
    c.updatedAt = new Date().toISOString();
    _persist();
    return true;
  }

  /** Update a single hole within a nine. holeIdx is 0-based. */
  function updateHole(clubId, nineId, holeIdx, fields){
    var c = _clubs[clubId];
    if(!c) return null;
    var nine = _findById(c.nines, nineId);
    if(!nine || !nine.holes || holeIdx < 0 || holeIdx >= nine.holes.length) return null;
    var hole = nine.holes[holeIdx];
    for(var k in fields){
      if(fields.hasOwnProperty(k)){
        if(k === 'tees'){
          // Merge tee data instead of overwrite
          hole.tees = hole.tees || {};
          for(var t in fields.tees){
            if(fields.tees.hasOwnProperty(t)){
              hole.tees[t] = Object.assign(hole.tees[t] || {}, fields.tees[t]);
            }
          }
        } else {
          hole[k] = fields[k];
        }
      }
    }
    c.updatedAt = new Date().toISOString();
    _persist();
    return hole;
  }

  /** Batch update all holes in a nine. data = [{par, hcp, tees}, ...] indexed by position. */
  function updateNineHoles(clubId, nineId, holesData){
    var c = _clubs[clubId];
    if(!c) return false;
    var nine = _findById(c.nines, nineId);
    if(!nine) return false;
    for(var i = 0; i < holesData.length && i < nine.holes.length; i++){
      if(!holesData[i]) continue;
      var d = holesData[i];
      var hole = nine.holes[i];
      if(d.par !== undefined) hole.par = d.par;
      if(d.hcp !== undefined) hole.hcp = d.hcp;
      if(d.tees){
        hole.tees = hole.tees || {};
        for(var t in d.tees){
          if(d.tees.hasOwnProperty(t)){
            hole.tees[t] = Object.assign(hole.tees[t] || {}, d.tees[t]);
          }
        }
      }
    }
    c.updatedAt = new Date().toISOString();
    _persist();
    return true;
  }

  /** Add a new tee set. Returns the new tee set. */
  function createTeeSet(clubId, overrides){
    var c = _clubs[clubId];
    if(!c) return null;
    var ts = defaultTeeSet(overrides);
    c.tee_sets.push(ts);
    c.updatedAt = new Date().toISOString();
    _persist();
    return ts;
  }

  /** Update a tee set's properties. */
  function updateTeeSet(clubId, teeId, fields){
    var c = _clubs[clubId];
    if(!c) return null;
    var ts = _findById(c.tee_sets, teeId);
    if(!ts) return null;
    for(var k in fields){
      if(fields.hasOwnProperty(k) && k !== 'id'){
        ts[k] = fields[k];
      }
    }
    c.updatedAt = new Date().toISOString();
    _persist();
    return ts;
  }

  /** Delete a tee set. Also cleans up hole tee references. */
  function deleteTeeSet(clubId, teeId){
    var c = _clubs[clubId];
    if(!c) return false;
    var idx = _findIndexById(c.tee_sets, teeId);
    if(idx < 0) return false;
    c.tee_sets.splice(idx, 1);
    // Clean up hole tee data
    (c.nines || []).forEach(function(nine){
      (nine.holes || []).forEach(function(hole){
        if(hole.tees) delete hole.tees[teeId];
      });
    });
    c.updatedAt = new Date().toISOString();
    _persist();
    return true;
  }

  /** Add a new layout. Returns the new layout. */
  function createLayout(clubId, overrides){
    var c = _clubs[clubId];
    if(!c) return null;
    var lay = defaultLayout(overrides);
    lay.hole_count = _countLayoutHoles(c, lay);
    c.layouts.push(lay);
    c.updatedAt = new Date().toISOString();
    _persist();
    return lay;
  }

  /** Update a layout's properties. */
  function updateLayout(clubId, layoutId, fields){
    var c = _clubs[clubId];
    if(!c) return null;
    var lay = _findById(c.layouts, layoutId);
    if(!lay) return null;
    for(var k in fields){
      if(fields.hasOwnProperty(k) && k !== 'id'){
        lay[k] = fields[k];
      }
    }
    lay.hole_count = _countLayoutHoles(c, lay);
    c.updatedAt = new Date().toISOString();
    _persist();
    return lay;
  }

  /** Delete a layout. */
  function deleteLayout(clubId, layoutId){
    var c = _clubs[clubId];
    if(!c) return false;
    var idx = _findIndexById(c.layouts, layoutId);
    if(idx < 0) return false;
    c.layouts.splice(idx, 1);
    c.updatedAt = new Date().toISOString();
    _persist();
    return true;
  }

  // ══════════════════════════════════════════
  // GOLFLIVE IMPORT
  // ══════════════════════════════════════════

  var LS_AUDIT_KEY = 'golf_v5_import_audits';

  /**
   * Match a GolfLive course against existing clubs.
   * Primary: external.golflive.club_id
   * Secondary: name + city
   * @returns {{ club:object|null, strategy:string }}
   */
  function matchGolfLive(gl){
    var glClubId = gl.ClubId || gl.GolfLiveId || null;
    var name = (gl.Name || '').trim();
    var city = (gl.City || '').trim();

    // Primary: match by external.golflive.club_id
    if(glClubId){
      for(var id in _clubs){
        if(!_clubs.hasOwnProperty(id)) continue;
        var c = _clubs[id];
        var ext = c.external && c.external.golflive;
        if(ext && (ext.club_id === glClubId || ext.golf_live_id === glClubId)){
          return { club: c, strategy: 'golflive_id' };
        }
      }
    }

    // Secondary: name + city
    if(name){
      var matchKey = (name + '|' + city).toLowerCase().replace(/\s+/g, '');
      for(var id in _clubs){
        if(!_clubs.hasOwnProperty(id)) continue;
        var c = _clubs[id];
        var ck = ((c.name || '') + '|' + (c.city || '')).toLowerCase().replace(/\s+/g, '');
        if(ck === matchKey) return { club: c, strategy: 'name_city' };
        // Also check aliases
        var aliases = c.aliases || [];
        for(var a = 0; a < aliases.length; a++){
          var ak = (aliases[a] + '|' + (c.city || '')).toLowerCase().replace(/\s+/g, '');
          if(ak === matchKey) return { club: c, strategy: 'alias' };
        }
      }
    }

    return { club: null, strategy: 'none' };
  }

  /**
   * Build nines array from GolfLive Halves.
   */
  function buildNinesFromHalves(halves){
    var nines = [];
    var labels = ['A','B','C','D','E','F'];
    for(var h = 0; h < halves.length; h++){
      var half = halves[h];
      var pars = half.HolePars || [];
      var hdcps = half.HoleHDCP || [];
      var holeCount = pars.length || 9;
      var nine = {
        id: _nineId(),
        name: half.Name || (labels[h] || ('Nine' + (h+1))),
        display_name: half.Name || '',
        sequence: h + 1,
        hole_start: h * 9 + 1,
        hole_end: h * 9 + holeCount,
        holes: []
      };
      for(var j = 0; j < holeCount; j++){
        nine.holes.push({
          number: nine.hole_start + j,
          par: pars[j] || 4,
          hcp: hdcps[j] || null,
          tees: {}
        });
      }
      nines.push(nine);
    }
    return nines;
  }

  /**
   * Auto-generate layouts from a nines array.
   */
  function buildLayoutsFromNines(nines){
    var layouts = [];
    if(nines.length >= 2){
      if(nines.length === 2){
        layouts.push(_makeLayout(nines[0].name + '+' + nines[1].name, [nines[0], nines[1]], true));
      } else if(nines.length === 3){
        layouts.push(_makeLayout(nines[0].name + '+' + nines[1].name, [nines[0], nines[1]], true));
        layouts.push(_makeLayout(nines[0].name + '+' + nines[2].name, [nines[0], nines[2]], false));
        layouts.push(_makeLayout(nines[1].name + '+' + nines[2].name, [nines[1], nines[2]], false));
      } else {
        for(var p = 0; p < nines.length - 1; p++){
          for(var q = p + 1; q < nines.length; q++){
            layouts.push(_makeLayout(nines[p].name + '+' + nines[q].name, [nines[p], nines[q]], p === 0 && q === 1));
          }
        }
      }
    } else if(nines.length === 1){
      layouts.push(_makeLayout(nines[0].name, [nines[0]], true));
    }
    return layouts;
  }

  /**
   * Execute an import plan.
   * @param {Array} plan - Array of { gl, action, matchedClub }
   *   action: 'create' | 'update' | 'alias' | 'skip'
   * @param {string} sourceFile - filename for audit
   * @returns {{ imported:number, updated:number, aliased:number, skipped:number, errors:number, errorDetails:string[] }}
   */
  function executeImportPlan(plan, sourceFile){
    var result = { imported: 0, updated: 0, aliased: 0, skipped: 0, errors: 0, errorDetails: [] };
    var now = new Date().toISOString();
    var dirty = false;

    for(var i = 0; i < plan.length; i++){
      var item = plan[i];
      var gl = item.gl;
      var action = item.action;

      try {
        var name = (gl.Name || '').trim();
        if(!name){
          result.errors++;
          result.errorDetails.push('Row ' + (i+1) + ': missing Name');
          continue;
        }

        if(action === 'skip'){
          result.skipped++;
          continue;
        }

        var glExt = {
          golf_live_id: gl.GolfLiveId || null,
          club_id: gl.ClubId || null,
          imported_at: now,
          source_file: sourceFile || null
        };

        if(action === 'alias'){
          // Link as alias to matched club
          var target = item.matchedClub;
          if(!target || !_clubs[target.id]){
            result.errors++;
            result.errorDetails.push('Row ' + (i+1) + ' (' + name + '): matched club not found');
            continue;
          }
          var c = _clubs[target.id];
          c.aliases = c.aliases || [];
          if(c.aliases.indexOf(name) < 0) c.aliases.push(name);
          c.external = c.external || {};
          c.external.golflive = glExt;
          c.updatedAt = now;
          dirty = true;
          result.aliased++;
          continue;
        }

        if(action === 'update'){
          // Match & Update — overwrite structure, merge metadata
          var target = item.matchedClub;
          if(!target || !_clubs[target.id]){
            result.errors++;
            result.errorDetails.push('Row ' + (i+1) + ' (' + name + '): matched club not found');
            continue;
          }
          var c = _clubs[target.id];
          var halves = gl.Halves || [];
          if(halves.length > 0){
            c.nines = buildNinesFromHalves(halves);
            c.layouts = buildLayoutsFromNines(c.nines);
          }
          // Update geo if available
          var lat = parseFloat(gl.Latitude);
          var lng = parseFloat(gl.Longitude);
          if(!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)){
            c.geo = { lat: lat, lng: lng };
          }
          // Update province/city if empty
          if(!c.province && gl.Region) c.province = gl.Region.trim();
          if(!c.city && gl.City) c.city = gl.City.trim();
          // Update external tracking
          c.external = c.external || {};
          c.external.golflive = glExt;
          c.source = c.source || 'golflive';
          c.status_source = 'golflive';
          c.status_as_of = now;
          if(gl.Address && !c.notes) c.notes = 'Address: ' + gl.Address;
          c.updatedAt = now;
          dirty = true;
          result.updated++;
          continue;
        }

        // action === 'create'
        var halves = gl.Halves || [];
        var nines = buildNinesFromHalves(halves);
        var layouts = buildLayoutsFromNines(nines);

        var geo = null;
        var lat = parseFloat(gl.Latitude);
        var lng = parseFloat(gl.Longitude);
        if(!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)){
          geo = { lat: lat, lng: lng };
        }

        var club = defaultClub({
          name: name,
          province: (gl.Region || '').trim(),
          city: (gl.City || '').trim(),
          geo: geo,
          nines: nines,
          layouts: layouts,
          tee_sets: [],
          external: { golflive: glExt },
          source: 'golflive',
          source_ref: gl.GolfLiveId || gl.ClubId || null,
          status_source: 'golflive',
          status_as_of: now,
          notes: gl.Address ? ('Address: ' + gl.Address) : '',
          createdAt: now,
          updatedAt: now
        });

        _clubs[club.id] = club;
        dirty = true;
        result.imported++;
      } catch(e){
        result.errors++;
        result.errorDetails.push('Row ' + (i+1) + ' (' + (gl.Name || '?') + '): ' + e.message);
      }
    }

    if(dirty) _persist();

    // Save audit
    _saveImportAudit({
      imported_count: result.imported,
      updated_count: result.updated,
      alias_linked_count: result.aliased,
      skipped_count: result.skipped,
      error_count: result.errors,
      total_count: plan.length,
      imported_at: now,
      source_file: sourceFile || null
    });

    return result;
  }

  /**
   * Legacy compat: simple bulk import (wraps executeImportPlan).
   */
  function importGolfLiveCourses(courses, sourceFile){
    var plan = [];
    for(var i = 0; i < courses.length; i++){
      var match = matchGolfLive(courses[i]);
      plan.push({
        gl: courses[i],
        action: match.club ? 'skip' : 'create',
        matchedClub: match.club
      });
    }
    return executeImportPlan(plan, sourceFile);
  }

  // ── Import Audit Persistence ──

  function _saveImportAudit(audit){
    try {
      var raw = localStorage.getItem(LS_AUDIT_KEY);
      var audits = raw ? JSON.parse(raw) : [];
      audits.unshift(audit);
      if(audits.length > 50) audits = audits.slice(0, 50);
      localStorage.setItem(LS_AUDIT_KEY, JSON.stringify(audits));
    } catch(e){
      console.warn('[ClubStore] audit save failed:', e);
    }
  }

  function getImportAudits(){
    try {
      var raw = localStorage.getItem(LS_AUDIT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e){ return []; }
  }

  function _makeLayout(name, nineArr, isDefault){
    var segs = [];
    for(var i = 0; i < nineArr.length; i++){
      segs.push({ nine_id: nineArr[i].id, order: i + 1 });
    }
    var holeCount = 0;
    for(var i = 0; i < nineArr.length; i++){
      holeCount += (nineArr[i].holes || []).length;
    }
    return {
      id: _layId(),
      name: name,
      segments: segs,
      hole_count: holeCount,
      is_default: !!isDefault
    };
  }

  // ── Internal helpers ──
  function _findById(arr, id){
    if(!arr) return null;
    for(var i = 0; i < arr.length; i++){
      if(arr[i].id === id) return arr[i];
    }
    return null;
  }

  function _findIndexById(arr, id){
    if(!arr) return -1;
    for(var i = 0; i < arr.length; i++){
      if(arr[i].id === id) return i;
    }
    return -1;
  }

  function _countLayoutHoles(club, layout){
    var count = 0;
    var segs = layout.segments || [];
    for(var i = 0; i < segs.length; i++){
      var nine = _findById(club.nines, segs[i].nine_id);
      if(nine) count += (nine.holes || []).length;
    }
    return count || layout.hole_count || 0;
  }

  // ══════════════════════════════════════════
  // TOTAL HOLE COUNT
  // ══════════════════════════════════════════

  function totalHoles(club){
    if(!club || !club.nines) return 0;
    var count = 0;
    for(var i = 0; i < club.nines.length; i++){
      count += (club.nines[i].holes || []).length;
    }
    return count;
  }

  // ══════════════════════════════════════════
  // INIT
  // ══════════════════════════════════════════

  _load();
  console.log('[ClubStore] loaded', Object.keys(_clubs).length, 'clubs');

  return {
    list: list,
    listActive: listActive,
    listArchived: listArchived,
    get: get,
    save: save,
    create: create,
    archive: archive,
    restore: restore,
    remove: remove,
    search: search,
    findByAlias: findByAlias,
    getRefCount: getRefCount,
    completeness: completeness,
    completenessColor: completenessColor,
    totalHoles: totalHoles,
    defaultClub: defaultClub,
    defaultNine: defaultNine,
    defaultTeeSet: defaultTeeSet,
    defaultLayout: defaultLayout,
    // Structure mutation
    createNine: createNine,
    updateNine: updateNine,
    deleteNine: deleteNine,
    updateHole: updateHole,
    updateNineHoles: updateNineHoles,
    createTeeSet: createTeeSet,
    updateTeeSet: updateTeeSet,
    deleteTeeSet: deleteTeeSet,
    createLayout: createLayout,
    updateLayout: updateLayout,
    deleteLayout: deleteLayout,
    // Import
    matchGolfLive: matchGolfLive,
    buildNinesFromHalves: buildNinesFromHalves,
    buildLayoutsFromNines: buildLayoutsFromNines,
    executeImportPlan: executeImportPlan,
    importGolfLiveCourses: importGolfLiveCourses,
    getImportAudits: getImportAudits
  };

})();

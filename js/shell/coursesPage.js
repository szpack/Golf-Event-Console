// ============================================================
// coursesPage.js — Courses (Club Library) List + Drawer Detail
// Depends on: clubStore.js, data.js
// ============================================================

const CoursesPage = (function(){

  var _filter = { query:'', city:'', status:'', source:'' };
  var _drawerClubId = null;

  // ══════════════════════════════════════════
  // RENDER — List Page
  // ══════════════════════════════════════════

  function render(){
    var el = document.getElementById('page-courses-content');
    if(!el) return;

    var html = '';

    // Header row
    html += '<div class="cs-header">';
    html += '<h2 class="cs-page-title">Courses</h2>';
    html += '<div class="cs-header-actions">';
    html += '<button class="cs-btn cs-btn-default" onclick="Router.navigate(\'/courses/import\')">Import</button>';
    html += '<button class="cs-btn cs-btn-primary" onclick="CoursesPage.createNew()">+ New Club</button>';
    html += '</div>';
    html += '</div>';

    // Search + Filters
    html += '<div class="cs-filters">';
    html += '<input type="text" class="cs-search" id="cs-search" placeholder="Search clubs..." value="' + _esc(_filter.query) + '" oninput="CoursesPage.onSearch(this.value)">';
    html += '<select class="cs-select" id="cs-filter-status" onchange="CoursesPage.onFilterStatus(this.value)">';
    html += '<option value="">All Status</option>';
    html += '<option value="operating"' + (_filter.status==='operating'?' selected':'') + '>Operating</option>';
    html += '<option value="unknown"' + (_filter.status==='unknown'?' selected':'') + '>Unknown</option>';
    html += '</select>';
    html += '<select class="cs-select" id="cs-filter-source" onchange="CoursesPage.onFilterSource(this.value)">';
    html += '<option value="">All Sources</option>';
    html += '<option value="manual"' + (_filter.source==='manual'?' selected':'') + '>Manual</option>';
    html += '<option value="golflive"' + (_filter.source==='golflive'?' selected':'') + '>GolfLive</option>';
    html += '<option value="import"' + (_filter.source==='import'?' selected':'') + '>Import</option>';
    html += '</select>';
    html += '</div>';

    // Build city list from data
    var allClubs = ClubStore.listActive();
    var cities = _extractCities(allClubs);

    // Filter
    var clubs = _applyFilters();

    // Stats bar
    html += '<div class="cs-stats">';
    html += '<span class="cs-stats-count">' + clubs.length + ' club' + (clubs.length !== 1 ? 's' : '') + '</span>';
    var archived = ClubStore.listArchived();
    if(archived.length > 0){
      html += '<button class="cs-link-btn" onclick="CoursesPage.showArchived()">Archived (' + archived.length + ')</button>';
    }
    html += '</div>';

    // Table
    if(clubs.length === 0){
      html += '<div class="cs-empty">';
      html += '<div class="cs-empty-icon">&#127948;</div>';
      html += '<div class="cs-empty-title">No clubs yet</div>';
      html += '<div class="cs-empty-text">Add your first golf club to get started.</div>';
      html += '<button class="cs-btn cs-btn-primary" onclick="CoursesPage.createNew()" style="margin-top:16px">+ New Club</button>';
      html += '</div>';
    } else {
      html += '<div class="cs-table-wrap">';
      html += '<table class="cs-table">';
      html += '<thead><tr>';
      html += '<th class="cs-th-name">Name</th>';
      html += '<th class="cs-th-city">City</th>';
      html += '<th class="cs-th-holes">Holes</th>';
      html += '<th class="cs-th-layouts">Layouts</th>';
      html += '<th class="cs-th-status">Status</th>';
      html += '<th class="cs-th-source">Source</th>';
      html += '<th class="cs-th-updated">Updated</th>';
      html += '</tr></thead>';
      html += '<tbody>';
      for(var i = 0; i < clubs.length; i++){
        html += _renderRow(clubs[i]);
      }
      html += '</tbody></table>';
      html += '</div>';
    }

    el.innerHTML = html;
  }

  function _renderRow(club){
    var pct = ClubStore.completeness(club);
    var pctColor = ClubStore.completenessColor(pct);
    var holes = ClubStore.totalHoles(club);
    var layouts = (club.layouts || []).length;
    var statusCls = 'cs-status-' + (club.status || 'unknown');
    var statusLabel = _statusLabel(club.status);
    var sourceLabel = club.source || '—';
    var updated = _fmtDate(club.updatedAt);
    var name = _esc(club.name || club.name_en || 'Untitled');

    var html = '<tr class="cs-row" onclick="CoursesPage.openDrawer(\'' + club.id + '\')">';
    html += '<td class="cs-td-name">';
    html += '<div class="cs-club-name">' + name + '</div>';
    html += '<div class="cs-completeness-bar"><div class="cs-completeness-fill" style="width:' + pct + '%;background:' + pctColor + '"></div></div>';
    html += '</td>';
    html += '<td class="cs-td-city">' + _esc(club.city || '—') + '</td>';
    html += '<td class="cs-td-holes">' + (holes || '—') + '</td>';
    html += '<td class="cs-td-layouts">' + (layouts || '—') + '</td>';
    html += '<td class="cs-td-status"><span class="cs-status ' + statusCls + '">' + statusLabel + '</span></td>';
    html += '<td class="cs-td-source">' + _esc(sourceLabel) + '</td>';
    html += '<td class="cs-td-updated">' + updated + '</td>';
    html += '</tr>';
    return html;
  }

  // ══════════════════════════════════════════
  // DRAWER — Right-side Club Detail
  // ══════════════════════════════════════════

  function openDrawer(clubId){
    _drawerClubId = clubId;
    var club = ClubStore.get(clubId);
    if(!club) return;

    _ensureDrawerDOM();

    var el = document.getElementById('cs-drawer-body');
    if(!el) return;

    var pct = ClubStore.completeness(club);
    var pctColor = ClubStore.completenessColor(pct);
    var holes = ClubStore.totalHoles(club);

    var html = '';

    // Header
    html += '<div class="cs-drawer-header">';
    html += '<h3 class="cs-drawer-name">' + _esc(club.name || 'Untitled') + '</h3>';
    if(club.name_en) html += '<div class="cs-drawer-name-en">' + _esc(club.name_en) + '</div>';
    html += '<div class="cs-drawer-meta">';
    html += '<span class="cs-status cs-status-' + club.status + '">' + _statusLabel(club.status) + '</span>';
    if(club.verification_level && club.verification_level !== 'unverified'){
      html += ' <span class="cs-verification cs-veri-' + club.verification_level + '">' + club.verification_level + '</span>';
    }
    html += '</div>';
    html += '<div class="cs-drawer-bar">';
    html += '<div class="cs-completeness-bar cs-completeness-lg"><div class="cs-completeness-fill" style="width:' + pct + '%;background:' + pctColor + '"></div></div>';
    html += '<span class="cs-drawer-pct">' + pct + '%</span>';
    html += '</div>';
    html += '</div>';

    // Info cards
    html += '<div class="cs-drawer-section">';
    html += '<div class="cs-drawer-label">Location</div>';
    html += '<div class="cs-drawer-value">' + _esc([club.city, club.province, club.country].filter(Boolean).join(', ') || '—') + '</div>';
    html += '</div>';

    // Structure summary
    html += '<div class="cs-drawer-section">';
    html += '<div class="cs-drawer-label">Structure</div>';
    html += '<div class="cs-drawer-value">' + holes + ' holes across ' + (club.nines || []).length + ' nine(s)</div>';
    if(club.nines && club.nines.length > 0){
      html += '<div class="cs-drawer-nines">';
      for(var i = 0; i < club.nines.length; i++){
        var n = club.nines[i];
        html += '<div class="cs-nine-chip">' + _esc(n.display_name || n.name || ('Nine ' + (i+1))) + ' (' + (n.holes||[]).length + 'H)</div>';
      }
      html += '</div>';
    }
    html += '</div>';

    // Layouts
    if(club.layouts && club.layouts.length > 0){
      html += '<div class="cs-drawer-section">';
      html += '<div class="cs-drawer-label">Layouts (' + club.layouts.length + ')</div>';
      for(var i = 0; i < club.layouts.length; i++){
        var lay = club.layouts[i];
        html += '<div class="cs-layout-item">';
        html += '<span class="cs-layout-name">' + _esc(lay.name || 'Layout ' + (i+1)) + '</span>';
        html += '<span class="cs-layout-holes">' + lay.hole_count + 'H</span>';
        if(lay.is_default) html += '<span class="cs-layout-default">Default</span>';
        html += '</div>';
      }
      html += '</div>';
    }

    // Tee Sets
    if(club.tee_sets && club.tee_sets.length > 0){
      html += '<div class="cs-drawer-section">';
      html += '<div class="cs-drawer-label">Tee Sets (' + club.tee_sets.length + ')</div>';
      html += '<div class="cs-tee-chips">';
      for(var i = 0; i < club.tee_sets.length; i++){
        var ts = club.tee_sets[i];
        html += '<span class="cs-tee-chip" style="border-color:' + (ts.color || '#888') + '">';
        html += '<span class="cs-tee-dot" style="background:' + (ts.color || '#888') + '"></span>';
        html += _esc(ts.name || 'Tee');
        if(ts.gender && ts.gender !== 'any') html += ' <span class="cs-tee-gender">(' + ts.gender + ')</span>';
        html += '</span>';
      }
      html += '</div>';
      html += '</div>';
    }

    // Aliases
    if(club.aliases && club.aliases.length > 0){
      html += '<div class="cs-drawer-section">';
      html += '<div class="cs-drawer-label">Aliases</div>';
      html += '<div class="cs-drawer-value">' + club.aliases.map(_esc).join(', ') + '</div>';
      html += '</div>';
    }

    // Metadata
    html += '<div class="cs-drawer-section">';
    html += '<div class="cs-drawer-label">Metadata</div>';
    if(club.phone) html += '<div class="cs-drawer-value">Phone: ' + _esc(club.phone) + '</div>';
    if(club.website) html += '<div class="cs-drawer-value">Web: ' + _esc(club.website) + '</div>';
    html += '<div class="cs-drawer-value">Source: ' + _esc(club.source || '—') + '</div>';
    html += '<div class="cs-drawer-value">Created: ' + _fmtDate(club.createdAt) + '</div>';
    html += '<div class="cs-drawer-value">Updated: ' + _fmtDate(club.updatedAt) + '</div>';
    html += '</div>';

    // Actions
    html += '<div class="cs-drawer-actions">';
    html += '<button class="cs-btn cs-btn-default" onclick="CoursesPage.editClub(\'' + club.id + '\')">Edit Details</button>';
    html += '<button class="cs-btn cs-btn-danger" onclick="CoursesPage.archiveClub(\'' + club.id + '\')">Archive</button>';
    html += '</div>';

    el.innerHTML = html;

    // Show drawer
    document.getElementById('cs-drawer').classList.add('cs-drawer-open');
    document.getElementById('cs-drawer-bg').classList.add('cs-drawer-bg-show');
  }

  function closeDrawer(){
    _drawerClubId = null;
    var d = document.getElementById('cs-drawer');
    var bg = document.getElementById('cs-drawer-bg');
    if(d) d.classList.remove('cs-drawer-open');
    if(bg) bg.classList.remove('cs-drawer-bg-show');
  }

  function _ensureDrawerDOM(){
    if(document.getElementById('cs-drawer')) return;

    var bg = document.createElement('div');
    bg.id = 'cs-drawer-bg';
    bg.className = 'cs-drawer-bg';
    bg.onclick = function(){ closeDrawer(); };
    document.body.appendChild(bg);

    var drawer = document.createElement('div');
    drawer.id = 'cs-drawer';
    drawer.className = 'cs-drawer';
    drawer.innerHTML = '<div class="cs-drawer-hdr">'
      + '<span class="cs-drawer-title">Club Detail</span>'
      + '<button class="cs-drawer-close" onclick="CoursesPage.closeDrawer()">&times;</button>'
      + '</div>'
      + '<div class="cs-drawer-body" id="cs-drawer-body"></div>';
    document.body.appendChild(drawer);
  }

  // ══════════════════════════════════════════
  // FILTERS
  // ══════════════════════════════════════════

  function onSearch(val){
    _filter.query = val;
    render();
  }

  function onFilterStatus(val){
    _filter.status = val;
    render();
  }

  function onFilterSource(val){
    _filter.source = val;
    render();
  }

  function _applyFilters(){
    var clubs = _filter.query ? ClubStore.search(_filter.query) : ClubStore.listActive();
    if(_filter.status){
      clubs = clubs.filter(function(c){ return c.status === _filter.status; });
    }
    if(_filter.source){
      clubs = clubs.filter(function(c){ return c.source === _filter.source; });
    }
    return clubs;
  }

  function _extractCities(clubs){
    var map = {};
    for(var i = 0; i < clubs.length; i++){
      if(clubs[i].city) map[clubs[i].city] = true;
    }
    return Object.keys(map).sort();
  }

  // ══════════════════════════════════════════
  // ACTIONS
  // ══════════════════════════════════════════

  function createNew(){
    var name = prompt('Club name:');
    if(!name) return;
    var club = ClubStore.create({ name: name });
    render();
    openDrawer(club.id);
  }

  function editClub(id){
    // Navigate to full detail page (P1)
    closeDrawer();
    Router.navigate('/courses/' + id);
  }

  function archiveClub(id){
    var club = ClubStore.get(id);
    if(!club) return;
    var refs = ClubStore.getRefCount(id);
    if(refs > 0){
      alert('This club is referenced by ' + refs + ' round(s). It will be archived (not deleted).');
    }
    if(!confirm('Archive "' + (club.name || 'Untitled') + '"?')) return;
    ClubStore.archive(id, 'archived');
    closeDrawer();
    render();
  }

  function showArchived(){
    // Simple alert for now — P2 will add full archived page
    var archived = ClubStore.listArchived();
    if(archived.length === 0){ alert('No archived clubs.'); return; }
    var msg = 'Archived Clubs:\n\n';
    for(var i = 0; i < archived.length; i++){
      msg += '- ' + (archived[i].name || 'Untitled') + ' (' + (archived[i].archive_reason || '?') + ')\n';
    }
    msg += '\nRestore via the full Archived page (coming soon).';
    alert(msg);
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

  function _esc(s){
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _fmtDate(iso){
    if(!iso) return '—';
    return iso.slice(0,10);
  }

  function _statusLabel(s){
    var map = { operating:'Operating', closed:'Closed', archived:'Archived', unknown:'Unknown' };
    return map[s] || s || '—';
  }

  return {
    render: render,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    onSearch: onSearch,
    onFilterStatus: onFilterStatus,
    onFilterSource: onFilterSource,
    createNew: createNew,
    editClub: editClub,
    archiveClub: archiveClub,
    showArchived: showArchived
  };

})();

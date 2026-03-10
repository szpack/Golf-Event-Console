// ============================================================
// coursesPage.js — Courses (Club Library) List + Drawer Detail
// Depends on: clubStore.js, data.js
// ============================================================

const CoursesPage = (function(){

  var _filter = { query:'', status:'', source:'', province:'', city:'' };
  var _sort = { col:'updated', asc:false };
  var _drawerClubId = null;
  var _composing = false;        // IME support
  var _page = 0;                 // current page (0-based)
  var _pageSize = 20;            // rows per page (user-selectable)

  // ══════════════════════════════════════════
  // RENDER — List Page
  // ══════════════════════════════════════════

  function render(){
    var el = document.getElementById('page-courses-content');
    if(!el) return;
    if(!Shell.requireAuth('page-courses-content')) return;

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
    var allClubs = ClubStore.listActive();
    var provinces = _extractField(allClubs, 'province');
    var cities = _extractCities(allClubs, _filter.province);

    html += '<div class="cs-filters">';
    html += '<input type="text" class="cs-search" id="cs-search" placeholder="Search clubs..." value="' + _esc(_filter.query) + '">';
    html += '<select class="cs-select" id="cs-filter-province" onchange="CoursesPage.onFilterProvince(this.value)">';
    html += '<option value="">All Provinces</option>';
    for(var pi = 0; pi < provinces.length; pi++){
      html += '<option value="' + _esc(provinces[pi]) + '"' + (_filter.province===provinces[pi]?' selected':'') + '>' + _esc(provinces[pi]) + '</option>';
    }
    html += '</select>';
    html += '<select class="cs-select" id="cs-filter-city" onchange="CoursesPage.onFilterCity(this.value)">';
    html += '<option value="">All Cities</option>';
    for(var ci = 0; ci < cities.length; ci++){
      html += '<option value="' + _esc(cities[ci]) + '"' + (_filter.city===cities[ci]?' selected':'') + '>' + _esc(cities[ci]) + '</option>';
    }
    html += '</select>';
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

    // Get filtered + sorted clubs
    var clubs = _applyFilters();
    clubs = _applySort(clubs);
    var totalCount = clubs.length;

    // Pagination
    var totalPages = Math.max(1, Math.ceil(totalCount / _pageSize));
    if(_page >= totalPages) _page = totalPages - 1;
    if(_page < 0) _page = 0;
    var startIdx = _page * _pageSize;
    var pageClubs = clubs.slice(startIdx, startIdx + _pageSize);

    // Stats bar
    var totalAll = allClubs.length;
    var hasFilter = _filter.query || _filter.status || _filter.source || _filter.province || _filter.city;
    html += '<div class="cs-stats">';
    html += '<span class="cs-stats-count">';
    if(hasFilter){
      html += totalCount + ' / ' + totalAll + ' clubs';
    } else {
      html += totalCount + ' club' + (totalCount !== 1 ? 's' : '');
    }
    if(totalPages > 1) html += ' &middot; Page ' + (_page + 1) + '/' + totalPages;
    html += '</span>';
    html += '<span class="cs-stats-right">';
    // Page size selector
    html += '<select class="cs-select cs-pagesize-select" onchange="CoursesPage.setPageSize(+this.value)">';
    var sizes = [10, 20, 50];
    for(var si = 0; si < sizes.length; si++){
      html += '<option value="' + sizes[si] + '"' + (_pageSize === sizes[si] ? ' selected' : '') + '>' + sizes[si] + ' / page</option>';
    }
    html += '</select>';
    var archived = ClubStore.listArchived();
    if(archived.length > 0){
      html += '<button class="cs-link-btn" onclick="CoursesPage.showArchived()">Archived (' + archived.length + ')</button>';
    }
    html += '</span>';
    html += '</div>';

    // Table
    if(totalCount === 0){
      html += '<div class="cs-empty">';
      html += '<div class="cs-empty-icon">&#127948;</div>';
      html += '<div class="cs-empty-title">No clubs found</div>';
      if(_filter.query || _filter.status || _filter.source || _filter.province || _filter.city){
        html += '<div class="cs-empty-text">Try adjusting your filters.</div>';
      } else {
        html += '<div class="cs-empty-text">Add your first golf club to get started.</div>';
        html += '<button class="cs-btn cs-btn-primary" onclick="CoursesPage.createNew()" style="margin-top:16px">+ New Club</button>';
      }
      html += '</div>';
    } else {
      html += '<div class="cs-table-wrap">';
      html += '<table class="cs-table">';
      html += '<thead><tr>';
      html += _thSortable('name', 'Name', 'cs-th-name');
      html += _thSortable('city', 'City', 'cs-th-city');
      html += '<th class="cs-th-holes">Holes</th>';
      html += '<th class="cs-th-layouts">Layouts</th>';
      html += _thSortable('status', 'Status', 'cs-th-status');
      html += _thSortable('updated', 'Updated', 'cs-th-updated');
      html += '<th class="cs-th-actions">Actions</th>';
      html += '</tr></thead>';
      html += '<tbody>';
      for(var i = 0; i < pageClubs.length; i++){
        html += _renderRow(pageClubs[i], startIdx + i);
      }
      html += '</tbody></table>';
      html += '</div>';

      // Pagination controls
      if(totalPages > 1){
        html += '<div class="cs-pagination">';
        html += '<button class="cs-page-btn" onclick="CoursesPage.goPage(0)"' + (_page === 0 ? ' disabled' : '') + '>&laquo;</button>';
        html += '<button class="cs-page-btn" onclick="CoursesPage.goPage(' + (_page - 1) + ')"' + (_page === 0 ? ' disabled' : '') + '>&lsaquo;</button>';

        // Show page numbers around current
        var pStart = Math.max(0, _page - 2);
        var pEnd = Math.min(totalPages - 1, _page + 2);
        for(var p = pStart; p <= pEnd; p++){
          html += '<button class="cs-page-btn' + (p === _page ? ' cs-page-active' : '') + '" onclick="CoursesPage.goPage(' + p + ')">' + (p + 1) + '</button>';
        }

        html += '<button class="cs-page-btn" onclick="CoursesPage.goPage(' + (_page + 1) + ')"' + (_page >= totalPages - 1 ? ' disabled' : '') + '>&rsaquo;</button>';
        html += '<button class="cs-page-btn" onclick="CoursesPage.goPage(' + (totalPages - 1) + ')"' + (_page >= totalPages - 1 ? ' disabled' : '') + '>&raquo;</button>';
        html += '</div>';
      }
    }

    el.innerHTML = html;
    _wireSearch();
  }

  function _thSortable(col, label, cls){
    var arrow = '';
    if(_sort.col === col){
      arrow = _sort.asc ? ' &#9650;' : ' &#9660;';
    }
    return '<th class="' + cls + ' cs-th-sortable" onclick="CoursesPage.toggleSort(\'' + col + '\')">' + label + arrow + '</th>';
  }

  function _renderRow(club, index){
    var holes = ClubStore.totalHoles(club);
    var layouts = (club.layouts || []).length;
    var statusCls = 'cs-status-' + (club.status || 'unknown');
    var statusLabel = _statusLabel(club.status);
    var name = _esc(club.name || club.name_en || 'Untitled');
    var zebraClass = index % 2 === 1 ? ' cs-row-alt' : '';

    var html = '<tr class="cs-row' + zebraClass + '">';
    html += '<td class="cs-td-name" onclick="CoursesPage.openDrawer(\'' + club.id + '\')">';
    html += '<div class="cs-club-name">' + name + '</div>';
    if(club.name_en && club.name) html += '<div class="cs-club-name-en">' + _esc(club.name_en) + '</div>';
    html += '</td>';
    html += '<td class="cs-td-city">' + _esc(club.city || '—') + '</td>';
    html += '<td class="cs-td-holes">' + (holes || '—') + '</td>';
    html += '<td class="cs-td-layouts">' + (layouts || '—') + '</td>';
    html += '<td class="cs-td-status"><span class="cs-status ' + statusCls + '"><span class="cs-status-dot"></span>' + statusLabel + '</span></td>';
    html += '<td class="cs-td-updated">' + _fmtDate(club.updatedAt || club.createdAt) + '</td>';
    html += '<td class="cs-td-actions">';
    html += '<button class="cs-row-btn cs-row-btn-edit" onclick="event.stopPropagation();CoursesPage.editClub(\'' + club.id + '\')" title="Edit">Edit</button>';
    html += '<button class="cs-row-btn cs-row-btn-del" onclick="event.stopPropagation();CoursesPage.deleteClub(\'' + club.id + '\')" title="Delete">Del</button>';
    html += '</td>';
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
    html += '<button class="cs-btn cs-btn-danger" onclick="CoursesPage.deleteClub(\'' + club.id + '\')">Delete</button>';
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
  // SEARCH — with IME + focus restore
  // ══════════════════════════════════════════

  function _wireSearch(){
    var searchInput = document.getElementById('cs-search');
    if(!searchInput) return;

    searchInput.addEventListener('compositionstart', function(){ _composing = true; });
    searchInput.addEventListener('compositionend', function(){
      _composing = false;
      _filter.query = this.value;
      _page = 0;
      var pos = this.selectionStart;
      render();
      var restored = document.getElementById('cs-search');
      if(restored){ restored.focus(); restored.setSelectionRange(pos, pos); }
    });
    searchInput.addEventListener('input', function(){
      if(_composing) return;
      _filter.query = this.value;
      _page = 0;
      var pos = this.selectionStart;
      render();
      var restored = document.getElementById('cs-search');
      if(restored){ restored.focus(); restored.setSelectionRange(pos, pos); }
    });
  }

  // ══════════════════════════════════════════
  // FILTERS & SORT
  // ══════════════════════════════════════════

  function onFilterProvince(val){
    _filter.province = val;
    _filter.city = '';   // reset city when province changes
    _page = 0;
    render();
  }

  function onFilterCity(val){
    _filter.city = val;
    _page = 0;
    render();
  }

  function onFilterStatus(val){
    _filter.status = val;
    _page = 0;
    render();
  }

  function onFilterSource(val){
    _filter.source = val;
    _page = 0;
    render();
  }

  function setPageSize(n){
    _pageSize = n;
    _page = 0;
    render();
  }

  function toggleSort(col){
    if(_sort.col === col){
      _sort.asc = !_sort.asc;
    } else {
      _sort.col = col;
      _sort.asc = true;
    }
    render();
  }

  function _applyFilters(){
    var clubs = _filter.query ? ClubStore.search(_filter.query) : ClubStore.listActive();
    if(_filter.province){
      clubs = clubs.filter(function(c){ return (c.province || '') === _filter.province; });
    }
    if(_filter.city){
      clubs = clubs.filter(function(c){ return (c.city || '') === _filter.city; });
    }
    if(_filter.status){
      clubs = clubs.filter(function(c){ return c.status === _filter.status; });
    }
    if(_filter.source){
      clubs = clubs.filter(function(c){ return c.source === _filter.source; });
    }
    return clubs;
  }

  function _applySort(clubs){
    var col = _sort.col;
    var dir = _sort.asc ? 1 : -1;
    return clubs.slice().sort(function(a, b){
      var va, vb;
      switch(col){
        case 'name':
          va = (a.name || a.name_en || '').toLowerCase();
          vb = (b.name || b.name_en || '').toLowerCase();
          break;
        case 'city':
          va = (a.city || '').toLowerCase();
          vb = (b.city || '').toLowerCase();
          break;
        case 'status':
          va = a.status || '';
          vb = b.status || '';
          break;
        case 'updated':
          va = a.updatedAt || a.createdAt || '';
          vb = b.updatedAt || b.createdAt || '';
          break;
        default:
          va = ''; vb = '';
      }
      if(va < vb) return -1 * dir;
      if(va > vb) return 1 * dir;
      return 0;
    });
  }

  // ══════════════════════════════════════════
  // PAGINATION
  // ══════════════════════════════════════════

  function goPage(p){
    _page = p;
    render();
    // Scroll to top of table
    var el = document.getElementById('page-courses-content');
    if(el) el.scrollTop = 0;
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
    closeDrawer();
    Router.navigate('/courses/' + id);
  }

  function deleteClub(id){
    var club = ClubStore.get(id);
    if(!club) return;
    var label = club.name || club.name_en || 'Untitled';
    var refs = ClubStore.getRefCount(id);
    var msg = 'Are you sure you want to delete "' + label + '"?';
    if(refs > 0){
      msg = '"' + label + '" is referenced by ' + refs + ' round(s). It will be archived instead of permanently deleted.\n\nContinue?';
    }
    if(!confirm(msg)) return;
    ClubStore.archive(id, 'archived');
    closeDrawer();
    render();
  }

  function showArchived(){
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
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function _fmtDate(iso){
    if(!iso) return '—';
    return iso.slice(0,10);
  }

  function _statusLabel(s){
    var map = { operating:'Operating', closed:'Closed', archived:'Archived', unknown:'Unknown' };
    return map[s] || s || '—';
  }

  function _extractField(clubs, field){
    var seen = {};
    var list = [];
    for(var i = 0; i < clubs.length; i++){
      var v = clubs[i][field];
      if(v && !seen[v]){
        seen[v] = true;
        list.push(v);
      }
    }
    list.sort(function(a, b){ return a.localeCompare(b); });
    return list;
  }

  function _extractCities(clubs, province){
    var filtered = province
      ? clubs.filter(function(c){ return c.province === province; })
      : clubs;
    return _extractField(filtered, 'city');
  }

  return {
    render: render,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    onFilterProvince: onFilterProvince,
    onFilterCity: onFilterCity,
    onFilterStatus: onFilterStatus,
    onFilterSource: onFilterSource,
    toggleSort: toggleSort,
    goPage: goPage,
    setPageSize: setPageSize,
    createNew: createNew,
    editClub: editClub,
    deleteClub: deleteClub,
    showArchived: showArchived
  };

})();

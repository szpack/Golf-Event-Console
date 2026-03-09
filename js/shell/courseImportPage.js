// ============================================================
// courseImportPage.js — GolfLive Course Importer Page
// Route: #/courses/import
// Depends on: clubStore.js
// ============================================================

const CourseImportPage = (function(){

  var _result = null;   // last import result
  var _plan = null;     // { courses, items[] }  — each item: { gl, match, strategy, action, nines, layouts }
  var _fileName = null; // source filename

  function render(){
    var el = document.getElementById('page-course-import-content');
    if(!el) return;

    var html = '';

    // Header
    html += '<div class="ci-header">';
    html += '<button class="ci-back-btn" onclick="Router.navigate(\'/courses\')">&larr; Courses</button>';
    html += '<h2 class="ci-title">Import GolfLive Courses</h2>';
    html += '</div>';

    // Result area (shown after import, replaces upload+preview)
    if(_result){
      html += _renderResult(_result);
      el.innerHTML = html;
      return;
    }

    // Upload area
    html += '<div class="ci-upload-area" id="ci-upload-area">';
    html += '<div class="ci-upload-icon">&#128229;</div>';
    html += '<div class="ci-upload-text">Drop GolfLive JSON file here or click to select</div>';
    html += '<div class="ci-upload-hint">Accepts .json files exported from GolfLive</div>';
    html += '<input type="file" id="ci-file-input" accept=".json" style="display:none">';
    html += '</div>';

    // Preview area (hidden until file loaded)
    html += '<div id="ci-preview" class="ci-preview" style="display:none"></div>';

    el.innerHTML = html;
    _wireEvents();
  }

  function _wireEvents(){
    var area = document.getElementById('ci-upload-area');
    var inp = document.getElementById('ci-file-input');
    if(!area || !inp) return;

    area.addEventListener('click', function(){ inp.click(); });
    inp.addEventListener('change', function(e){
      if(e.target.files && e.target.files[0]) _handleFile(e.target.files[0]);
    });

    area.addEventListener('dragover', function(e){ e.preventDefault(); area.classList.add('ci-drag-over'); });
    area.addEventListener('dragleave', function(){ area.classList.remove('ci-drag-over'); });
    area.addEventListener('drop', function(e){
      e.preventDefault();
      area.classList.remove('ci-drag-over');
      if(e.dataTransfer.files && e.dataTransfer.files[0]) _handleFile(e.dataTransfer.files[0]);
    });
  }

  function _handleFile(file){
    if(!file.name.endsWith('.json')){
      alert('Please select a .json file');
      return;
    }
    _fileName = file.name;
    var reader = new FileReader();
    reader.onload = function(e){
      try {
        var data = JSON.parse(e.target.result);
        _buildPlan(data);
      } catch(err){
        alert('Invalid JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // ══════════════════════════════════════════
  // PLAN BUILDING
  // ══════════════════════════════════════════

  function _buildPlan(data){
    var courses = _extractCourses(data);
    if(!courses || courses.length === 0){
      alert('No GolfCourse entries found in this file.');
      return;
    }

    var items = [];
    for(var i = 0; i < courses.length; i++){
      var gl = courses[i];
      var match = ClubStore.matchGolfLive(gl);
      var halves = gl.Halves || [];
      var nines = halves.length > 0 ? ClubStore.buildNinesFromHalves(halves) : [];
      var layouts = nines.length > 0 ? ClubStore.buildLayoutsFromNines(nines) : [];

      // Default action
      var action;
      if(!match.club){
        action = 'create';
      } else if(match.strategy === 'golflive_id'){
        action = 'update';
      } else {
        action = 'skip'; // name_city or alias match → default skip, user can change
      }

      items.push({
        gl: gl,
        match: match.club,
        strategy: match.strategy,
        action: action,
        nines: nines,
        layouts: layouts
      });
    }

    _plan = { courses: courses, items: items };
    _renderPreview();
  }

  // ══════════════════════════════════════════
  // PREVIEW RENDER
  // ══════════════════════════════════════════

  function _renderPreview(){
    var el = document.getElementById('ci-preview');
    if(!el || !_plan) return;

    var items = _plan.items;
    var counts = _countActions(items);

    var html = '';

    // Header stats
    html += '<div class="ci-preview-header">';
    html += '<h3 class="ci-preview-title">Preview: ' + items.length + ' courses in ' + _esc(_fileName || 'file') + '</h3>';
    html += '<div class="ci-preview-stats">';
    html += '<span class="ci-stat ci-stat-new">' + counts.create + ' create</span>';
    if(counts.update > 0) html += '<span class="ci-stat ci-stat-update">' + counts.update + ' update</span>';
    if(counts.alias > 0) html += '<span class="ci-stat ci-stat-alias">' + counts.alias + ' alias</span>';
    html += '<span class="ci-stat ci-stat-skip">' + counts.skip + ' skip</span>';
    html += '</div>';
    html += '</div>';

    // Table
    html += '<div class="ci-table-wrap">';
    html += '<table class="ci-table">';
    html += '<thead><tr>';
    html += '<th>Name</th><th>City</th><th>Holes</th><th>Nines</th><th>Layouts</th><th>Match</th><th>Action</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    for(var i = 0; i < items.length; i++){
      html += _renderRow(items[i], i);
    }
    html += '</tbody></table></div>';

    // Action buttons
    var actionCount = counts.create + counts.update + counts.alias;
    html += '<div class="ci-actions">';
    if(actionCount > 0){
      html += '<button class="ci-btn-import" onclick="CourseImportPage.doImport()">Execute Import (' + actionCount + ')</button>';
    } else {
      html += '<div class="ci-all-dup">No actions to execute. All items are set to Skip.</div>';
    }
    html += '<button class="ci-btn-cancel" onclick="CourseImportPage.clearPreview()">Cancel</button>';
    html += '</div>';

    el.innerHTML = html;
    el.style.display = '';
  }

  function _renderRow(item, idx){
    var gl = item.gl;
    var cls = item.action === 'skip' ? ' class="ci-row-skip"' : '';
    var totalHoles = gl.TotalHoles || 0;
    var nineNames = [];
    for(var n = 0; n < item.nines.length; n++){
      nineNames.push(item.nines[n].name || ('Nine' + (n+1)));
    }
    var layoutCount = item.layouts.length;

    // Match badge
    var matchHtml;
    if(item.strategy === 'golflive_id'){
      matchHtml = '<span class="ci-match ci-match-id">GolfLive ID</span>';
    } else if(item.strategy === 'name_city'){
      matchHtml = '<span class="ci-match ci-match-name">Name+City</span>';
    } else if(item.strategy === 'alias'){
      matchHtml = '<span class="ci-match ci-match-alias">Alias</span>';
    } else {
      matchHtml = '<span class="ci-match ci-match-none">No match</span>';
    }
    if(item.match){
      matchHtml += '<span class="ci-match-target" title="' + _esc(item.match.name) + '">&rarr; ' + _esc(_truncate(item.match.name, 16)) + '</span>';
    }

    // Action select
    var actionHtml = '<select class="ci-action-select" onchange="CourseImportPage.setAction(' + idx + ',this.value)">';
    actionHtml += '<option value="create"' + (item.action === 'create' ? ' selected' : '') + '>Create New</option>';
    if(item.match){
      actionHtml += '<option value="update"' + (item.action === 'update' ? ' selected' : '') + '>Update</option>';
      actionHtml += '<option value="alias"' + (item.action === 'alias' ? ' selected' : '') + '>Link Alias</option>';
    }
    actionHtml += '<option value="skip"' + (item.action === 'skip' ? ' selected' : '') + '>Skip</option>';
    actionHtml += '</select>';

    var html = '<tr' + cls + '>';
    html += '<td class="ci-td-name">' + _esc(gl.Name || '') + '</td>';
    html += '<td>' + _esc(gl.City || '') + '</td>';
    html += '<td class="ci-td-num">' + totalHoles + '</td>';
    html += '<td class="ci-td-nines">' + (nineNames.length > 0 ? _esc(nineNames.join(', ')) : '—') + '</td>';
    html += '<td class="ci-td-num">' + layoutCount + '</td>';
    html += '<td class="ci-td-match">' + matchHtml + '</td>';
    html += '<td class="ci-td-action">' + actionHtml + '</td>';
    html += '</tr>';
    return html;
  }

  function _countActions(items){
    var c = { create: 0, update: 0, alias: 0, skip: 0 };
    for(var i = 0; i < items.length; i++){
      var a = items[i].action;
      if(a === 'create') c.create++;
      else if(a === 'update') c.update++;
      else if(a === 'alias') c.alias++;
      else c.skip++;
    }
    return c;
  }

  // ══════════════════════════════════════════
  // USER ACTIONS
  // ══════════════════════════════════════════

  function setAction(idx, action){
    if(!_plan || idx < 0 || idx >= _plan.items.length) return;
    _plan.items[idx].action = action;
    // Re-render preview to update stats and button text
    _renderPreview();
  }

  function doImport(){
    if(!_plan) return;

    // Build plan for ClubStore
    var execPlan = [];
    for(var i = 0; i < _plan.items.length; i++){
      var item = _plan.items[i];
      execPlan.push({
        gl: item.gl,
        action: item.action,
        matchedClub: item.match
      });
    }

    _result = ClubStore.executeImportPlan(execPlan, _fileName);
    _plan = null;
    render(); // re-render with result
  }

  function clearPreview(){
    _plan = null;
    _fileName = null;
    var el = document.getElementById('ci-preview');
    if(el){
      el.innerHTML = '';
      el.style.display = 'none';
    }
  }

  function reset(){
    _result = null;
    _plan = null;
    _fileName = null;
    render();
  }

  // ══════════════════════════════════════════
  // RESULT RENDER
  // ══════════════════════════════════════════

  function _renderResult(r){
    var html = '<div class="ci-result">';
    html += '<h3 class="ci-result-title">Import Complete</h3>';
    html += '<div class="ci-result-stats">';
    html += _resultStat(r.imported, 'Created', 'imported');
    html += _resultStat(r.updated, 'Updated', 'updated');
    html += _resultStat(r.aliased, 'Aliased', 'aliased');
    html += _resultStat(r.skipped, 'Skipped', 'skipped');
    html += _resultStat(r.errors, 'Errors', 'errors');
    html += '</div>';
    if(r.errorDetails && r.errorDetails.length > 0){
      html += '<div class="ci-error-list">';
      for(var i = 0; i < r.errorDetails.length; i++){
        html += '<div class="ci-error-item">' + _esc(r.errorDetails[i]) + '</div>';
      }
      html += '</div>';
    }
    html += '<div class="ci-result-actions">';
    html += '<button class="ci-btn-import" onclick="Router.navigate(\'/courses\')">View Courses</button>';
    html += '<button class="ci-btn-cancel" onclick="CourseImportPage.reset()">Import More</button>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function _resultStat(val, label, cls){
    return '<div class="ci-result-stat ci-result-' + cls + '">'
      + '<span class="ci-result-num">' + (val || 0) + '</span>'
      + '<span class="ci-result-label">' + label + '</span>'
      + '</div>';
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

  function _extractCourses(data){
    if(Array.isArray(data)) return data;
    if(data && Array.isArray(data.GolfCourses)) return data.GolfCourses;
    if(data && Array.isArray(data.golfCourses)) return data.golfCourses;
    if(data && Array.isArray(data.courses)) return data.courses;
    for(var k in data){
      if(data.hasOwnProperty(k) && Array.isArray(data[k]) && data[k].length > 0){
        var sample = data[k][0];
        if(sample && (sample.Name || sample.name) && (sample.Halves || sample.halves || sample.TotalHoles !== undefined)){
          return data[k];
        }
      }
    }
    return null;
  }

  function _esc(s){
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _truncate(s, max){
    if(!s || s.length <= max) return s;
    return s.slice(0, max) + '…';
  }

  return {
    render: render,
    setAction: setAction,
    doImport: doImport,
    clearPreview: clearPreview,
    reset: reset
  };

})();

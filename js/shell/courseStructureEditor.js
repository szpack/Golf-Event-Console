// ============================================================
// courseStructureEditor.js — 3-Column Structure Editor
// Route: #/courses/:id/structure
// Layout: Tree | Hole Grid | Inspector
// Depends on: clubStore.js, router.js
// ============================================================

const CourseStructureEditor = (function(){

  var _clubId = null;
  var _selection = null;  // { type:'nine'|'layout'|'teeSet', id:string }
  var _dirty = false;
  var _snapshot = null;

  // ══════════════════════════════════════════
  // RENDER — Main entry
  // ══════════════════════════════════════════

  function render(clubId){
    _clubId = clubId;
    var el = document.getElementById('page-course-structure-content');
    if(!el) return;

    var club = ClubStore.get(clubId);
    if(!club){
      el.innerHTML = '<div class="cd-not-found">'
        + '<div class="cs-empty-icon">&#128683;</div>'
        + '<div class="cs-empty-title">Club not found</div>'
        + '<button class="cs-btn cs-btn-default" onclick="Router.navigate(\'/courses\')">Back to Courses</button>'
        + '</div>';
      return;
    }

    _takeSnapshot(club);

    // Auto-select first nine if nothing selected
    if(!_selection && club.nines && club.nines.length > 0){
      _selection = { type:'nine', id: club.nines[0].id };
    }

    var html = '';

    // Header
    html += '<div class="se-header">';
    html += '<button class="cd-back-btn" onclick="CourseStructureEditor.goBack()">&larr; ' + _esc(club.name || 'Club') + '</button>';
    html += '<h2 class="cd-title" style="font-size:16px;margin-bottom:0">Structure Editor</h2>';
    html += '<span style="flex:1"></span>';
    html += '<button class="cs-btn cs-btn-default se-save-btn" id="se-btn-cancel" onclick="CourseStructureEditor.cancel()" style="display:none">Cancel</button>';
    html += '<button class="cs-btn cs-btn-primary se-save-btn" id="se-btn-save" onclick="CourseStructureEditor.save()" style="display:none">Save</button>';
    html += '</div>';

    // 3-column layout
    html += '<div class="se-columns">';
    html += '<div class="se-tree" id="se-tree"></div>';
    html += '<div class="se-grid" id="se-grid"></div>';
    html += '<div class="se-inspector" id="se-inspector"></div>';
    html += '</div>';

    el.innerHTML = html;

    _renderTree();
    _renderGrid();
    _renderInspector();
  }

  // ══════════════════════════════════════════
  // TREE — Left panel
  // ══════════════════════════════════════════

  function _renderTree(){
    var el = document.getElementById('se-tree');
    if(!el) return;
    var club = ClubStore.get(_clubId);
    if(!club) return;

    var html = '';

    // Nines section
    html += '<div class="se-tree-section">';
    html += '<div class="se-tree-hdr">';
    html += '<span class="se-tree-title">Nines</span>';
    html += '<button class="se-tree-add" onclick="CourseStructureEditor.addNine()" title="Add Nine">+</button>';
    html += '</div>';
    var nines = club.nines || [];
    for(var i = 0; i < nines.length; i++){
      var n = nines[i];
      var sel = (_selection && _selection.type === 'nine' && _selection.id === n.id);
      html += '<div class="se-tree-item' + (sel ? ' se-tree-selected' : '') + '" onclick="CourseStructureEditor.select(\'nine\',\'' + n.id + '\')">';
      html += '<span class="se-tree-icon">&#9632;</span>';
      html += '<span class="se-tree-label">' + _esc(n.display_name || n.name || 'Nine ' + (i+1)) + '</span>';
      html += '<span class="se-tree-meta">' + (n.holes||[]).length + 'H</span>';
      html += '</div>';
    }
    if(nines.length === 0){
      html += '<div class="se-tree-empty">No nines yet</div>';
    }
    html += '</div>';

    // Layouts section
    html += '<div class="se-tree-section">';
    html += '<div class="se-tree-hdr">';
    html += '<span class="se-tree-title">Layouts</span>';
    html += '<button class="se-tree-add" onclick="CourseStructureEditor.addLayout()" title="Add Layout">+</button>';
    html += '</div>';
    var layouts = club.layouts || [];
    for(var i = 0; i < layouts.length; i++){
      var lay = layouts[i];
      var sel = (_selection && _selection.type === 'layout' && _selection.id === lay.id);
      html += '<div class="se-tree-item' + (sel ? ' se-tree-selected' : '') + '" onclick="CourseStructureEditor.select(\'layout\',\'' + lay.id + '\')">';
      html += '<span class="se-tree-icon">&#9654;</span>';
      html += '<span class="se-tree-label">' + _esc(lay.name || 'Layout ' + (i+1)) + '</span>';
      html += '<span class="se-tree-meta">' + lay.hole_count + 'H</span>';
      html += '</div>';
    }
    if(layouts.length === 0){
      html += '<div class="se-tree-empty">No layouts yet</div>';
    }
    html += '</div>';

    // Tee Sets section
    html += '<div class="se-tree-section">';
    html += '<div class="se-tree-hdr">';
    html += '<span class="se-tree-title">Tee Sets</span>';
    html += '<button class="se-tree-add" onclick="CourseStructureEditor.addTeeSet()" title="Add Tee Set">+</button>';
    html += '</div>';
    var tees = club.tee_sets || [];
    for(var i = 0; i < tees.length; i++){
      var ts = tees[i];
      var sel = (_selection && _selection.type === 'teeSet' && _selection.id === ts.id);
      html += '<div class="se-tree-item' + (sel ? ' se-tree-selected' : '') + '" onclick="CourseStructureEditor.select(\'teeSet\',\'' + ts.id + '\')">';
      html += '<span class="se-tree-dot" style="background:' + (ts.color || '#888') + '"></span>';
      html += '<span class="se-tree-label">' + _esc(ts.name || 'Tee') + '</span>';
      if(ts.gender && ts.gender !== 'any') html += '<span class="se-tree-meta">' + ts.gender + '</span>';
      html += '</div>';
    }
    if(tees.length === 0){
      html += '<div class="se-tree-empty">No tee sets yet</div>';
    }
    html += '</div>';

    el.innerHTML = html;
  }

  // ══════════════════════════════════════════
  // GRID — Center panel (hole data table)
  // ══════════════════════════════════════════

  function _renderGrid(){
    var el = document.getElementById('se-grid');
    if(!el) return;
    var club = ClubStore.get(_clubId);
    if(!club){ el.innerHTML = ''; return; }

    // Only show grid for nine selection
    if(!_selection || _selection.type !== 'nine'){
      var msg = '';
      if(_selection && _selection.type === 'layout'){
        msg = _renderLayoutGrid(club);
      } else if(_selection && _selection.type === 'teeSet'){
        msg = '<div class="se-grid-placeholder">Select a Nine to edit hole data.</div>';
      } else {
        msg = '<div class="se-grid-placeholder">Select a Nine from the tree to view and edit hole data.</div>';
      }
      el.innerHTML = msg;
      return;
    }

    var nine = _findById(club.nines, _selection.id);
    if(!nine){
      el.innerHTML = '<div class="se-grid-placeholder">Nine not found.</div>';
      return;
    }

    var tees = club.tee_sets || [];
    var holes = nine.holes || [];

    var html = '<div class="se-grid-title">' + _esc(nine.display_name || nine.name || 'Nine') + ' — Hole Data</div>';
    html += '<div class="se-grid-scroll"><table class="se-table">';

    // Header
    html += '<thead><tr>';
    html += '<th class="se-th-hole">H</th>';
    html += '<th class="se-th-num">Par</th>';
    html += '<th class="se-th-num">HCP</th>';
    for(var t = 0; t < tees.length; t++){
      html += '<th class="se-th-tee" colspan="2"><span class="se-th-dot" style="background:' + (tees[t].color || '#888') + '"></span>' + _esc(tees[t].name || 'Tee') + '</th>';
    }
    html += '</tr>';
    // Sub-header for yards/meters
    if(tees.length > 0){
      html += '<tr class="se-sub-hdr">';
      html += '<th></th><th></th><th></th>';
      for(var t = 0; t < tees.length; t++){
        html += '<th class="se-th-sub">Yds</th><th class="se-th-sub">M</th>';
      }
      html += '</tr>';
    }
    html += '</thead>';

    // Body
    html += '<tbody>';
    for(var i = 0; i < holes.length; i++){
      var h = holes[i];
      html += '<tr>';
      html += '<td class="se-td-hole">' + (h.number || (i+1)) + '</td>';
      html += '<td>' + _editCell('par', i, h.par, 'number', '4') + '</td>';
      html += '<td>' + _editCell('hcp', i, h.hcp, 'number', '—') + '</td>';
      for(var t = 0; t < tees.length; t++){
        var teeData = (h.tees && h.tees[tees[t].id]) || {};
        html += '<td>' + _editCell('tee-' + tees[t].id + '-yards', i, teeData.yards, 'number', '—') + '</td>';
        html += '<td>' + _editCell('tee-' + tees[t].id + '-meters', i, teeData.meters, 'number', '—') + '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody>';

    // Totals row
    html += '<tfoot><tr class="se-totals">';
    html += '<td class="se-td-hole">Tot</td>';
    var totalPar = 0;
    holes.forEach(function(h){ totalPar += (h.par || 0); });
    html += '<td class="se-td-total">' + totalPar + '</td>';
    html += '<td></td>';
    for(var t = 0; t < tees.length; t++){
      var totalYds = 0, totalM = 0;
      holes.forEach(function(h){
        var td = (h.tees && h.tees[tees[t].id]) || {};
        totalYds += (td.yards || 0);
        totalM += (td.meters || 0);
      });
      html += '<td class="se-td-total">' + (totalYds || '—') + '</td>';
      html += '<td class="se-td-total">' + (totalM || '—') + '</td>';
    }
    html += '</tr></tfoot>';

    html += '</table></div>';

    el.innerHTML = html;

    // Wire cell inputs
    _wireGridCells();
  }

  function _renderLayoutGrid(club){
    if(!_selection) return '';
    var lay = _findById(club.layouts, _selection.id);
    if(!lay) return '<div class="se-grid-placeholder">Layout not found.</div>';

    var segs = lay.segments || [];
    var html = '<div class="se-grid-title">' + _esc(lay.name || 'Layout') + ' — Segments</div>';

    if(segs.length === 0){
      html += '<div class="se-grid-placeholder">No segments defined. Use the inspector to add nines.</div>';
    } else {
      html += '<div class="se-layout-segments">';
      for(var i = 0; i < segs.length; i++){
        var nine = _findById(club.nines, segs[i].nine_id);
        var label = nine ? (nine.display_name || nine.name || 'Nine') : '(missing)';
        var hCount = nine ? (nine.holes || []).length : 0;
        html += '<div class="se-segment-item">';
        html += '<span class="se-segment-order">#' + segs[i].order + '</span>';
        html += '<span class="se-segment-name">' + _esc(label) + '</span>';
        html += '<span class="se-segment-meta">' + hCount + 'H</span>';
        html += '</div>';
      }
      html += '</div>';
    }
    return html;
  }

  function _editCell(key, holeIdx, value, type, placeholder){
    var val = (value != null && value !== '') ? value : '';
    return '<input type="' + type + '" class="se-cell" data-key="' + key + '" data-hole="' + holeIdx + '" value="' + val + '" placeholder="' + placeholder + '">';
  }

  function _wireGridCells(){
    var el = document.getElementById('se-grid');
    if(!el) return;
    var cells = el.querySelectorAll('.se-cell');
    for(var i = 0; i < cells.length; i++){
      cells[i].addEventListener('change', _onCellChange);
      cells[i].addEventListener('focus', function(){ this.select(); });
    }
  }

  function _onCellChange(e){
    var inp = e.target;
    var key = inp.getAttribute('data-key');
    var holeIdx = parseInt(inp.getAttribute('data-hole'), 10);
    var val = inp.value.trim();
    var numVal = val === '' ? null : Number(val);

    if(!_selection || _selection.type !== 'nine') return;

    var club = ClubStore.get(_clubId);
    if(!club) return;
    var nine = _findById(club.nines, _selection.id);
    if(!nine || holeIdx < 0 || holeIdx >= nine.holes.length) return;

    if(key === 'par'){
      ClubStore.updateHole(_clubId, _selection.id, holeIdx, { par: numVal });
    } else if(key === 'hcp'){
      ClubStore.updateHole(_clubId, _selection.id, holeIdx, { hcp: numVal });
    } else if(key.indexOf('tee-') === 0){
      // key format: tee-{teeId}-{yards|meters}
      var parts = key.split('-');
      var teeId = parts.slice(1, -1).join('-'); // handle tee IDs with dashes
      var metric = parts[parts.length - 1]; // yards or meters
      var teeUpdate = {};
      teeUpdate[teeId] = {};
      teeUpdate[teeId][metric] = numVal;
      ClubStore.updateHole(_clubId, _selection.id, holeIdx, { tees: teeUpdate });
    }

    _markDirty();
    _updateTotals();
  }

  function _updateTotals(){
    // Just re-render the grid to recalculate totals
    _renderGrid();
  }

  // ══════════════════════════════════════════
  // INSPECTOR — Right panel
  // ══════════════════════════════════════════

  function _renderInspector(){
    var el = document.getElementById('se-inspector');
    if(!el) return;
    var club = ClubStore.get(_clubId);
    if(!club){ el.innerHTML = ''; return; }

    if(!_selection){
      el.innerHTML = '<div class="se-insp-empty">Select an item from the tree</div>';
      return;
    }

    var html = '';

    if(_selection.type === 'nine'){
      html = _inspectorNine(club);
    } else if(_selection.type === 'layout'){
      html = _inspectorLayout(club);
    } else if(_selection.type === 'teeSet'){
      html = _inspectorTeeSet(club);
    }

    el.innerHTML = html;
    _wireInspectorInputs();
  }

  function _inspectorNine(club){
    var nine = _findById(club.nines, _selection.id);
    if(!nine) return '<div class="se-insp-empty">Nine not found</div>';

    var html = '<div class="se-insp-title">Nine Properties</div>';
    html += _inspField('nine-name', 'Internal Name', nine.name || '', 'text', 'e.g. world-cup');
    html += _inspField('nine-display_name', 'Display Name', nine.display_name || '', 'text', 'e.g. 世界杯球场');
    html += _inspField('nine-sequence', 'Sequence', nine.sequence || 1, 'number', '1');
    html += _inspField('nine-hole_start', 'Hole Start', nine.hole_start || 1, 'number', '1');
    html += _inspField('nine-hole_end', 'Hole End', nine.hole_end || 9, 'number', '9');

    html += '<div class="se-insp-actions">';
    html += '<button class="cs-btn cs-btn-danger se-insp-del" onclick="CourseStructureEditor.deleteSelected()">Delete Nine</button>';
    html += '</div>';
    return html;
  }

  function _inspectorLayout(club){
    var lay = _findById(club.layouts, _selection.id);
    if(!lay) return '<div class="se-insp-empty">Layout not found</div>';

    var nines = club.nines || [];

    var html = '<div class="se-insp-title">Layout Properties</div>';
    html += _inspField('layout-name', 'Name', lay.name || '', 'text', 'e.g. A+B 18H');
    html += _inspCheck('layout-is_default', 'Default Layout', lay.is_default || false);

    // Segments editor
    html += '<div class="se-insp-label">Segments (Nine order)</div>';
    var segs = lay.segments || [];
    html += '<div class="se-insp-segments" id="se-insp-segments">';
    for(var i = 0; i < segs.length; i++){
      var nine = _findById(nines, segs[i].nine_id);
      var label = nine ? (nine.display_name || nine.name || 'Nine') : '(missing)';
      html += '<div class="se-seg-row">';
      html += '<span class="se-seg-order">' + segs[i].order + '.</span>';
      html += '<span class="se-seg-name">' + _esc(label) + '</span>';
      html += '<button class="se-seg-del" onclick="CourseStructureEditor.removeSegment(' + i + ')" title="Remove">&times;</button>';
      html += '</div>';
    }
    html += '</div>';

    // Add segment
    if(nines.length > 0){
      html += '<div class="se-insp-add-seg">';
      html += '<select class="cd-select se-seg-select" id="se-add-seg-nine">';
      html += '<option value="">Add nine...</option>';
      for(var i = 0; i < nines.length; i++){
        html += '<option value="' + nines[i].id + '">' + _esc(nines[i].display_name || nines[i].name || 'Nine ' + (i+1)) + '</option>';
      }
      html += '</select>';
      html += '<button class="cs-btn cs-btn-default" onclick="CourseStructureEditor.addSegment()">Add</button>';
      html += '</div>';
    }

    html += '<div class="se-insp-actions">';
    html += '<button class="cs-btn cs-btn-danger se-insp-del" onclick="CourseStructureEditor.deleteSelected()">Delete Layout</button>';
    html += '</div>';
    return html;
  }

  function _inspectorTeeSet(club){
    var ts = _findById(club.tee_sets, _selection.id);
    if(!ts) return '<div class="se-insp-empty">Tee set not found</div>';

    var html = '<div class="se-insp-title">Tee Set Properties</div>';
    html += _inspField('tee-name', 'Name', ts.name || '', 'text', 'e.g. Gold');
    html += _inspColor('tee-color', 'Color', ts.color || '#FFFFFF');
    html += _inspSelect('tee-gender', 'Gender', ts.gender || 'any', [
      {v:'any',l:'Any'},{v:'male',l:'Male'},{v:'female',l:'Female'}
    ]);

    html += '<div class="se-insp-actions">';
    html += '<button class="cs-btn cs-btn-danger se-insp-del" onclick="CourseStructureEditor.deleteSelected()">Delete Tee Set</button>';
    html += '</div>';
    return html;
  }

  function _inspField(id, label, value, type, placeholder){
    return '<div class="se-insp-field">'
      + '<label class="se-insp-label" for="se-f-' + id + '">' + label + '</label>'
      + '<input type="' + (type||'text') + '" class="cd-input se-insp-input" id="se-f-' + id + '" value="' + _esc(String(value)) + '" placeholder="' + _esc(placeholder||'') + '" data-insp="' + id + '">'
      + '</div>';
  }

  function _inspColor(id, label, value){
    return '<div class="se-insp-field se-insp-color-field">'
      + '<label class="se-insp-label" for="se-f-' + id + '">' + label + '</label>'
      + '<div class="se-color-row">'
      + '<input type="color" class="se-color-input" id="se-f-' + id + '" value="' + (value||'#FFFFFF') + '" data-insp="' + id + '">'
      + '<span class="se-color-hex" id="se-hex-' + id + '">' + (value||'#FFFFFF') + '</span>'
      + '</div>'
      + '</div>';
  }

  function _inspSelect(id, label, value, options){
    var html = '<div class="se-insp-field">'
      + '<label class="se-insp-label" for="se-f-' + id + '">' + label + '</label>'
      + '<select class="cd-select se-insp-input" id="se-f-' + id + '" data-insp="' + id + '">';
    for(var i = 0; i < options.length; i++){
      html += '<option value="' + options[i].v + '"' + (value === options[i].v ? ' selected' : '') + '>' + options[i].l + '</option>';
    }
    html += '</select></div>';
    return html;
  }

  function _inspCheck(id, label, checked){
    return '<div class="se-insp-field se-insp-check">'
      + '<label class="se-insp-label"><input type="checkbox" id="se-f-' + id + '" data-insp="' + id + '"' + (checked ? ' checked' : '') + '> ' + label + '</label>'
      + '</div>';
  }

  function _wireInspectorInputs(){
    var el = document.getElementById('se-inspector');
    if(!el) return;
    var inputs = el.querySelectorAll('[data-insp]');
    for(var i = 0; i < inputs.length; i++){
      inputs[i].addEventListener('change', _onInspectorChange);
      inputs[i].addEventListener('input', _onInspectorInput);
    }
  }

  function _onInspectorInput(e){
    // Live update color hex display
    var id = e.target.getAttribute('data-insp');
    if(id === 'tee-color'){
      var hex = document.getElementById('se-hex-tee-color');
      if(hex) hex.textContent = e.target.value;
    }
  }

  function _onInspectorChange(e){
    var inp = e.target;
    var id = inp.getAttribute('data-insp');
    if(!id || !_selection) return;

    var val = (inp.type === 'checkbox') ? inp.checked : inp.value;

    if(_selection.type === 'nine'){
      var field = id.replace('nine-', '');
      var update = {};
      if(field === 'sequence' || field === 'hole_start' || field === 'hole_end'){
        update[field] = val === '' ? null : Number(val);
      } else {
        update[field] = val;
      }
      ClubStore.updateNine(_clubId, _selection.id, update);
      _markDirty();
      _renderTree();

    } else if(_selection.type === 'layout'){
      var field = id.replace('layout-', '');
      var update = {};
      if(field === 'is_default') update[field] = val;
      else update[field] = val;
      ClubStore.updateLayout(_clubId, _selection.id, update);
      _markDirty();
      _renderTree();

    } else if(_selection.type === 'teeSet'){
      var field = id.replace('tee-', '');
      var update = {};
      update[field] = val;
      ClubStore.updateTeeSet(_clubId, _selection.id, update);
      _markDirty();
      _renderTree();
      // Re-render grid if tee name/color changed (affects column headers)
      _renderGrid();
    }
  }

  // ══════════════════════════════════════════
  // ACTIONS — Add / Delete / Segments
  // ══════════════════════════════════════════

  function select(type, id){
    _selection = { type: type, id: id };
    _renderTree();
    _renderGrid();
    _renderInspector();
  }

  function addNine(){
    var name = prompt('Nine name (e.g. "Front", "World Cup"):');
    if(!name) return;
    var nine = ClubStore.createNine(_clubId, { name: name.toLowerCase().replace(/\s+/g,'-'), display_name: name });
    if(nine){
      _selection = { type:'nine', id: nine.id };
      _markDirty();
      _renderTree();
      _renderGrid();
      _renderInspector();
    }
  }

  function addLayout(){
    var name = prompt('Layout name (e.g. "Front+Back 18H"):');
    if(!name) return;
    var lay = ClubStore.createLayout(_clubId, { name: name });
    if(lay){
      _selection = { type:'layout', id: lay.id };
      _markDirty();
      _renderTree();
      _renderGrid();
      _renderInspector();
    }
  }

  function addTeeSet(){
    var name = prompt('Tee set name (e.g. "Gold", "Blue"):');
    if(!name) return;
    var ts = ClubStore.createTeeSet(_clubId, { name: name });
    if(ts){
      _selection = { type:'teeSet', id: ts.id };
      _markDirty();
      _renderTree();
      _renderGrid();
      _renderInspector();
    }
  }

  function deleteSelected(){
    if(!_selection) return;
    var club = ClubStore.get(_clubId);
    if(!club) return;

    var label = '';
    if(_selection.type === 'nine'){
      var n = _findById(club.nines, _selection.id);
      label = n ? (n.display_name || n.name || 'this nine') : 'this nine';
      if(!confirm('Delete "' + label + '"? This will also remove it from layouts.')) return;
      ClubStore.deleteNine(_clubId, _selection.id);
    } else if(_selection.type === 'layout'){
      var l = _findById(club.layouts, _selection.id);
      label = l ? (l.name || 'this layout') : 'this layout';
      if(!confirm('Delete "' + label + '"?')) return;
      ClubStore.deleteLayout(_clubId, _selection.id);
    } else if(_selection.type === 'teeSet'){
      var t = _findById(club.tee_sets, _selection.id);
      label = t ? (t.name || 'this tee set') : 'this tee set';
      if(!confirm('Delete "' + label + '"? Tee distance data for this set will be removed from all holes.')) return;
      ClubStore.deleteTeeSet(_clubId, _selection.id);
    }

    _selection = null;
    _markDirty();
    _renderTree();
    _renderGrid();
    _renderInspector();
  }

  function addSegment(){
    if(!_selection || _selection.type !== 'layout') return;
    var sel = document.getElementById('se-add-seg-nine');
    if(!sel || !sel.value) return;

    var club = ClubStore.get(_clubId);
    if(!club) return;
    var lay = _findById(club.layouts, _selection.id);
    if(!lay) return;

    var segs = lay.segments || [];
    var nextOrder = segs.length > 0 ? (segs[segs.length - 1].order + 1) : 1;

    segs.push({ nine_id: sel.value, order: nextOrder });
    ClubStore.updateLayout(_clubId, _selection.id, { segments: segs });
    _markDirty();
    _renderGrid();
    _renderInspector();
    _renderTree();
  }

  function removeSegment(idx){
    if(!_selection || _selection.type !== 'layout') return;
    var club = ClubStore.get(_clubId);
    if(!club) return;
    var lay = _findById(club.layouts, _selection.id);
    if(!lay) return;

    var segs = lay.segments || [];
    if(idx < 0 || idx >= segs.length) return;
    segs.splice(idx, 1);
    // Re-number
    for(var i = 0; i < segs.length; i++) segs[i].order = i + 1;
    ClubStore.updateLayout(_clubId, _selection.id, { segments: segs });
    _markDirty();
    _renderGrid();
    _renderInspector();
    _renderTree();
  }

  // ══════════════════════════════════════════
  // DIRTY STATE & NAVIGATION
  // ══════════════════════════════════════════

  function _takeSnapshot(club){
    _snapshot = JSON.stringify({ nines: club.nines, layouts: club.layouts, tee_sets: club.tee_sets });
    _dirty = false;
  }

  function _markDirty(){
    _dirty = true;
    _toggleSaveButtons(true);
  }

  function _toggleSaveButtons(show){
    var ids = ['se-btn-save','se-btn-cancel'];
    for(var i = 0; i < ids.length; i++){
      var el = document.getElementById(ids[i]);
      if(el) el.style.display = show ? '' : 'none';
    }
  }

  function save(){
    // Data is already persisted per-change via ClubStore
    // Just reset dirty state
    var club = ClubStore.get(_clubId);
    if(club) _takeSnapshot(club);
    _toggleSaveButtons(false);
    _toast('Structure saved');
  }

  function cancel(){
    if(!_dirty) return;
    if(!confirm('Discard all structure changes?')) return;
    // Restore from snapshot
    if(_snapshot){
      var club = ClubStore.get(_clubId);
      if(club){
        var snap = JSON.parse(_snapshot);
        club.nines = snap.nines;
        club.layouts = snap.layouts;
        club.tee_sets = snap.tee_sets;
        ClubStore.save(club);
      }
    }
    _dirty = false;
    _toggleSaveButtons(false);
    _selection = null;
    render(_clubId);
  }

  function goBack(){
    if(_dirty){
      if(!confirm('You have unsaved changes. Discard and leave?')) return;
      // Restore snapshot
      if(_snapshot){
        var club = ClubStore.get(_clubId);
        if(club){
          var snap = JSON.parse(_snapshot);
          club.nines = snap.nines;
          club.layouts = snap.layouts;
          club.tee_sets = snap.tee_sets;
          ClubStore.save(club);
        }
      }
    }
    _dirty = false;
    Router.navigate('/courses/' + _clubId);
  }

  function beforeLeave(){
    if(_dirty) return 'You have unsaved structure changes. Discard?';
    return null;
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

  function _findById(arr, id){
    if(!arr) return null;
    for(var i = 0; i < arr.length; i++){
      if(arr[i].id === id) return arr[i];
    }
    return null;
  }

  function _esc(s){
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _toast(msg){
    var el = document.createElement('div');
    el.className = 'cd-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function(){ el.classList.add('cd-toast-show'); }, 10);
    setTimeout(function(){
      el.classList.remove('cd-toast-show');
      setTimeout(function(){ el.remove(); }, 300);
    }, 1500);
  }

  return {
    render: render,
    select: select,
    addNine: addNine,
    addLayout: addLayout,
    addTeeSet: addTeeSet,
    deleteSelected: deleteSelected,
    addSegment: addSegment,
    removeSegment: removeSegment,
    save: save,
    cancel: cancel,
    goBack: goBack,
    beforeLeave: beforeLeave
  };

})();

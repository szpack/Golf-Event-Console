// ============================================================
// courseDetailPage.js — Club Full Detail / Edit Page
// Route: #/courses/:id
// Depends on: clubStore.js, router.js
// ============================================================

const CourseDetailPage = (function(){

  var _clubId = null;
  var _form = null;      // working copy of editable fields
  var _snapshot = null;   // JSON snapshot for dirty detection
  var _dirty = false;

  // Fields we track in the form
  var FIELDS = [
    'name','name_en','aliases',
    'province','city','district','country',
    'status','status_source','status_as_of','verification_level',
    'source','source_ref',
    'notes'
  ];

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════

  function render(clubId){
    _clubId = clubId;
    var el = document.getElementById('page-course-detail-content');
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

    // Init form from club data
    _initForm(club);

    var pct = ClubStore.completeness(club);
    var pctColor = ClubStore.completenessColor(pct);
    var holes = ClubStore.totalHoles(club);

    var html = '';

    // ── Page Header ──
    html += '<div class="cd-header">';
    html += '<div class="cd-header-left">';
    html += '<button class="cd-back-btn" onclick="CourseDetailPage.goBack()">&larr; Courses</button>';
    html += '<h2 class="cd-title">' + _esc(club.name || club.name_en || 'Untitled Club') + '</h2>';
    html += '<div class="cd-header-meta">';
    html += '<span class="cs-status cs-status-' + club.status + '">' + _statusLabel(club.status) + '</span>';
    if(club.verification_level && club.verification_level !== 'unverified'){
      html += '<span class="cs-verification cs-veri-' + club.verification_level + '">' + club.verification_level + '</span>';
    }
    html += '<div class="cs-completeness-bar cs-completeness-lg" style="max-width:120px"><div class="cs-completeness-fill" style="width:' + pct + '%;background:' + pctColor + '"></div></div>';
    html += '<span class="cd-pct">' + pct + '%</span>';
    html += '</div>';
    html += '</div>';
    html += '<div class="cd-header-actions">';
    html += '<button class="cs-btn cs-btn-default" id="cd-btn-cancel" onclick="CourseDetailPage.cancel()" style="display:none">Cancel</button>';
    html += '<button class="cs-btn cs-btn-primary" id="cd-btn-save" onclick="CourseDetailPage.save()" style="display:none">Save</button>';
    html += '</div>';
    html += '</div>';

    // ── Section 1: Basic Info ──
    html += '<div class="cd-section">';
    html += '<div class="cd-section-title">Basic Info</div>';
    html += '<div class="cd-form-grid">';
    html += _field('name', 'Name (Chinese)', 'text', '球会中文名称');
    html += _field('name_en', 'Name (English)', 'text', 'English name');
    html += _fieldAliases();
    html += _field('province', 'Province', 'text', '省份');
    html += _field('city', 'City', 'text', '城市');
    html += _field('district', 'District', 'text', '区/县');
    html += _fieldSelect('country', 'Country', [
      {v:'CN',l:'China'},{v:'TH',l:'Thailand'},{v:'JP',l:'Japan'},
      {v:'KR',l:'Korea'},{v:'US',l:'United States'},{v:'AU',l:'Australia'},
      {v:'MY',l:'Malaysia'},{v:'ID',l:'Indonesia'},{v:'VN',l:'Vietnam'},
      {v:'SG',l:'Singapore'},{v:'OTHER',l:'Other'}
    ]);
    html += '</div>';
    html += '</div>';

    // ── Section 2: Status & Audit ──
    html += '<div class="cd-section">';
    html += '<div class="cd-section-title">Status & Audit</div>';
    html += '<div class="cd-form-grid">';
    html += _fieldSelect('status', 'Status', [
      {v:'operating',l:'Operating'},{v:'closed',l:'Closed'},
      {v:'archived',l:'Archived'},{v:'unknown',l:'Unknown'}
    ]);
    html += _field('status_source', 'Status Source', 'text', 'e.g. manual, golflive, web');
    html += _field('status_as_of', 'Status As-of', 'date', '');
    html += _fieldSelect('verification_level', 'Verification', [
      {v:'unverified',l:'Unverified'},{v:'partial',l:'Partial'},{v:'verified',l:'Verified'}
    ]);
    html += _fieldSelect('source', 'Import Source', [
      {v:'manual',l:'Manual'},{v:'golflive',l:'GolfLive'},{v:'import',l:'Import'}
    ]);
    html += _fieldReadonly('source_ref', 'Source Ref', club.source_ref || '—');
    html += _fieldReadonly('createdAt', 'Created', _fmtDateTime(club.createdAt));
    html += _fieldReadonly('updatedAt', 'Updated', _fmtDateTime(club.updatedAt));
    html += '</div>';
    html += '</div>';

    // ── Section 3: Structure Summary ──
    html += '<div class="cd-section">';
    html += '<div class="cd-section-title">Structure Summary</div>';
    html += '<div class="cd-stat-grid">';
    html += _stat(holes, 'Holes');
    html += _stat((club.nines || []).length, 'Nines');
    html += _stat((club.layouts || []).length, 'Layouts');
    html += _stat((club.tee_sets || []).length, 'Tee Sets');
    html += '</div>';

    // Nines summary
    if(club.nines && club.nines.length > 0){
      html += '<div class="cd-structure-list">';
      for(var i = 0; i < club.nines.length; i++){
        var n = club.nines[i];
        var ninePar = 0;
        (n.holes || []).forEach(function(h){ ninePar += (h.par || 0); });
        html += '<div class="cd-structure-item">';
        html += '<span class="cd-structure-name">' + _esc(n.display_name || n.name || 'Nine ' + (i+1)) + '</span>';
        html += '<span class="cd-structure-meta">' + (n.holes || []).length + ' holes &middot; Par ' + ninePar + '</span>';
        html += '</div>';
      }
      html += '</div>';
    }

    // Layouts summary
    if(club.layouts && club.layouts.length > 0){
      html += '<div class="cd-structure-list" style="margin-top:12px">';
      html += '<div class="cd-structure-sub-title">Layouts</div>';
      for(var i = 0; i < club.layouts.length; i++){
        var lay = club.layouts[i];
        html += '<div class="cd-structure-item">';
        html += '<span class="cd-structure-name">' + _esc(lay.name || 'Layout ' + (i+1)) + '</span>';
        html += '<span class="cd-structure-meta">' + lay.hole_count + 'H';
        if(lay.is_default) html += ' &middot; <span class="cd-default-tag">Default</span>';
        html += '</span>';
        html += '</div>';
      }
      html += '</div>';
    }

    // Tee Sets summary
    if(club.tee_sets && club.tee_sets.length > 0){
      html += '<div class="cs-tee-chips" style="margin-top:12px">';
      for(var i = 0; i < club.tee_sets.length; i++){
        var ts = club.tee_sets[i];
        html += '<span class="cs-tee-chip" style="border-color:' + (ts.color || '#888') + '">';
        html += '<span class="cs-tee-dot" style="background:' + (ts.color || '#888') + '"></span>';
        html += _esc(ts.name || 'Tee');
        if(ts.gender && ts.gender !== 'any') html += ' (' + ts.gender + ')';
        html += '</span>';
      }
      html += '</div>';
    }

    html += '<button class="cs-btn cs-btn-default cd-structure-btn" onclick="CourseDetailPage.editStructure()">Edit Structure &rarr;</button>';
    html += '</div>';

    // ── Section 4: Notes ──
    html += '<div class="cd-section">';
    html += '<div class="cd-section-title">Notes</div>';
    html += '<textarea class="cd-textarea" id="cd-notes" placeholder="Internal notes..." oninput="CourseDetailPage.onInput()">' + _esc(_form.notes || '') + '</textarea>';
    html += '</div>';

    // ── Bottom Actions ──
    html += '<div class="cd-bottom-actions">';
    html += '<button class="cs-btn cs-btn-danger" onclick="CourseDetailPage.archiveClub()">Archive Club</button>';
    html += '<span style="flex:1"></span>';
    html += '<button class="cs-btn cs-btn-default" id="cd-btn-cancel2" onclick="CourseDetailPage.cancel()" style="display:none">Cancel</button>';
    html += '<button class="cs-btn cs-btn-primary" id="cd-btn-save2" onclick="CourseDetailPage.save()" style="display:none">Save</button>';
    html += '</div>';

    el.innerHTML = html;

    // Wire all form inputs for dirty detection
    _wireInputs();
  }

  // ══════════════════════════════════════════
  // FORM STATE
  // ══════════════════════════════════════════

  function _initForm(club){
    _form = {};
    for(var i = 0; i < FIELDS.length; i++){
      var k = FIELDS[i];
      var v = club[k];
      if(k === 'aliases'){
        _form[k] = (v || []).join(', ');
      } else {
        _form[k] = (v != null) ? String(v) : '';
      }
    }
    _snapshot = JSON.stringify(_form);
    _dirty = false;
  }

  function _readFormFromDOM(){
    for(var i = 0; i < FIELDS.length; i++){
      var k = FIELDS[i];
      var inp = document.getElementById('cd-f-' + k);
      if(inp){
        _form[k] = inp.value;
      }
    }
    var notes = document.getElementById('cd-notes');
    if(notes) _form.notes = notes.value;
  }

  function _checkDirty(){
    _readFormFromDOM();
    var nowDirty = (JSON.stringify(_form) !== _snapshot);
    if(nowDirty !== _dirty){
      _dirty = nowDirty;
      _toggleSaveButtons(_dirty);
    }
  }

  function _toggleSaveButtons(show){
    var ids = ['cd-btn-save','cd-btn-cancel','cd-btn-save2','cd-btn-cancel2'];
    for(var i = 0; i < ids.length; i++){
      var el = document.getElementById(ids[i]);
      if(el) el.style.display = show ? '' : 'none';
    }
  }

  function _wireInputs(){
    var el = document.getElementById('page-course-detail-content');
    if(!el) return;
    var inputs = el.querySelectorAll('input, select, textarea');
    for(var i = 0; i < inputs.length; i++){
      inputs[i].addEventListener('input', _checkDirty);
      inputs[i].addEventListener('change', _checkDirty);
    }
  }

  function onInput(){
    _checkDirty();
  }

  // ══════════════════════════════════════════
  // ACTIONS
  // ══════════════════════════════════════════

  function save(){
    _readFormFromDOM();
    var club = ClubStore.get(_clubId);
    if(!club) return;

    // Apply form values back to club
    for(var i = 0; i < FIELDS.length; i++){
      var k = FIELDS[i];
      if(k === 'aliases'){
        club.aliases = _form[k] ? _form[k].split(',').map(function(s){ return s.trim(); }).filter(Boolean) : [];
      } else if(k === 'source_ref'){
        // readonly, skip
      } else {
        club[k] = _form[k] || (k === 'status' ? 'operating' : '');
      }
    }

    // Null out empty optional fields
    if(!club.status_source) club.status_source = null;
    if(!club.status_as_of) club.status_as_of = null;
    if(!club.source_ref) club.source_ref = null;

    ClubStore.save(club);

    _snapshot = JSON.stringify(_form);
    _dirty = false;
    _toggleSaveButtons(false);

    // Show brief confirmation
    _toast('Saved');

    // Re-render to refresh header info
    render(_clubId);
  }

  function cancel(){
    if(_dirty){
      var club = ClubStore.get(_clubId);
      if(club) _initForm(club);
      render(_clubId);
    }
  }

  function goBack(){
    if(_dirty){
      if(!confirm('You have unsaved changes. Discard and leave?')) return;
    }
    Router.navigate('/courses');
  }

  function archiveClub(){
    var club = ClubStore.get(_clubId);
    if(!club) return;
    var refs = ClubStore.getRefCount(_clubId);
    if(refs > 0){
      alert('This club is referenced by ' + refs + ' round(s). It will be archived (not deleted).');
    }
    if(!confirm('Archive "' + (club.name || 'Untitled') + '"?')) return;
    ClubStore.archive(_clubId, 'archived');
    Router.navigate('/courses');
  }

  function editStructure(){
    if(_dirty){
      if(!confirm('You have unsaved changes. Save before editing structure?')){
        return;
      }
      save();
    }
    Router.navigate('/courses/' + _clubId + '/structure');
  }

  // ══════════════════════════════════════════
  // UNSAVED CHANGES GUARD
  // ══════════════════════════════════════════

  function beforeLeave(){
    if(_dirty){
      return 'You have unsaved changes. Discard and leave?';
    }
    return null;
  }

  // ══════════════════════════════════════════
  // FIELD RENDERERS
  // ══════════════════════════════════════════

  function _field(key, label, type, placeholder){
    var val = _form[key] || '';
    return '<div class="cd-field">'
      + '<label class="cd-label" for="cd-f-' + key + '">' + label + '</label>'
      + '<input type="' + (type || 'text') + '" class="cd-input" id="cd-f-' + key + '" value="' + _esc(val) + '" placeholder="' + _esc(placeholder || '') + '">'
      + '</div>';
  }

  function _fieldAliases(){
    var val = _form.aliases || '';
    return '<div class="cd-field cd-field-wide">'
      + '<label class="cd-label" for="cd-f-aliases">Aliases <span class="cd-label-hint">(comma-separated)</span></label>'
      + '<input type="text" class="cd-input" id="cd-f-aliases" value="' + _esc(val) + '" placeholder="别名1, 别名2, ...">'
      + '</div>';
  }

  function _fieldSelect(key, label, options){
    var val = _form[key] || '';
    var html = '<div class="cd-field">'
      + '<label class="cd-label" for="cd-f-' + key + '">' + label + '</label>'
      + '<select class="cd-select" id="cd-f-' + key + '">';
    for(var i = 0; i < options.length; i++){
      html += '<option value="' + options[i].v + '"' + (val === options[i].v ? ' selected' : '') + '>' + options[i].l + '</option>';
    }
    html += '</select></div>';
    return html;
  }

  function _fieldReadonly(key, label, value){
    return '<div class="cd-field">'
      + '<label class="cd-label">' + label + '</label>'
      + '<div class="cd-readonly">' + _esc(value) + '</div>'
      + '</div>';
  }

  function _stat(value, label){
    return '<div class="cd-stat">'
      + '<div class="cd-stat-val">' + value + '</div>'
      + '<div class="cd-stat-lbl">' + label + '</div>'
      + '</div>';
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

  function _esc(s){
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _fmtDateTime(iso){
    if(!iso) return '—';
    return iso.slice(0,16).replace('T',' ');
  }

  function _statusLabel(s){
    var map = { operating:'Operating', closed:'Closed', archived:'Archived', unknown:'Unknown' };
    return map[s] || s || '—';
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
    onInput: onInput,
    save: save,
    cancel: cancel,
    goBack: goBack,
    archiveClub: archiveClub,
    editStructure: editStructure,
    beforeLeave: beforeLeave
  };

})();

// ============================================================
// importController.js — Import Orchestration & UI Bridge
// Depends on: fileSniffer.js, golfliveParser.js, roundBuilder.js,
//             data.js (D), app.js (render, scheduleSave, etc.)
// ============================================================

const ImportController = (function(){

  var _pendingMatch = null; // ImportedMatch awaiting user confirmation

  // ══════════════════════════════════════════
  // START IMPORT — triggered by UI button
  // ══════════════════════════════════════════

  function startImport(){
    // Close export modal if open
    if(typeof closeExportModal === 'function') closeExportModal();

    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.xls,.xlsx,.csv';
    inp.onchange = function(){
      var f = inp.files[0];
      if(!f) return;
      _readAndParse(f);
    };
    inp.click();
  }

  /**
   * Read file, sniff format, parse, show preview.
   * @param {File} file
   */
  function _readAndParse(file){
    var reader = new FileReader();
    reader.onerror = function(){
      if(typeof miniToast === 'function') miniToast('文件读取失败', true);
    };
    reader.onload = function(){
      try {
        var buffer = reader.result;


        // 1. Sniff format
        var sniff = FileSniffer.sniff(buffer, file.name);
        console.log('[Import] sniff:', sniff);

        if(sniff.parserKind === 'unsupported'){
          if(typeof miniToast === 'function')
            miniToast('不支持的文件格式: ' + sniff.description, true);
          return;
        }

        // 2. Check SheetJS availability
        if(sniff.parserKind === 'sheetjs' && typeof XLSX === 'undefined'){
          if(typeof miniToast === 'function')
            miniToast('Excel解析库未加载，请检查网络连接后刷新重试', true);
          return;
        }

        // 3. Parse workbook
        var workbook;
        try {
          workbook = XLSX.read(buffer, { type: 'array' });
        } catch(e){
          if(typeof miniToast === 'function')
            miniToast('文件解析失败: ' + e.message, true);
          return;
        }

        // 4. Parse GolfLive data
        var match = GolfLiveParser.parseWorkbook(workbook, {
          fileName: file.name,
          detectedFormat: sniff.detectedFormat
        });

        // 5. Check for blocking errors
        if(match.validation.errors.length > 0){
          _showErrors(match);
          return;
        }

        // 6. Show preview
        _pendingMatch = match;
        _showPreview(match);

      } catch(e){
        console.error('[Import] unexpected error:', e);
        if(typeof miniToast === 'function')
          miniToast('导入异常: ' + e.message, true);
      }
    };
    setTimeout(function(){ reader.readAsArrayBuffer(file); }, 0);
  }

  // ══════════════════════════════════════════
  // PREVIEW UI
  // ══════════════════════════════════════════

  function _showPreview(match){
    var body = document.getElementById('import-gl-body');
    if(!body) return;

    var playedPlayers = match.players.filter(function(p){
      return p.grossByHole.some(function(g){ return g !== null; });
    });

    var html = '';
    html += '<div class="imp-info-grid">';
    html += _infoRow('来源', 'GolfLive');
    html += _infoRow('文件', _esc(match.sourceMeta.fileName));
    html += _infoRow('格式', match.sourceMeta.detectedFormat.toUpperCase());
    html += _infoRow('比赛', _esc(match.event.title || '—'));
    if(match.event.roundLabel)
      html += _infoRow('轮次', _esc(match.event.roundLabel));
    if(match.event.courseName)
      html += _infoRow('球场', _esc(match.event.courseName));
    html += _infoRow('洞数', String(match.course.holeCount));
    html += _infoRow('球员', String(match.players.length) +
      (playedPlayers.length < match.players.length
        ? '（' + playedPlayers.length + '人有成绩）' : ''));
    html += '</div>';

    // PAR preview
    html += '<div class="imp-par-row"><span class="imp-par-lbl">PAR:</span> ';
    html += match.course.pars.map(function(p,i){
      return '<span class="imp-par-cell">' + p + '</span>';
    }).join('');
    var totalPar = match.course.pars.reduce(function(a,b){ return a+b; }, 0);
    html += ' <span class="imp-par-sum">= ' + totalPar + '</span>';
    html += '</div>';

    // Player preview (first 5)
    var previewPlayers = playedPlayers.slice(0, 5);
    if(previewPlayers.length > 0){
      html += '<div class="imp-player-preview">';
      html += '<div class="imp-sec-title">球员预览</div>';
      previewPlayers.forEach(function(p){
        var played = p.grossByHole.filter(function(g){ return g!==null; }).length;
        var totalDelta = 0;
        p.holeDeltas.forEach(function(d){ if(d!==null) totalDelta += d; });
        var deltaStr = totalDelta === 0 ? 'E' : (totalDelta > 0 ? '+' + totalDelta : String(totalDelta));
        html += '<div class="imp-player-row">';
        html += '<span class="imp-pname">' + _esc(p.name) + '</span>';
        html += '<span class="imp-pscore">' + deltaStr + ' (' + played + '/' + match.course.holeCount + '洞)</span>';
        html += '</div>';
      });
      if(playedPlayers.length > 5){
        html += '<div class="imp-player-more">…还有 ' + (playedPlayers.length - 5) + ' 位球员</div>';
      }
      html += '</div>';
    }

    // Warnings
    var warnCount = match.validation.warnings.length;
    if(warnCount > 0){
      html += '<div class="imp-warnings">';
      html += '<div class="imp-sec-title imp-warn-title">⚠ 警告 (' + warnCount + ')</div>';
      var showWarns = match.validation.warnings.slice(0, 8);
      showWarns.forEach(function(w){
        html += '<div class="imp-warn-item">' + _esc(w) + '</div>';
      });
      if(warnCount > 8){
        html += '<div class="imp-warn-more">…还有 ' + (warnCount - 8) + ' 条警告</div>';
      }
      html += '</div>';
    }

    body.innerHTML = html;

    // Show modal
    var bg = document.getElementById('import-gl-bg');
    var modal = document.getElementById('import-gl-modal');
    if(bg) bg.style.display = 'block';
    if(modal) modal.style.display = 'flex';

    // Enable/disable confirm button
    var btn = document.getElementById('import-gl-confirm');
    if(btn) btn.disabled = (playedPlayers.length === 0);
  }

  function _showErrors(match){
    var body = document.getElementById('import-gl-body');
    if(!body) return;

    var html = '<div class="imp-errors">';
    html += '<div class="imp-sec-title imp-err-title">❌ 无法导入</div>';
    match.validation.errors.forEach(function(e){
      html += '<div class="imp-err-item">' + _esc(e) + '</div>';
    });
    html += '</div>';
    if(match.validation.warnings.length > 0){
      html += '<div class="imp-warnings" style="margin-top:8px">';
      html += '<div class="imp-sec-title imp-warn-title">⚠ 同时存在以下警告</div>';
      match.validation.warnings.slice(0, 5).forEach(function(w){
        html += '<div class="imp-warn-item">' + _esc(w) + '</div>';
      });
      html += '</div>';
    }

    body.innerHTML = html;

    var bg = document.getElementById('import-gl-bg');
    var modal = document.getElementById('import-gl-modal');
    if(bg) bg.style.display = 'block';
    if(modal) modal.style.display = 'flex';

    var btn = document.getElementById('import-gl-confirm');
    if(btn) btn.disabled = true;
  }

  // ══════════════════════════════════════════
  // CONFIRM IMPORT
  // ══════════════════════════════════════════

  function confirmImport(){
    if(!_pendingMatch) return;

    try {
      var result = RoundBuilder.buildAndApply(_pendingMatch);

      // Sync legacy S and refresh UI
      if(typeof S !== 'undefined') D.syncS(S);
      if(typeof buildHoleNav === 'function') buildHoleNav();
      if(typeof buildPlayerArea === 'function') buildPlayerArea();
      if(typeof buildFocusPlayerBtns === 'function') buildFocusPlayerBtns();
      if(typeof updateScoreRangeLabels === 'function') updateScoreRangeLabels();
      if(typeof render === 'function') render();
      if(typeof scheduleSave === 'function') scheduleSave();

      closePreview();
      _pendingMatch = null;

      var msg = result.playerCount + '位球员 / ' + result.holeCount + '洞 导入成功';
      if(typeof miniToast === 'function') miniToast(msg);

    } catch(e){
      console.error('[Import] build error:', e);
      if(typeof miniToast === 'function')
        miniToast('导入失败: ' + e.message, true);
    }
  }

  // ══════════════════════════════════════════
  // CLOSE PREVIEW
  // ══════════════════════════════════════════

  function closePreview(){
    var bg = document.getElementById('import-gl-bg');
    var modal = document.getElementById('import-gl-modal');
    if(bg) bg.style.display = 'none';
    if(modal) modal.style.display = 'none';
    _pendingMatch = null;
  }

  // ── HTML escape ──
  function _esc(s){
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _infoRow(label, value){
    return '<div class="imp-info-row"><span class="imp-info-lbl">' + label +
           '</span><span class="imp-info-val">' + value + '</span></div>';
  }

  // ══════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════

  return {
    startImport: startImport,
    confirmImport: confirmImport,
    closePreview: closePreview
  };

})();

// ============================================================
// fileSniffer.js — File Format Detection
// No dependencies — identifies real format regardless of extension
// ============================================================

const FileSniffer = (function(){

  /**
   * Detect the real format of a file from its binary content.
   * Does NOT trust the file extension.
   *
   * @param {ArrayBuffer} buffer - File content as ArrayBuffer
   * @param {string} fileName - Original file name (for logging only)
   * @returns {SniffResult}
   */
  function sniff(buffer, fileName){
    var bytes = new Uint8Array(buffer.slice(0, 8));
    var ext = (fileName || '').split('.').pop().toLowerCase();

    // ZIP signature: PK\x03\x04 — this is xlsx (or .xls disguised as xlsx)
    if(bytes[0]===0x50 && bytes[1]===0x4B && bytes[2]===0x03 && bytes[3]===0x04){
      return {
        detectedFormat: 'xlsx',
        parserKind: 'sheetjs',
        description: ext==='xls'
          ? '文件扩展名为.xls但实际是XLSX/ZIP格式（已自动识别）'
          : 'XLSX格式'
      };
    }

    // OLE2 / BIFF signature: D0 CF 11 E0 — real legacy .xls
    if(bytes[0]===0xD0 && bytes[1]===0xCF && bytes[2]===0x11 && bytes[3]===0xE0){
      return {
        detectedFormat: 'xls',
        parserKind: 'sheetjs',
        description: '传统XLS格式（BIFF）'
      };
    }

    // CSV heuristic: first 500 chars are printable text with commas or tabs
    try {
      var head = new TextDecoder('utf-8', {fatal:false}).decode(buffer.slice(0, 500));
      var lines = head.split(/\r?\n/).filter(function(l){ return l.trim(); });
      if(lines.length >= 2){
        var hasComma = lines[0].indexOf(',') >= 0;
        var hasTab = lines[0].indexOf('\t') >= 0;
        if(hasComma || hasTab){
          return {
            detectedFormat: 'csv',
            parserKind: 'csv',
            description: hasTab ? 'TSV/制表符分隔文件' : 'CSV文件'
          };
        }
      }
    } catch(e){ /* not text */ }

    return {
      detectedFormat: 'unknown',
      parserKind: 'unsupported',
      description: '无法识别的文件格式'
    };
  }

  return { sniff: sniff };

})();

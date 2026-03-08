// ============================================================
// importTypes.js — Import Type Definitions (JSDoc only)
// No runtime code — loaded before other import modules
// ============================================================

/**
 * File sniff result.
 * @typedef {Object} SniffResult
 * @property {'xlsx'|'xls'|'csv'|'unknown'} detectedFormat
 * @property {'sheetjs'|'csv'|'unsupported'} parserKind
 * @property {string} description
 */

/**
 * Normalized import model — bridge between parser and round builder.
 * ALL import sources (GolfLive, future others) must produce this shape.
 *
 * @typedef {Object} ImportedMatch
 * @property {'golflive'} source
 * @property {Object} sourceMeta
 * @property {string} sourceMeta.fileName
 * @property {string=} sourceMeta.sheetName
 * @property {'xls'|'xlsx'|'csv'|'unknown'} sourceMeta.detectedFormat
 * @property {string} sourceMeta.importedAt
 *
 * @property {Object} event
 * @property {string=} event.title        — e.g. "XXX三月赛"
 * @property {string=} event.roundLabel   — e.g. "R1"
 * @property {string=} event.courseName   — e.g. "沙河高尔夫"
 *
 * @property {Object} course
 * @property {number} course.holeCount    — 9 or 18
 * @property {number[]} course.pars       — [4,4,3,5,...] length = holeCount
 *
 * @property {Array<ImportedPlayer>} players
 *
 * @property {Object} validation
 * @property {string[]} validation.warnings  — non-blocking issues
 * @property {string[]} validation.errors    — blocking issues
 */

/**
 * Single player from import source.
 *
 * @typedef {Object} ImportedPlayer
 * @property {string} name
 * @property {number|null} [groupNo]
 * @property {string|null} [courseName]   — per-player course (some GolfLive sheets)
 * @property {Array<number|null>} holeDeltas     — to-par delta per hole, null = no score
 * @property {Array<number|null>} grossByHole    — computed: par + delta, null = no score
 *
 * @property {Object} [totalsRaw]          — raw totals FROM file (for validation only)
 * @property {number|null} [totalsRaw.outDelta]
 * @property {number|null} [totalsRaw.inDelta]
 * @property {number|null} [totalsRaw.totalDelta]
 * @property {number|null} [totalsRaw.gross]
 * @property {number|null} [totalsRaw.net]
 *
 * @property {string[]} [_issues]          — per-player import issues
 * @property {Object<string,any>} [_rawRow]  — original row data for debugging
 */

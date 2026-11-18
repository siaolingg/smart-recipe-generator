/**
 * Smart Recipe Generator - TimerParser
 * Extracts explicit cooking duration from recipe instruction steps.
 * Implements PRD v2.0 - Section 8.4, CC-03, CC-04, KF-17
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const rules = require('./spec-rules');
    module.exports = factory(rules.TIMER_REGEX);
  } else {
    const timerRegex = (root.SpecRules && root.SpecRules.TIMER_REGEX) || /(\d+)\s*(?:menit|mnt)/i;
    root.TimerParser = factory(timerRegex);
  }
}(typeof self !== 'undefined' ? self : this, function (TIMER_REGEX) {
  'use strict';

  /**
   * Formats total seconds to MM:SS string
   * @param {number} totalSeconds
   * @returns {string} e.g. "03:00"
   */
  function formatMMSS(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(m)}:${pad(s)}`;
  }

  /**
   * Parses duration in minutes from cooking instruction text.
   * Example:
   *  "Tumis bawang selama 3 menit." -> { minutes: 3, totalSeconds: 180, formatted: "03:00" }
   *  "Rebus selama 15 menit." -> { minutes: 15, totalSeconds: 900, formatted: "15:00" }
   *  "Sajikan selagi hangat" -> null
   * 
   * @param {string} text
   * @returns {{ minutes: number, totalSeconds: number, formatted: string } | null}
   */
  function parseTimerDuration(text) {
    if (!text || typeof text !== 'string') return null;

    const match = text.match(TIMER_REGEX);
    if (!match || !match[1]) return null;

    const minutes = parseInt(match[1], 10);
    if (isNaN(minutes) || minutes <= 0) return null;

    const totalSeconds = minutes * 60;
    return {
      minutes,
      totalSeconds,
      formatted: formatMMSS(totalSeconds)
    };
  }

  return {
    TIMER_REGEX,
    parseTimerDuration,
    formatMMSS
  };
}));

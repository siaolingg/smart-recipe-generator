/**
 * Smart Recipe Generator - CookingCompanion (Frontend)
 * Interactive, distraction-free, step-by-step cooking guide.
 * Implements PRD v2.0 Section 8 (F-08), KF-15..KF-18, CC-01..CC-06, NFR-09, NFR-10
 * 0 additional AI tokens - 100% client-side execution.
 */

(function () {
  'use strict';

  // State
  let currentRecipe = null;
  let currentStepIndex = 0;
  let timerState = {
    intervalId: null,
    totalSeconds: 0,
    remainingSeconds: 0,
    isRunning: false,
    isPaused: false,
    endTime: null
  };
  let wakeLockSentinel = null;
  let indonesianVoice = null;
  let isSpeaking = false;

  // DOM Elements cache
  let overlayEl = null;
  let titleEl = null;
  let stepBadgeEl = null;
  let progressBarEl = null;
  let actionCardContainer = null;
  let instructionTextEl = null;
  let timerContainerEl = null;
  let timerDisplayEl = null;
  let timerStartBtn = null;
  let timerPauseBtn = null;
  let timerResetBtn = null;
  let timerAlarmAlert = null;
  let voiceControlsContainer = null;
  let voiceSpeakBtn = null;
  let voiceStopBtn = null;
  let prevStepBtn = null;
  let nextStepBtn = null;
  let finishStepBtn = null;
  let exitCookingBtn = null;

  // Sound Alarm Chime using Web Audio API (100% local, no external files)
  function playAlarmChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Tone 1: High crisp chime (D5 - 587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: Harmonic ring (A5 - 880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.28);
      gain2.gain.setValueAtTime(0.4, now + 0.28);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.28);
      osc2.stop(now + 0.85);
    } catch (e) {
      console.warn('AudioContext alarm error:', e);
    }
  }

  // Screen Wake Lock API (keeps screen awake while cooking)
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator && navigator.wakeLock.request) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      }
    } catch (err) {
      console.log('WakeLock not granted or supported:', err.message);
    }
  }

  function releaseWakeLock() {
    if (wakeLockSentinel) {
      try {
        wakeLockSentinel.release();
      } catch (e) {
        // Ignore release errors
      }
      wakeLockSentinel = null;
    }
  }

  // Voice Narrator (Web Speech API - id-ID) - NFR-09, NFR-10, CC-02, CC-06
  function initSpeechVoice() {
    if (!('speechSynthesis' in window)) return;

    function findVoice() {
      const voices = window.speechSynthesis.getVoices();
      indonesianVoice = voices.find(v => v.lang === 'id-ID' || v.lang.startsWith('id')) || null;
    }

    findVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = findVoice;
    }
  }

  function stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeaking = false;
    updateVoiceButtons(false);
  }

  function speakText(text) {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      return;
    }

    // Stop prior speech to avoid overlap (PRD Section 8.3)
    window.speechSynthesis.cancel();

    if (!text || typeof text !== 'string') return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    if (indonesianVoice) {
      utterance.voice = indonesianVoice;
    }
    utterance.rate = 0.95; // slightly slower for cooking clarity

    utterance.onstart = () => {
      isSpeaking = true;
      updateVoiceButtons(true);
    };

    utterance.onend = () => {
      isSpeaking = false;
      updateVoiceButtons(false);
    };

    utterance.onerror = () => {
      isSpeaking = false;
      updateVoiceButtons(false);
    };

    window.speechSynthesis.speak(utterance);
  }

  function updateVoiceButtons(speaking) {
    if (!voiceSpeakBtn || !voiceStopBtn) return;
    if (speaking) {
      voiceSpeakBtn.classList.add('d-none');
      voiceStopBtn.classList.remove('d-none');
    } else {
      voiceSpeakBtn.classList.remove('d-none');
      voiceStopBtn.classList.add('d-none');
    }
  }

  // Smart Step Timer (CC-03, CC-04, KF-17)
  function setupStepTimer(instructionText) {
    clearStepTimer();

    const parser = window.TimerParser || (typeof require !== 'undefined' ? require('./timerParser') : null);
    if (!parser) return;

    const parsed = parser.parseTimerDuration(instructionText);
    if (!parsed) {
      // CC-04: No duration found in instruction -> hide timer
      timerContainerEl.classList.add('d-none');
      return;
    }

    // CC-03: Duration found -> show timer
    timerContainerEl.classList.remove('d-none');
    timerState.totalSeconds = parsed.totalSeconds;
    timerState.remainingSeconds = parsed.totalSeconds;
    timerState.isRunning = false;
    timerState.isPaused = false;
    timerState.endTime = null;

    timerDisplayEl.textContent = parsed.formatted;
    timerAlarmAlert.classList.add('d-none');

    timerStartBtn.classList.remove('d-none');
    timerPauseBtn.classList.add('d-none');
    timerResetBtn.classList.remove('d-none');
  }

  function startTimer() {
    if (timerState.remainingSeconds <= 0) return;

    timerState.isRunning = true;
    timerState.isPaused = false;
    timerState.endTime = Date.now() + (timerState.remainingSeconds * 1000);

    timerStartBtn.classList.add('d-none');
    timerPauseBtn.classList.remove('d-none');
    timerAlarmAlert.classList.add('d-none');

    if (timerState.intervalId) clearInterval(timerState.intervalId);

    timerState.intervalId = setInterval(() => {
      const now = Date.now();
      const diffMs = timerState.endTime - now;
      const remainingSec = Math.max(0, Math.ceil(diffMs / 1000));
      timerState.remainingSeconds = remainingSec;

      const parser = window.TimerParser;
      timerDisplayEl.textContent = parser ? parser.formatMMSS(remainingSec) : `${remainingSec}s`;

      if (remainingSec <= 0) {
        clearInterval(timerState.intervalId);
        timerState.intervalId = null;
        timerState.isRunning = false;
        timerStartBtn.classList.remove('d-none');
        timerPauseBtn.classList.add('d-none');
        timerAlarmAlert.classList.remove('d-none');
        playAlarmChime();
      }
    }, 200);
  }

  function pauseTimer() {
    if (!timerState.isRunning) return;
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
    timerState.isRunning = false;
    timerState.isPaused = true;

    timerStartBtn.classList.remove('d-none');
    timerPauseBtn.classList.add('d-none');
  }

  function resetTimer() {
    clearStepTimer();
    timerState.remainingSeconds = timerState.totalSeconds;
    const parser = window.TimerParser;
    timerDisplayEl.textContent = parser ? parser.formatMMSS(timerState.totalSeconds) : '00:00';
    timerAlarmAlert.classList.add('d-none');
    timerStartBtn.classList.remove('d-none');
    timerPauseBtn.classList.add('d-none');
  }

  function clearStepTimer() {
    if (timerState.intervalId) {
      clearInterval(timerState.intervalId);
      timerState.intervalId = null;
    }
    timerState.isRunning = false;
    timerState.isPaused = false;
  }

  // Action Card Renderer (CC-05, KF-18) - Minimalist & Elegant Visual Hero Card
  function renderActionCard(instructionText) {
    const mapper = window.CookingActionMapper;
    if (!mapper) return;

    const action = mapper.mapCookingAction(instructionText);
    actionCardContainer.innerHTML = `
      <div class="action-hero-card action-hero-${action.warna || 'primary'}">
        <div class="action-hero-svg-frame">
          ${action.svg || ''}
        </div>
        <div class="action-hero-meta">
          <div class="d-flex align-items-center flex-wrap gap-2 mb-1">
            <span class="action-card-badge action-card-${action.warna || 'primary'}">
              <span class="action-card-emoji">${action.emoji || '👨‍🍳'}</span>
              <span class="action-card-text">
                <i class="bi ${action.ikon || 'bi-check2-circle'} me-1"></i>
                ${action.aksi}
              </span>
            </span>
            ${action.keywordMatched ? `<span class="badge-keyword-detected"><i class="bi bi-magic me-1"></i>"${action.keywordMatched}"</span>` : ''}
          </div>
          <p class="action-hero-desc mb-0">
            ${action.deskripsi || 'Ikuti langkah instruksi berikut dengan saksama.'}
          </p>
        </div>
      </div>
    `;
  }

  // Render Step
  function renderCurrentStep() {
    if (!currentRecipe || !Array.isArray(currentRecipe.langkah_memasak)) return;

    const steps = currentRecipe.langkah_memasak;
    const totalSteps = steps.length;
    const stepNum = currentStepIndex + 1;
    const instruction = steps[currentStepIndex] || '';

    // Step counter & Progress
    stepBadgeEl.textContent = `Langkah ${stepNum} dari ${totalSteps}`;
    const progressPercent = Math.round((stepNum / totalSteps) * 100);
    progressBarEl.style.width = `${progressPercent}%`;
    progressBarEl.setAttribute('aria-valuenow', progressPercent);

    // Visual Action Card (CC-05)
    renderActionCard(instruction);

    // Large instruction text (CC-01, NFR-09)
    instructionTextEl.textContent = instruction;

    // Smart Step Timer (CC-03, CC-04)
    setupStepTimer(instruction);

    // Navigation buttons state
    if (currentStepIndex === 0) {
      prevStepBtn.disabled = true;
    } else {
      prevStepBtn.disabled = false;
    }

    if (currentStepIndex === totalSteps - 1) {
      nextStepBtn.classList.add('d-none');
      finishStepBtn.classList.remove('d-none');
    } else {
      nextStepBtn.classList.remove('d-none');
      finishStepBtn.classList.add('d-none');
    }

    // Voice narration on step change (CC-02)
    if ('speechSynthesis' in window) {
      speakText(instruction);
    }
  }

  // Navigation handlers
  function nextStep() {
    if (!currentRecipe) return;
    const totalSteps = currentRecipe.langkah_memasak.length;
    if (currentStepIndex < totalSteps - 1) {
      currentStepIndex++;
      renderCurrentStep();
    }
  }

  function prevStep() {
    if (!currentRecipe) return;
    if (currentStepIndex > 0) {
      currentStepIndex--;
      renderCurrentStep();
    }
  }

  // Open Cooking Mode (CC-01, KF-15)
  function openCookingMode(recipe) {
    if (!recipe || !Array.isArray(recipe.langkah_memasak) || recipe.langkah_memasak.length === 0) {
      alert('Resep tidak memuat langkah memasak yang valid.');
      return;
    }

    currentRecipe = recipe;
    currentStepIndex = 0;

    titleEl.textContent = recipe.judul || 'Panduan Memasak';

    // Show overlay
    overlayEl.classList.remove('d-none');
    document.body.classList.add('cooking-mode-active');

    // NFR-10: check speech synthesis support
    if (!('speechSynthesis' in window)) {
      voiceControlsContainer.classList.add('d-none');
    } else {
      voiceControlsContainer.classList.remove('d-none');
      initSpeechVoice();
    }

    // Keep screen awake
    requestWakeLock();

    // Render first step
    renderCurrentStep();
  }

  // Exit Cooking Mode
  function exitCookingMode() {
    stopSpeech();
    clearStepTimer();
    releaseWakeLock();

    overlayEl.classList.add('d-none');
    document.body.classList.remove('cooking-mode-active');
  }

  // Initialize DOM bindings
  function initDOM() {
    overlayEl = document.getElementById('cooking-mode-overlay');
    if (!overlayEl) return;

    titleEl = document.getElementById('cooking-recipe-title');
    stepBadgeEl = document.getElementById('cooking-step-badge');
    progressBarEl = document.getElementById('cooking-progress-bar');
    actionCardContainer = document.getElementById('cooking-action-card-container');
    instructionTextEl = document.getElementById('cooking-instruction-text');
    timerContainerEl = document.getElementById('cooking-timer-container');
    timerDisplayEl = document.getElementById('timer-display');
    timerStartBtn = document.getElementById('btn-timer-start');
    timerPauseBtn = document.getElementById('btn-timer-pause');
    timerResetBtn = document.getElementById('btn-timer-reset');
    timerAlarmAlert = document.getElementById('timer-alarm-alert');
    voiceControlsContainer = document.getElementById('cooking-voice-controls');
    voiceSpeakBtn = document.getElementById('btn-voice-speak');
    voiceStopBtn = document.getElementById('btn-voice-stop');
    prevStepBtn = document.getElementById('btn-step-prev');
    nextStepBtn = document.getElementById('btn-step-next');
    finishStepBtn = document.getElementById('btn-step-finish');
    exitCookingBtn = document.getElementById('btn-exit-cooking');

    // Button event listeners
    if (prevStepBtn) prevStepBtn.addEventListener('click', prevStep);
    if (nextStepBtn) nextStepBtn.addEventListener('click', nextStep);
    if (finishStepBtn) finishStepBtn.addEventListener('click', () => {
      stopSpeech();
      playAlarmChime();
      alert('Selamat! Anda telah menyelesaikan seluruh langkah memasak.');
      exitCookingMode();
    });
    if (exitCookingBtn) exitCookingBtn.addEventListener('click', exitCookingMode);

    if (timerStartBtn) timerStartBtn.addEventListener('click', startTimer);
    if (timerPauseBtn) timerPauseBtn.addEventListener('click', pauseTimer);
    if (timerResetBtn) timerResetBtn.addEventListener('click', resetTimer);

    if (voiceSpeakBtn) {
      voiceSpeakBtn.addEventListener('click', () => {
        if (currentRecipe && currentRecipe.langkah_memasak) {
          speakText(currentRecipe.langkah_memasak[currentStepIndex]);
        }
      });
    }

    if (voiceStopBtn) {
      voiceStopBtn.addEventListener('click', stopSpeech);
    }

    // Keyboard navigation (ArrowLeft, ArrowRight, Escape)
    document.addEventListener('keydown', (e) => {
      if (!overlayEl || overlayEl.classList.contains('d-none')) return;

      if (e.key === 'ArrowRight') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      } else if (e.key === 'Escape') {
        exitCookingMode();
      }
    });

    // Check NFR-10 on init
    if (!('speechSynthesis' in window) && voiceControlsContainer) {
      voiceControlsContainer.classList.add('d-none');
    }
  }

  // Export to window
  window.CookingCompanion = {
    init: initDOM,
    openCookingMode,
    exitCookingMode,
    nextStep,
    prevStep,
    startTimer,
    pauseTimer,
    resetTimer,
    speakText,
    stopSpeech
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDOM);
  } else {
    initDOM();
  }
})();

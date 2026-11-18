/**
 * Smart Recipe Generator - Beranda (Homepage) Logic
 * Handles interactive specification form, live validation, AI generation, and result view
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const chipsContainer = document.getElementById('chips-container');
  const chipInput = document.getElementById('chip-input');
  const bahanCounter = document.getElementById('bahan-counter');
  const waktuSlider = document.getElementById('waktu-slider');
  const waktuNumber = document.getElementById('waktu-number');
  const waktuDisplay = document.getElementById('waktu-display');
  const btnIsiContoh = document.getElementById('btn-isi-contoh');
  const customPantanganInput = document.getElementById('custom-pantangan-input');
  const btnAddCustomPantangan = document.getElementById('btn-add-custom-pantangan');
  const customPantanganList = document.getElementById('custom-pantangan-list');
  const conflictWarning = document.getElementById('conflict-warning');
  const conflictWarningText = document.getElementById('conflict-warning-text');
  const validationWarning = document.getElementById('validation-warning');
  const validationWarningText = document.getElementById('validation-warning-text');
  const formSpesifikasi = document.getElementById('form-spesifikasi');
  const btnBuatResep = document.getElementById('btn-buat-resep');

  // Result state elements
  const stateEmpty = document.getElementById('state-empty');
  const stateLoading = document.getElementById('state-loading');
  const stateError = document.getElementById('state-error');
  const stateSuccess = document.getElementById('state-success');
  const errorMessage = document.getElementById('error-message');
  const recipeTitle = document.getElementById('recipe-title');
  const recipeTime = document.getElementById('recipe-time');
  const badgeWaktuText = document.getElementById('badge-waktu-text');
  const recipeIngredientsList = document.getElementById('recipe-ingredients-list');
  const recipeStepsList = document.getElementById('recipe-steps-list');
  const btnSimpanResep = document.getElementById('btn-simpan-resep');
  const labelSimpanResep = document.getElementById('label-simpan-resep');
  const btnBuatUlang = document.getElementById('btn-buat-ulang');
  const btnMulaiMemasak = document.getElementById('btn-mulai-memasak');
  const badgeAutoSaved = document.getElementById('badge-auto-saved');
  const inlineNoteContainer = document.getElementById('inline-note-container');
  const inlineNoteInput = document.getElementById('inline-note-input');
  const inlineNoteCounter = document.getElementById('inline-note-counter');
  const btnSaveInlineNote = document.getElementById('btn-save-inline-note');
  const quotaInfoText = document.getElementById('quota-info-text');
  const quotaInfoLink = document.getElementById('quota-info-link');
  const btnSaveDietaryProfile = document.getElementById('btn-save-dietary-profile');

  // Auth & Nav elements
  const navResepSaya = document.getElementById('nav-resep-saya');
  const navUserInfo = document.getElementById('nav-user-info');
  const navUserName = document.getElementById('nav-user-name');
  const navBtnLogout = document.getElementById('nav-btn-logout');
  const navBtnLogin = document.getElementById('nav-btn-login');
  const navBtnRegister = document.getElementById('nav-btn-register');
  const btnLogoutTrigger = document.getElementById('btn-logout-trigger');
  const btnConfirmLogout = document.getElementById('btn-confirm-logout');

  // State
  let currentBahan = [];
  let customPantangan = [];
  let currentUser = null;
  let currentRecipe = null;
  let currentSpec = null;
  let currentSavedId = null;

  // Initialize Auth state & Dietary Profile (F-09, F-12, KF-22, HA-08)
  async function checkUserSession() {
    currentUser = await API.getMe();
    if (currentUser) {
      navUserName.textContent = `Halo, ${currentUser.nama}`;
      navResepSaya.classList.remove('d-none');
      navUserInfo.classList.remove('d-none');
      navBtnLogout.classList.remove('d-none');
      navBtnLogin.classList.add('d-none');
      navBtnRegister.classList.add('d-none');

      if (quotaInfoText) {
        quotaInfoText.innerHTML = `<i class="bi bi-shield-check text-success me-1"></i> <strong>Akun ${currentUser.nama}</strong>: Kuota 10 resep/mnt · 3 variasi/resep`;
      }
      if (quotaInfoLink) quotaInfoLink.classList.add('d-none');
      if (btnSaveDietaryProfile) btnSaveDietaryProfile.classList.remove('d-none');

      // F-12, KF-22, HA-08: Automatically populate dietary restrictions from stored profile
      try {
        const profile = await API.getProfileRestrictions();
        if (profile && Array.isArray(profile.pantangan) && profile.pantangan.length > 0) {
          profile.pantangan.forEach(p => {
            const cleanP = String(p).trim().toLowerCase();
            const checkbox = document.querySelector(`#pantangan-pills-container input[type="checkbox"][value="${cleanP}"]`);
            if (checkbox) {
              checkbox.checked = true;
            } else if (!customPantangan.includes(cleanP)) {
              customPantangan.push(cleanP);
            }
          });
          renderCustomPantangan();
          validateCurrentForm();
        }
      } catch (profErr) {
        console.warn('Gagal memuat profil pantangan:', profErr);
      }
    } else {
      navResepSaya.classList.add('d-none');
      navUserInfo.classList.add('d-none');
      navBtnLogout.classList.add('d-none');
      navBtnLogin.classList.remove('d-none');
      navBtnRegister.classList.remove('d-none');

      if (quotaInfoText) {
        quotaInfoText.innerHTML = `<i class="bi bi-person me-1"></i> Mode Tamu: Jatah 5 resep/mnt · 1 variasi/resep`;
      }
      if (quotaInfoLink) quotaInfoLink.classList.remove('d-none');
      if (btnSaveDietaryProfile) btnSaveDietaryProfile.classList.add('d-none');
    }
  }
  await checkUserSession();

  // Toast Helper
  function showToast(message, isSuccess = true) {
    const toastEl = document.getElementById('appToast');
    const toastMessage = document.getElementById('toast-message');
    toastMessage.textContent = message;
    toastEl.className = `toast align-items-center text-white border-0 ${isSuccess ? 'bg-success' : 'bg-danger'}`;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }

  // 1. Ingredients Chips Management
  function renderChips() {
    // Remove existing chips except the input
    const existingChips = chipsContainer.querySelectorAll('.chip-item');
    existingChips.forEach(c => c.remove());

    currentBahan.forEach((bahan, index) => {
      const chip = document.createElement('span');
      chip.className = 'chip-item';
      chip.textContent = bahan;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'chip-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.setAttribute('aria-label', `Hapus ${bahan}`);
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentBahan.splice(index, 1);
        renderChips();
        validateCurrentForm();
      });

      chip.appendChild(removeBtn);
      chipsContainer.insertBefore(chip, chipInput);
    });

    bahanCounter.textContent = `${currentBahan.length}/15 bahan`;

    // Update quick-ingredient-chips active state
    document.querySelectorAll('.quick-ingredient-chip').forEach(btn => {
      const ing = btn.getAttribute('data-ingredient');
      if (currentBahan.includes(ing)) {
        btn.classList.add('added');
      } else {
        btn.classList.remove('added');
      }
    });

    validateCurrentForm();
  }

  function addIngredientFromInput() {
    const rawVal = chipInput.value.trim();
    if (!rawVal) return;

    const parts = rawVal.split(',');
    for (const part of parts) {
      const clean = part.trim().toLowerCase();
      if (clean && !currentBahan.includes(clean)) {
        if (currentBahan.length >= 15) {
          showToast('Maksimal 15 bahan utama', false);
          break;
        }
        currentBahan.push(clean);
      }
    }
    chipInput.value = '';
    renderChips();
  }

  chipInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addIngredientFromInput();
    } else if (e.key === 'Backspace' && chipInput.value === '' && currentBahan.length > 0) {
      currentBahan.pop();
      renderChips();
    }
  });

  chipInput.addEventListener('blur', () => {
    if (chipInput.value.trim()) {
      addIngredientFromInput();
    }
  });

  chipsContainer.addEventListener('click', () => {
    chipInput.focus();
  });

  // 2. Cooking Time Synchronization
  function setCookingTime(val) {
    const num = Math.min(180, Math.max(5, Number(val) || 30));
    waktuSlider.value = num;
    waktuNumber.value = num;
    waktuDisplay.textContent = `${num} menit`;
    validateCurrentForm();
  }

  waktuSlider.addEventListener('input', (e) => setCookingTime(e.target.value));
  waktuNumber.addEventListener('input', (e) => setCookingTime(e.target.value));

  // 3. Dietary Restrictions
  function getAllPantangan() {
    const selected = [];
    const checkboxes = document.querySelectorAll('#pantangan-pills-container input[type="checkbox"]:checked');
    checkboxes.forEach(cb => selected.push(cb.value));
    customPantangan.forEach(cp => {
      if (!selected.includes(cp)) selected.push(cp);
    });
    return selected;
  }

  document.querySelectorAll('#pantangan-pills-container input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => validateCurrentForm());
  });

  function renderCustomPantangan() {
    customPantanganList.innerHTML = '';
    customPantangan.forEach((p, idx) => {
      const badge = document.createElement('span');
      badge.className = 'badge bg-secondary d-inline-flex align-items-center gap-1';
      badge.textContent = p;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-close btn-close-white ms-1';
      removeBtn.style.fontSize = '0.65rem';
      removeBtn.addEventListener('click', () => {
        customPantangan.splice(idx, 1);
        renderCustomPantangan();
        validateCurrentForm();
      });

      badge.appendChild(removeBtn);
      customPantanganList.appendChild(badge);
    });
  }

  function addCustomPantangan() {
    const val = customPantanganInput.value.trim().toLowerCase();
    if (!val) return;
    if (getAllPantangan().length >= 10) {
      showToast('Maksimal 10 pantangan', false);
      return;
    }
    if (!customPantangan.includes(val)) {
      customPantangan.push(val);
      customPantanganInput.value = '';
      renderCustomPantangan();
      validateCurrentForm();
    }
  }

  btnAddCustomPantangan.addEventListener('click', addCustomPantangan);
  customPantanganInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomPantangan();
    }
  });

  // 4. "Isi Contoh" Button (US-09)
  btnIsiContoh.addEventListener('click', () => {
    currentBahan = ['ayam', 'telur', 'bawang merah'];
    setCookingTime(30);

    // Uncheck all predefined restrictions except "tanpa kacang"
    document.querySelectorAll('#pantangan-pills-container input[type="checkbox"]').forEach(cb => {
      cb.checked = (cb.value === 'tanpa kacang');
    });

    customPantangan = [];
    renderCustomPantangan();
    renderChips();
    validateCurrentForm();
  });

  // 4b. Quick Ingredient Chips Click Handler
  document.querySelectorAll('.quick-ingredient-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const ing = btn.getAttribute('data-ingredient');
      if (!ing) return;
      if (currentBahan.includes(ing)) {
        const idx = currentBahan.indexOf(ing);
        if (idx !== -1) currentBahan.splice(idx, 1);
      } else {
        if (currentBahan.length >= 15) {
          showToast('Maksimal 15 bahan utama', false);
          return;
        }
        currentBahan.push(ing);
      }
      renderChips();
    });
  });

  // 4c. Quick Sample & Inspiration Pill Buttons
  document.querySelectorAll('.sample-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bahanAttr = btn.getAttribute('data-bahan') || '';
      const pantanganVal = btn.getAttribute('data-pantangan') || '';
      const waktuVal = Number(btn.getAttribute('data-waktu')) || 25;

      currentBahan = bahanAttr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      setCookingTime(waktuVal);

      document.querySelectorAll('#pantangan-pills-container input[type="checkbox"]').forEach(cb => {
        cb.checked = (cb.value === pantanganVal);
      });

      customPantangan = [];
      renderCustomPantangan();
      renderChips();
      validateCurrentForm();

      // Smooth scroll up to form on mobile or if inspiration card was clicked
      const formEl = document.getElementById('form-spesifikasi');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      showToast('Bahan & spesifikasi berhasil dimasukkan!');
    });
  });

  // 5. Live Form Validation & Conflict Detection (BR-01..BR-04, US-08)
  function validateCurrentForm() {
    const spec = {
      bahanUtama: currentBahan,
      waktuMaksimal: Number(waktuNumber.value) || 30,
      pantangan: getAllPantangan()
    };

    const conflictResult = window.SpecValidator ? window.SpecValidator.detectConflict(spec) : [];
    const validationResult = window.SpecValidator ? window.SpecValidator.validate(spec) : [];

    // Conflict warnings (BR-04, US-08)
    if (conflictResult.length > 0) {
      conflictWarningText.textContent = `Peringatan: ${conflictResult.join('; ')}`;
      conflictWarning.classList.remove('d-none');
    } else {
      conflictWarning.classList.add('d-none');
    }

    // Format validation errors (BR-01..BR-03)
    if (validationResult.length > 0 && currentBahan.length > 0) {
      validationWarningText.textContent = validationResult.join('; ');
      validationWarning.classList.remove('d-none');
    } else {
      validationWarning.classList.add('d-none');
    }

    // Enable or disable Buat Resep button
    const isValid = (currentBahan.length >= 1 && validationResult.length === 0 && conflictResult.length === 0);
    btnBuatResep.disabled = !isValid;
    return isValid;
  }

  // 6. Recipe Rendering
  function displayRecipe(resep, kepatuhan, spec, savedRecipeId) {
    currentRecipe = resep;
    currentSpec = spec;

    // Title and time
    recipeTitle.textContent = resep.judul;
    recipeTime.textContent = `${resep.estimasi_waktu} menit`;
    badgeWaktuText.textContent = `Waktu ≤ ${spec.waktuMaksimal} menit`;

    // Render Ingredients with Checkboxes and (bahan dasar) badge
    recipeIngredientsList.innerHTML = '';
    const bahanDasarList = window.SpecRules ? window.SpecRules.BAHAN_DASAR : ['garam', 'gula', 'merica', 'minyak goreng', 'air'];

    resep.daftar_bahan.forEach((item, idx) => {
      const isPantry = bahanDasarList.some(bd => item.nama.toLowerCase().includes(bd.toLowerCase()));

      const itemDiv = document.createElement('div');
      itemDiv.className = 'recipe-check-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `ing-${idx}`;

      const label = document.createElement('label');
      label.setAttribute('for', `ing-${idx}`);
      label.className = 'cursor-pointer';

      const spanText = document.createElement('span');
      spanText.textContent = `${item.nama} (${item.jumlah})`;

      label.appendChild(spanText);

      if (isPantry) {
        const badge = document.createElement('span');
        badge.className = 'badge-bahan-dasar';
        badge.textContent = 'bahan dasar';
        label.appendChild(badge);
      }

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          itemDiv.classList.add('completed');
        } else {
          itemDiv.classList.remove('completed');
        }
      });

      itemDiv.appendChild(checkbox);
      itemDiv.appendChild(label);
      recipeIngredientsList.appendChild(itemDiv);
    });

    // Render Steps with Checkboxes
    recipeStepsList.innerHTML = '';
    resep.langkah_memasak.forEach((step, idx) => {
      const stepDiv = document.createElement('div');
      stepDiv.className = 'recipe-check-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `step-${idx}`;

      const label = document.createElement('label');
      label.setAttribute('for', `step-${idx}`);
      label.className = 'cursor-pointer';

      const spanText = document.createElement('span');
      spanText.textContent = `${idx + 1}. ${step}`;

      label.appendChild(spanText);

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          stepDiv.classList.add('completed');
        } else {
          stepDiv.classList.remove('completed');
        }
      });

      stepDiv.appendChild(checkbox);
      stepDiv.appendChild(label);
      recipeStepsList.appendChild(stepDiv);
    });

    // F-10, KF-20: Automatic history & Note setup for logged-in users
    currentSavedId = savedRecipeId;
    if (savedRecipeId || (currentUser && currentUser.id)) {
      if (badgeAutoSaved) badgeAutoSaved.classList.remove('d-none');
      if (labelSimpanResep) labelSimpanResep.textContent = '✓ Tersimpan di Riwayat';
      if (btnSimpanResep) {
        btnSimpanResep.className = 'btn btn-secondary fw-semibold';
        btnSimpanResep.disabled = true;
      }
      if (inlineNoteContainer) {
        inlineNoteContainer.classList.remove('d-none');
        if (inlineNoteInput) inlineNoteInput.value = '';
        if (inlineNoteCounter) inlineNoteCounter.textContent = '0/1000';
      }
    } else {
      if (badgeAutoSaved) badgeAutoSaved.classList.add('d-none');
      if (inlineNoteContainer) inlineNoteContainer.classList.add('d-none');
      btnSimpanResep.disabled = false;
      btnSimpanResep.className = 'btn btn-success fw-semibold';
      labelSimpanResep.textContent = 'Simpan Resep';
    }

    // Show Success State
    stateEmpty.classList.add('d-none');
    stateLoading.classList.add('d-none');
    stateError.classList.add('d-none');
    stateSuccess.classList.remove('d-none');
  }

  // 7. Generate Recipe (Buat Resep)
  formSpesifikasi.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateCurrentForm()) return;

    const spec = {
      bahanUtama: currentBahan,
      waktuMaksimal: Number(waktuNumber.value) || 30,
      pantangan: getAllPantangan()
    };

    // Show loading state
    stateEmpty.classList.add('d-none');
    stateSuccess.classList.add('d-none');
    stateError.classList.add('d-none');
    stateLoading.classList.remove('d-none');
    btnBuatResep.disabled = true;

    const { ok, status, data } = await API.generateRecipe(spec);

    btnBuatResep.disabled = false;
    stateLoading.classList.add('d-none');

    if (ok && data.resep) {
      displayRecipe(data.resep, data.kepatuhan, spec, data.savedRecipeId);
    } else {
      // Error state (Indonesian error messages mapped per status code)
      stateError.classList.remove('d-none');
      let msg = data.pesan || 'Terjadi kesalahan saat membuat resep.';
      if (status === 502) {
        msg = 'Resep tidak dapat dibuat sesuai spesifikasi. Coba tambah bahan atau longgarkan waktu.';
      } else if (status === 503) {
        msg = 'Layanan AI sedang sibuk, coba lagi.';
      }
      errorMessage.textContent = msg;
    }
  });

  // 8. Regenerate Recipe (Buat Ulang) (F-07, F-09, US-15, HA-03, HA-04)
  btnBuatUlang.addEventListener('click', async () => {
    if (!currentSpec || !currentRecipe) return;

    const prevHindari = Array.isArray(currentSpec && currentSpec.hindari) ? currentSpec.hindari : [];
    const avoidList = [...new Set([...prevHindari, currentRecipe.judul])];
    const spec = {
      ...currentSpec,
      hindari: avoidList
    };

    btnBuatUlang.disabled = true;
    btnBuatUlang.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Meracik ulang...';

    const { ok, status, data } = await API.generateRecipe(spec);

    btnBuatUlang.disabled = false;
    btnBuatUlang.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Buat Ulang';

    if (ok && data.resep) {
      displayRecipe(data.resep, data.kepatuhan, spec, data.savedRecipeId);
      showToast('Resep variasi baru berhasil dibuat!');
    } else {
      let msg = data.pesan || 'Gagal membuat resep variasi baru.';
      if (status === 502) msg = 'Resep tidak dapat dibuat sesuai spesifikasi. Coba tambah bahan atau longgarkan waktu.';
      showToast(msg, false);
    }
  });

  // 8b. Mulai Memasak (Cooking Companion) (F-08, KF-15..KF-18, CC-01)
  if (btnMulaiMemasak) {
    btnMulaiMemasak.addEventListener('click', () => {
      if (!currentRecipe) return;
      if (window.CookingCompanion) {
        window.CookingCompanion.openCookingMode(currentRecipe);
      }
    });
  }

  // 8c. Personal Note Saving from Result Card (F-11, KF-21)
  if (btnSaveInlineNote && inlineNoteInput) {
    btnSaveInlineNote.addEventListener('click', async () => {
      if (!currentSavedId) {
        showToast('Resep belum tersimpan di riwayat', false);
        return;
      }
      const noteText = inlineNoteInput.value.trim();
      btnSaveInlineNote.disabled = true;
      btnSaveInlineNote.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...';
      const { ok, data } = await API.updateRecipeNote(currentSavedId, noteText);
      btnSaveInlineNote.disabled = false;
      btnSaveInlineNote.innerHTML = '<i class="bi bi-check2 me-1"></i> Simpan Catatan';
      if (ok) {
        showToast('Catatan pribadi berhasil disimpan!');
      } else {
        showToast(data.pesan || 'Gagal menyimpan catatan', false);
      }
    });
  }

  if (inlineNoteInput && inlineNoteCounter) {
    inlineNoteInput.addEventListener('input', () => {
      inlineNoteCounter.textContent = `${inlineNoteInput.value.length}/1000`;
    });
  }

  // 8d. Save Dietary Restrictions to Profile (F-12, KF-22)
  if (btnSaveDietaryProfile) {
    btnSaveDietaryProfile.addEventListener('click', async () => {
      const selectedPantangan = getAllPantangan();
      btnSaveDietaryProfile.disabled = true;
      btnSaveDietaryProfile.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...';
      const { ok, data } = await API.updateProfileRestrictions(selectedPantangan);
      btnSaveDietaryProfile.disabled = false;
      btnSaveDietaryProfile.innerHTML = '<i class="bi bi-bookmark-heart me-1"></i> Simpan Pilihan ke Profil Pantangan';
      if (ok) {
        showToast('Profil pantangan berhasil disimpan!');
      } else {
        showToast(data.pesan || 'Gagal menyimpan profil pantangan', false);
      }
    });
  }

  // 9. Save Recipe (Simpan Resep) (US-17)
  btnSimpanResep.addEventListener('click', async () => {
    if (!currentRecipe || !currentSpec) return;

    // Check if user is logged in
    if (!currentUser) {
      // Guest user clicked Save: save recipe temporarily to sessionStorage and redirect to Login (US-17)
      sessionStorage.setItem('pendingSaveRecipe', JSON.stringify({
        spesifikasi: currentSpec,
        resep: currentRecipe
      }));
      window.location.href = '/login.html?redirect=save';
      return;
    }

    btnSimpanResep.disabled = true;
    btnSimpanResep.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...';

    const { ok, status, data } = await API.saveRecipe(currentSpec, currentRecipe);

    if (ok) {
      btnSimpanResep.className = 'btn btn-secondary fw-semibold';
      labelSimpanResep.textContent = 'Tersimpan';
      btnSimpanResep.disabled = true;
      showToast('Resep berhasil disimpan ke Resep Saya!');
    } else if (status === 409) {
      btnSimpanResep.className = 'btn btn-secondary fw-semibold';
      labelSimpanResep.textContent = 'Tersimpan';
      btnSimpanResep.disabled = true;
      showToast('Resep sudah ada di Resep Saya', true);
    } else {
      btnSimpanResep.disabled = false;
      btnSimpanResep.className = 'btn btn-success fw-semibold';
      labelSimpanResep.textContent = 'Simpan Resep';
      showToast(data.pesan || 'Gagal menyimpan resep', false);
    }
  });

  // 10. Logout Confirmation Modal (UC-03)
  const modalLogout = new bootstrap.Modal(document.getElementById('modalLogout'));

  btnLogoutTrigger.addEventListener('click', () => {
    modalLogout.show();
  });

  btnConfirmLogout.addEventListener('click', async () => {
    const success = await API.logout();
    if (success) {
      modalLogout.hide();
      window.location.href = '/';
    } else {
      showToast('Gagal keluar dari sesi', false);
    }
  });

  // Initial check on load
  validateCurrentForm();
});

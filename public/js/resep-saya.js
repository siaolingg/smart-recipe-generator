/**
 * Smart Recipe Generator - Resep Saya & Detail Logic
 * Implements UC-09, UC-10, US-04, US-18, US-19, US-20, US-21
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements for both pages
  const navUserName = document.getElementById('nav-user-name');
  const btnLogoutTrigger = document.getElementById('btn-logout-trigger');
  const btnConfirmLogout = document.getElementById('btn-confirm-logout');
  const modalLogoutEl = document.getElementById('modalLogout');
  const modalDeleteEl = document.getElementById('modalDelete');

  const modalLogout = modalLogoutEl ? new bootstrap.Modal(modalLogoutEl) : null;
  const modalDelete = modalDeleteEl ? new bootstrap.Modal(modalDeleteEl) : null;

  // 1. Session check (User must be logged in to view Resep Saya / Detail, US-04)
  const currentUser = await API.getMe();
  if (!currentUser) {
    window.location.href = '/login.html';
    return;
  }
  if (navUserName) {
    navUserName.textContent = `Halo, ${currentUser.nama}`;
  }

  // Logout Handler
  if (btnLogoutTrigger && modalLogout) {
    btnLogoutTrigger.addEventListener('click', () => modalLogout.show());
  }
  if (btnConfirmLogout) {
    btnConfirmLogout.addEventListener('click', async () => {
      await API.logout();
      window.location.href = '/';
    });
  }

  // Toast Helper
  function showToast(message, isSuccess = true) {
    const toastEl = document.getElementById('appToast');
    const toastMessage = document.getElementById('toast-message');
    if (!toastEl || !toastMessage) return;
    toastMessage.textContent = message;
    toastEl.className = `toast align-items-center text-white border-0 ${isSuccess ? 'bg-success' : 'bg-danger'}`;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }

  // Date Formatter
  function formatDate(isoStr) {
    if (!isoStr) return '-';
    const date = new Date(isoStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ==========================================
  // LIST PAGE: resep-saya.html
  // ==========================================
  const recipesGrid = document.getElementById('recipes-grid');
  const searchInput = document.getElementById('search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const loadingSpinner = document.getElementById('loading-spinner');
  const stateEmptyRecipes = document.getElementById('state-empty-recipes');
  const stateEmptySearch = document.getElementById('state-empty-search');
  const deleteRecipeTitle = document.getElementById('delete-recipe-title');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');

  let recipeToDeleteId = null;
  let allRecipesCount = 0;

  if (recipesGrid) {
    async function loadRecipes(query = '') {
      loadingSpinner.classList.remove('d-none');
      recipesGrid.innerHTML = '';
      stateEmptyRecipes.classList.add('d-none');
      stateEmptySearch.classList.add('d-none');

      try {
        const recipes = await API.getSavedRecipes(query);
        loadingSpinner.classList.add('d-none');

        if (!query) allRecipesCount = recipes.length;

        if (recipes.length === 0) {
          if (query) {
            stateEmptySearch.classList.remove('d-none');
          } else {
            stateEmptyRecipes.classList.remove('d-none');
          }
          return;
        }

        recipes.forEach(recipe => {
          const col = document.createElement('div');
          col.className = 'col-md-6 col-lg-4';
          col.id = `recipe-card-${recipe.id}`;

          const card = document.createElement('div');
          card.className = 'card card-custom h-100 p-3 d-flex flex-column';

          // Card Header
          const header = document.createElement('div');
          header.className = 'd-flex justify-content-between align-items-start mb-2';

          const title = document.createElement('h5');
          title.className = 'fw-bold text-dark mb-0 line-clamp-2';
          title.textContent = recipe.judul; // textContent prevents XSS

          const timeBadge = document.createElement('span');
          timeBadge.className = 'badge bg-light text-primary border';
          timeBadge.innerHTML = `<i class="bi bi-clock me-1"></i>${recipe.estimasi_waktu} mnt`;

          header.appendChild(title);
          header.appendChild(timeBadge);
          card.appendChild(header);

          // Date Saved
          const dateEl = document.createElement('small');
          dateEl.className = 'text-muted d-block mb-3';
          dateEl.innerHTML = `<i class="bi bi-calendar3 me-1"></i>${formatDate(recipe.created_at)}`;
          card.appendChild(dateEl);

          // Ingredients preview
          const ingredientsPreview = document.createElement('div');
          ingredientsPreview.className = 'mb-3 flex-grow-1';

          const ingTitle = document.createElement('small');
          ingTitle.className = 'fw-bold text-secondary d-block mb-1';
          ingTitle.textContent = 'Bahan Utama:';
          ingredientsPreview.appendChild(ingTitle);

          const chipsWrapper = document.createElement('div');
          chipsWrapper.className = 'd-flex flex-wrap gap-1';

          const itemsToShow = (recipe.daftar_bahan || []).slice(0, 4);
          itemsToShow.forEach(b => {
            const chip = document.createElement('span');
            chip.className = 'badge bg-light text-secondary border';
            chip.textContent = b.nama;
            chipsWrapper.appendChild(chip);
          });
          if ((recipe.daftar_bahan || []).length > 4) {
            const moreChip = document.createElement('span');
            moreChip.className = 'badge bg-light text-muted border';
            moreChip.textContent = `+${recipe.daftar_bahan.length - 4} lainnya`;
            chipsWrapper.appendChild(moreChip);
          }
          ingredientsPreview.appendChild(chipsWrapper);
          card.appendChild(ingredientsPreview);

          // Note snippet if available (F-11)
          if (recipe.catatan) {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'p-2 rounded bg-light border mb-2 small text-muted text-truncate';
            noteDiv.innerHTML = `<i class="bi bi-journal-text text-primary me-1"></i><span class="fst-italic">${recipe.catatan}</span>`;
            card.appendChild(noteDiv);
          }

          // Action Buttons
          const actions = document.createElement('div');
          actions.className = 'd-flex justify-content-between align-items-center pt-2 border-top mt-auto';

          const viewBtn = document.createElement('a');
          viewBtn.href = `/detail.html?id=${recipe.id}`;
          viewBtn.className = 'btn btn-outline-primary btn-sm fw-semibold';
          viewBtn.innerHTML = '<i class="bi bi-eye me-1"></i>Lihat Detail';

          const deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.className = 'btn btn-outline-danger btn-sm';
          deleteBtn.innerHTML = '<i class="bi bi-trash3"></i>';
          deleteBtn.setAttribute('title', 'Hapus Resep');
          deleteBtn.addEventListener('click', () => {
            recipeToDeleteId = recipe.id;
            deleteRecipeTitle.textContent = `"${recipe.judul}"`;
            modalDelete.show();
          });

          actions.appendChild(viewBtn);
          actions.appendChild(deleteBtn);
          card.appendChild(actions);

          col.appendChild(card);
          recipesGrid.appendChild(col);
        });
      } catch (err) {
        loadingSpinner.classList.add('d-none');
        showToast('Gagal memuat resep tersimpan', false);
      }
    }

    // Confirm Delete Handler (US-20, UC-10)
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', async () => {
        if (!recipeToDeleteId) return;

        btnConfirmDelete.disabled = true;
        btnConfirmDelete.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menghapus...';

        const success = await API.deleteSavedRecipe(recipeToDeleteId);
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.textContent = 'Ya, Hapus';
        modalDelete.hide();

        if (success) {
          const cardEl = document.getElementById(`recipe-card-${recipeToDeleteId}`);
          if (cardEl) {
            cardEl.style.transition = 'all 0.3s ease';
            cardEl.style.opacity = '0';
            cardEl.style.transform = 'scale(0.9)';
            setTimeout(() => cardEl.remove(), 300);
          }
          showToast('Resep berhasil dihapus.');
          // Reload if no cards left
          setTimeout(() => {
            if (recipesGrid.children.length === 0) {
              loadRecipes(searchInput.value.trim());
            }
          }, 350);
        } else {
          showToast('Resep tidak ditemukan atau gagal dihapus', false);
        }
      });
    }

    // Search input handler with debounce (US-21, TC-42)
    let searchTimeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadRecipes(e.target.value.trim());
      }, 300);
    });

    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      loadRecipes('');
    });

    // Initial load
    loadRecipes('');
  }

  // ==========================================
  // DETAIL PAGE: detail.html
  // ==========================================
  const detailCard = document.getElementById('detail-card');
  const detailLoading = document.getElementById('detail-loading');
  const detailError = document.getElementById('detail-error');
  const detailTitle = document.getElementById('detail-title');
  const detailTime = document.getElementById('detail-time');
  const detailDate = document.getElementById('detail-date');
  const specBahan = document.getElementById('spec-bahan');
  const specWaktu = document.getElementById('spec-waktu');
  const specPantangan = document.getElementById('spec-pantangan');
  const detailIngredientsList = document.getElementById('detail-ingredients-list');
  const detailStepsList = document.getElementById('detail-steps-list');
  const btnDetailDelete = document.getElementById('btn-detail-delete');

  if (detailCard) {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');

    if (!recipeId) {
      detailError.classList.remove('d-none');
      return;
    }

    detailLoading.classList.remove('d-none');

    try {
      const recipe = await API.getSavedRecipeDetail(recipeId);
      detailLoading.classList.add('d-none');
      detailCard.classList.remove('d-none');

      // Title & Time (US-19)
      detailTitle.textContent = recipe.judul;
      detailTime.textContent = `${recipe.estimasi_waktu} menit`;
      detailDate.textContent = formatDate(recipe.created_at);

      // Initial Specification Display (US-19)
      const spec = recipe.spesifikasi || {};
      specBahan.textContent = Array.isArray(spec.bahanUtama) ? spec.bahanUtama.join(', ') : '-';
      specWaktu.textContent = spec.waktuMaksimal ? `${spec.waktuMaksimal} menit` : '-';
      specPantangan.textContent = (Array.isArray(spec.pantangan) && spec.pantangan.length > 0)
        ? spec.pantangan.join(', ')
        : 'Tidak ada pantangan';

      // Ingredients List with Checkboxes & Pantry Tag
      detailIngredientsList.innerHTML = '';
      const bahanDasarList = window.SpecRules ? window.SpecRules.BAHAN_DASAR : ['garam', 'gula', 'merica', 'minyak goreng', 'air'];

      (recipe.daftar_bahan || []).forEach((item, idx) => {
        const isPantry = bahanDasarList.some(bd => item.nama.toLowerCase().includes(bd.toLowerCase()));

        const itemDiv = document.createElement('div');
        itemDiv.className = 'recipe-check-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `detail-ing-${idx}`;

        const label = document.createElement('label');
        label.setAttribute('for', `detail-ing-${idx}`);
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
        detailIngredientsList.appendChild(itemDiv);
      });

      // Steps List with Checkboxes
      detailStepsList.innerHTML = '';
      (recipe.langkah_memasak || []).forEach((step, idx) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'recipe-check-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `detail-step-${idx}`;

        const label = document.createElement('label');
        label.setAttribute('for', `detail-step-${idx}`);
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
        detailStepsList.appendChild(stepDiv);
      });

      // Personal Note logic (F-11, KF-21)
      const noteInput = document.getElementById('recipe-note-input');
      const noteCounter = document.getElementById('note-char-counter');
      const btnSaveNote = document.getElementById('btn-save-note');

      if (noteInput && noteCounter) {
        noteInput.value = recipe.catatan || '';
        noteCounter.textContent = `${noteInput.value.length}/1000`;

        noteInput.addEventListener('input', () => {
          noteCounter.textContent = `${noteInput.value.length}/1000`;
        });
      }

      if (btnSaveNote && noteInput) {
        btnSaveNote.addEventListener('click', async () => {
          btnSaveNote.disabled = true;
          btnSaveNote.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Menyimpan...';

          const { ok, data } = await API.updateRecipeNote(recipe.id, noteInput.value.trim());
          btnSaveNote.disabled = false;
          btnSaveNote.innerHTML = '<i class="bi bi-check2 me-1"></i>Simpan Catatan';

          if (ok) {
            showToast('Catatan pribadi berhasil disimpan!');
          } else {
            showToast(data.pesan || 'Gagal menyimpan catatan', false);
          }
        });
      }

      // Mulai Memasak (Cooking Companion) (F-08, KF-15..KF-18, CC-01)
      const btnMulaiMemasak = document.getElementById('btn-mulai-memasak');
      if (btnMulaiMemasak) {
        btnMulaiMemasak.addEventListener('click', () => {
          if (recipe && window.CookingCompanion) {
            window.CookingCompanion.openCookingMode({
              judul: recipe.judul,
              estimasi_waktu: recipe.estimasi_waktu,
              daftar_bahan: recipe.daftar_bahan,
              langkah_memasak: recipe.langkah_memasak
            });
          }
        });
      }

      // Delete Button in Detail Page
      if (btnDetailDelete && modalDelete) {
        btnDetailDelete.addEventListener('click', () => {
          recipeToDeleteId = recipe.id;
          modalDelete.show();
        });
      }

      if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', async () => {
          if (!recipeToDeleteId) return;
          btnConfirmDelete.disabled = true;
          const success = await API.deleteSavedRecipe(recipeToDeleteId);
          modalDelete.hide();
          if (success) {
            window.location.href = '/resep-saya.html';
          } else {
            showToast('Gagal menghapus resep', false);
          }
        });
      }
    } catch (err) {
      detailLoading.classList.add('d-none');
      detailError.classList.remove('d-none');
    }
  }
});

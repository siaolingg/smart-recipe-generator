/**
 * Smart Recipe Generator - Auth Page Logic (Login & Register)
 * Implements UC-01, UC-02, BR-12, BR-13, US-01, US-02
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);

  // --- LOGIN PAGE LOGIC ---
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const btnSubmit = document.getElementById('btn-login-submit');
    const errorAlert = document.getElementById('login-error-alert');
    const errorText = document.getElementById('login-error-text');
    const pendingSaveBanner = document.getElementById('pending-save-banner');
    const registerSuccessBanner = document.getElementById('register-success-banner');
    const btnTogglePassword = document.getElementById('btn-toggle-password');
    const toggleIcon = document.getElementById('toggle-icon');

    // Show banner if redirected after registration
    if (urlParams.get('registered') === 'true') {
      registerSuccessBanner.classList.remove('d-none');
    }

    // Show banner if redirected from guest save recipe
    const pendingRecipe = sessionStorage.getItem('pendingSaveRecipe');
    if (pendingRecipe || urlParams.get('redirect') === 'save') {
      pendingSaveBanner.classList.remove('d-none');
    }

    // Password visibility toggle
    if (btnTogglePassword) {
      btnTogglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        toggleIcon.className = type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
      });
    }

    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorAlert.classList.add('d-none');

      const email = emailInput.value.trim();
      const kataSandi = passwordInput.value;

      if (!email || !kataSandi) {
        errorText.textContent = 'Email dan kata sandi wajib diisi.';
        errorAlert.classList.remove('d-none');
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Masuk...';

      const { ok, status, data } = await API.login(email, kataSandi);

      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Masuk';

      if (ok) {
        // Check if there was a pending recipe to save from guest session
        const rawPending = sessionStorage.getItem('pendingSaveRecipe');
        if (rawPending) {
          try {
            const parsed = JSON.parse(rawPending);
            await API.saveRecipe(parsed.spesifikasi, parsed.resep);
            sessionStorage.removeItem('pendingSaveRecipe');
            window.location.href = '/resep-saya.html';
            return;
          } catch (err) {
            console.error('Error auto-saving pending recipe:', err);
          }
        }
        window.location.href = '/';
      } else {
        errorAlert.classList.remove('d-none');
        if (status === 429) {
          errorText.textContent = 'Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi dalam 15 menit.';
        } else if (status === 401) {
          errorText.textContent = 'Email atau kata sandi salah.';
        } else {
          errorText.textContent = data.pesan || 'Terjadi kesalahan saat masuk.';
        }
      }
    });
  }

  // --- REGISTER PAGE LOGIC ---
  const formRegister = document.getElementById('form-register');
  if (formRegister) {
    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const passwordInput = document.getElementById('reg-password');
    const confirmInput = document.getElementById('reg-confirm');
    const btnSubmit = document.getElementById('btn-register-submit');
    const errorAlert = document.getElementById('register-error-alert');
    const errorText = document.getElementById('register-error-text');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorAlert.classList.add('d-none');

      const nama = nameInput.value.trim();
      const email = emailInput.value.trim();
      const kataSandi = passwordInput.value;
      const konfirmasi = confirmInput.value;

      // Client-side validation
      if (!nama) {
        errorText.textContent = 'Nama lengkap wajib diisi.';
        errorAlert.classList.remove('d-none');
        nameInput.focus();
        return;
      }

      if (!email || !emailRegex.test(email)) {
        errorText.textContent = 'Format email tidak valid.';
        errorAlert.classList.remove('d-none');
        emailInput.focus();
        return;
      }

      if (!kataSandi || kataSandi.length < 8) {
        errorText.textContent = 'Kata sandi minimal 8 karakter.';
        errorAlert.classList.remove('d-none');
        passwordInput.focus();
        return;
      }

      if (!passwordRegex.test(kataSandi)) {
        errorText.textContent = 'Kata sandi harus memuat huruf dan angka.';
        errorAlert.classList.remove('d-none');
        passwordInput.focus();
        return;
      }

      if (kataSandi !== konfirmasi) {
        errorText.textContent = 'Konfirmasi kata sandi tidak sama.';
        errorAlert.classList.remove('d-none');
        confirmInput.focus();
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Mendaftar...';

      const { ok, status, data } = await API.register(nama, email, kataSandi, konfirmasi);

      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Daftar';

      if (ok) {
        window.location.href = '/login.html?registered=true';
      } else {
        errorAlert.classList.remove('d-none');
        if (status === 409) {
          errorText.textContent = 'Email sudah terdaftar. Silakan gunakan email lain atau masuk.';
        } else {
          errorText.textContent = data.pesan || 'Pendaftaran gagal.';
        }
      }
    });
  }
});

/**
 * Smart Recipe Generator - Frontend API Client
 * Centralized fetch wrappers for backend REST endpoints
 */

const API = {
  // Authentication
  async getMe() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) return await res.json();
      return null;
    } catch {
      return null;
    }
  },

  async register(nama, email, kataSandi, konfirmasi) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, email, kataSandi, konfirmasi })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  },

  async login(email, kataSandi) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, kataSandi })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  },

  async logout() {
    const res = await fetch('/api/auth/logout', {
      method: 'POST'
    });
    return res.status === 204;
  },

  // Recipes
  async generateRecipe(spec) {
    try {
      const res = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spec)
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        data: { pesan: 'Periksa koneksi internet Anda lalu coba lagi.' }
      };
    }
  },

  // Saved Recipes
  async saveRecipe(spesifikasi, resep) {
    const res = await fetch('/api/saved-recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spesifikasi, resep })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  },

  async getSavedRecipes(q = '') {
    const url = q ? `/api/saved-recipes?q=${encodeURIComponent(q)}` : '/api/saved-recipes';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Gagal mengambil daftar resep');
    return await res.json();
  },

  async getSavedRecipeDetail(id) {
    const res = await fetch(`/api/saved-recipes/${id}`);
    if (!res.ok) throw new Error('Resep tidak ditemukan');
    return await res.json();
  },

  async deleteSavedRecipe(id) {
    const res = await fetch(`/api/saved-recipes/${id}`, {
      method: 'DELETE'
    });
    return res.status === 204;
  },

  // F-11: Personal Recipe Notes
  async updateRecipeNote(id, catatan) {
    const res = await fetch(`/api/saved-recipes/${id}/note`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catatan })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  },

  // F-12: Stored Dietary Restriction Profile
  async getProfileRestrictions() {
    try {
      const res = await fetch('/api/auth/profile/restrictions');
      if (res.ok) return await res.json();
      return { pantangan: [] };
    } catch {
      return { pantangan: [] };
    }
  },

  async updateProfileRestrictions(pantangan) {
    const res = await fetch('/api/auth/profile/restrictions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pantangan })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }
};

window.API = API;

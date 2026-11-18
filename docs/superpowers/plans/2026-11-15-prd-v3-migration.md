# Implementation Plan - Migration from PRD Version 2.0 to PRD Version 3.0
## Smart Recipe Generator

**Date:** 2026-11-15  
**Spec Reference:** PRD Version 3.0 (`PRD (Product Requirements Document) - Smart Recipe Generator.pdf`), Dokumen Spesifikasi Eksekusi AI v3.0, Laporan Akhir v3.0  
**Baseline:** Incremental update to existing full-stack Node.js/Express, MySQL/In-Memory, Vanilla JS, Bootstrap 5 codebase.

---

## 1. Architecture & Design Decisions

### 1.1 Database Schema Extensions
- `users`:
  - Add column `profil_pantangan JSON NULL` (storing array of strings, e.g. `["tanpa kacang", "tanpa gluten"]`).
- `saved_recipes`:
  - Add column `catatan VARCHAR(1000) NULL` (storing personal notes, max 1000 characters).
- Automatic History Limit:
  - When inserting into `saved_recipes`, if user's saved recipes count > 20, prune the oldest records so exactly the 20 most recent are kept (`HA-05`).

### 1.2 Tiered Quota & Regeneration Tracking (F-09)
- **Recipe Generation Request Rate Limit (per minute)**:
  - Guest: 5 requests / min per IP (`req.ip`). Error 429 message: `"Batas permintaan tamu tercapai. Coba lagi dalam 1 menit, atau masuk untuk kuota 10 per menit."`
  - Authenticated: 10 requests / min per account (`user_${userId}`). Error 429 message: `"Terlalu banyak permintaan, coba lagi dalam 1 menit."`
- **Regeneration ("Buat Ulang") Limit per Recipe**:
  - Tracked server-side per user/IP + base recipe chain.
  - Guest: Maximum 1 regeneration per recipe. On 2nd attempt, return 429: `"Masuk untuk membuat hingga 3 variasi."`
  - Authenticated: Maximum 3 regenerations per recipe. On 4th attempt, return 429: `"Batas 3 variasi untuk resep ini tercapai."`
  - Internal AI retry attempts (up to 3) DO NOT count toward user regeneration quota.

### 1.3 Automatic Recipe History (F-10)
- In `recipeController.js`, upon successful validation (V-01..V-06), if `req.session && req.session.user`:
  - Automatically save recipe to `saved_recipes` associated with `req.session.user.id`.
  - Prune to keep at most 20 latest recipes.
  - Return saved recipe ID in API response.
- `GET /api/saved-recipes`: returns latest 20 recipes sorted newest to oldest.
- `GET /api/saved-recipes/:id`: returns saved recipe directly from DB without calling Gemini (0 AI tokens, 0 quota used).
- Guest accessing `/api/saved-recipes` receives 401: `"Masuk untuk memakai riwayat, catatan, dan profil pantangan."`
- Accessing another user's recipe receives 404.

### 1.4 Personal Recipe Notes (F-11)
- `PUT /api/saved-recipes/:id/note`: Updates note for user's recipe (max 1000 chars).
- Validation: return 422 if `catatan.length > 1000` with message `"Catatan maksimal 1.000 karakter."`
- Security & Privacy: Note is never sent to Gemini API, never in prompt or logs.
- Guests receive 401; non-owner receives 404.

### 1.5 Stored Dietary Restriction Profile (F-12)
- `GET /api/auth/profile/restrictions`: Gets user's stored dietary restrictions.
- `PUT /api/auth/profile/restrictions`: Saves user's dietary restrictions (array of strings, max 10, valid strings).
- Frontend automatically queries and checks the checkboxes/pills on `index.html` when logged in.
- Full validation & conflict detection still runs.
- Guests receive 401.

---

## 2. Tasks & Execution Steps

### Task 1: Database Migration & Model Extensions
- [ ] Update `db/schema.sql` with `ALTER TABLE` / updated table definitions.
- [ ] Update `src/db/db.js` with auto-migration for MySQL and in-memory schema extensions.
- [ ] Update `src/models/user.js` to get and update `profil_pantangan`.
- [ ] Update `src/models/savedRecipe.js` to support `catatan`, max 20 pruning (`trimToMax`), and note updates.

### Task 2: Tiered Quota & Regeneration Rate Limiter Middleware (F-09)
- [ ] Create/Update tiered rate limiter in `src/middleware/rateLimit.js`.
  - Dynamic key generator: `user_${userId}` if logged in, `req.ip` if guest.
  - Dynamic max: 10 for logged-in, 5 for guest.
  - Dynamic error message matching PRD 3.0 Table 7.
- [ ] Implement server-side regeneration tracker and middleware in `src/middleware/rateLimit.js` / `src/controllers/recipeController.js`.
  - Guest: max 1 regen. 429: `"Masuk untuk membuat hingga 3 variasi."`
  - Authenticated: max 3 regens. 429: `"Batas 3 variasi untuk resep ini tercapai."`
- [ ] Update `src/middleware/requireLogin.js` 401 error message to match PRD 3.0 Table 7: `"Masuk untuk memakai riwayat, catatan, dan profil pantangan."`

### Task 3: Automatic History & Recipe Controller Integration (F-10)
- [ ] In `src/controllers/recipeController.js`:
  - When generation succeeds, if logged in, call `SavedRecipe.create()` and `SavedRecipe.trimToMax(userId, 20)`.
  - Attach `savedRecipeId` to response.
- [ ] In `src/controllers/savedRecipeController.js`:
  - Ensure `list()` returns max 20 newest recipes.
  - Ensure `detail()` retrieves from DB without calling Gemini.

### Task 4: Personal Recipe Notes Endpoints & Implementation (F-11)
- [ ] Add `PUT /api/saved-recipes/:id/note` to `src/routes/savedRecipes.js`.
- [ ] Implement `updateNote(req, res)` in `src/controllers/savedRecipeController.js`:
  - Validate note length <= 1000.
  - Enforce ownership (404 if not found/not owned).
  - Update note in DB / in-memory.
- [ ] Verify note is never passed into Gemini prompt or logs.

### Task 5: Stored Dietary Restriction Profile Endpoints (F-12)
- [ ] Add `GET /api/auth/profile/restrictions` and `PUT /api/auth/profile/restrictions` in `src/routes/auth.js`.
- [ ] Implement `getRestrictions(req, res)` and `updateRestrictions(req, res)` in `src/controllers/authController.js`.
  - Validate restrictions array (max 10, max length 30).
  - Save to user profile.

### Task 6: Frontend Interface Updates
- [ ] `public/js/api.js`:
  - Add API methods: `getProfileRestrictions()`, `updateProfileRestrictions(pantangan)`, `updateRecipeNote(recipeId, catatan)`.
- [ ] `public/index.html` & `public/js/beranda.js`:
  - If user is logged in, fetch dietary profile and auto-check restrictions.
  - Add "Simpan ke Profil Pantangan" quick toggle or profile sync button.
  - Display quota & variation badges/info (e.g. "Jatah variasi: X tersisa").
  - On recipe generation for logged-in user, indicate "Tersimpan otomatis di Riwayat" and show inline note input.
- [ ] `public/resep-saya.html` & `public/detail.html`:
  - Update to show "Riwayat Resep (Maks. 20 Resep)".
  - Add Notepad / Personal Note card (max 1000 characters) with real-time character counter and save button.
  - When opening recipe from history, verify 0 AI tokens are consumed and Cooking Companion is available.

### Task 7: Automated Test Suite (HA-01 s/d HA-09 & Regression)
- [ ] Create `tests/accessControl.test.js` with comprehensive test cases for HA-01 through HA-09:
  - HA-01: Guest quota 5/min, 6th gets 429.
  - HA-02: Auth quota 10/min, 11th gets 429.
  - HA-03: Guest regeneration limit (1 max, 2nd gets 429).
  - HA-04: Auth regeneration limit (3 max, 4th gets 429).
  - HA-05: Automatic history 21 recipes, oldest trimmed, exactly 20 kept.
  - HA-06: Opening from history calls 0 AI tokens.
  - HA-07: Note saved (<= 1000 chars), note content never in Gemini prompt.
  - HA-08: Stored profile auto-populates form, conflicts detected.
  - HA-09: Unauthorized access (Guest gets 401, User A gets 404 for User B).
- [ ] Run all test suites (`npm test -- --runInBand`) and verify 100% pass rate.

### Task 8: Live Verification via Browser & Final Report
- [ ] Start application and verify on `http://localhost:3000`.
- [ ] Verify both guest flow and authenticated user flow in live browser.
- [ ] Check console cleanliness and visual aesthetics.
- [ ] Generate comprehensive final migration report.

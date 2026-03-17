// Auth UI for Isaac Companion
(function () {
  'use strict';

  const db = window.IsaacDB;
  if (!db) {
    window.IsaacAuth = { init: function(){}, getUser: function(){ return null; }, showAuthModal: function(){}, hideAuthModal: function(){} };
    return;
  }
  let _authUser = null;
  let _authModal = null;
  let _migrationDone = false;

  function esc(s) {
    const el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
  }

  // ── Auth state badge in nav ────────────────────────────────

  function renderAuthBadge() {
    let badge = document.getElementById('authBadge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'authBadge';
      badge.className = 'auth-badge';
      const nav = document.querySelector('.nav');
      if (nav) nav.appendChild(badge);
    }

    if (_authUser) {
      const name = _authUser.user_metadata?.display_name || _authUser.user_metadata?.steam_id || _authUser.email || 'User';
      const isSteam = !!_authUser.user_metadata?.steam_id;
      badge.innerHTML =
        '<div class="auth-badge-inner">' +
          '<span class="auth-user-name" title="' + esc(name) + '">' +
            (isSteam ? '<span class="auth-steam-icon">&#9783;</span>' : '') +
            esc(name.length > 20 ? name.slice(0, 18) + '...' : name) +
          '</span>' +
          '<button type="button" class="auth-btn auth-btn-sm" id="authMenuBtn">&#9660;</button>' +
        '</div>' +
        '<div class="auth-dropdown" id="authDropdown">' +
          (isSteam ? '<button type="button" class="auth-dropdown-item" id="steamSyncBtn">Sync Steam Achievements</button>' : '') +
          '<button type="button" class="auth-dropdown-item" id="authLogoutBtn">Sign Out</button>' +
        '</div>';
    } else {
      badge.innerHTML =
        '<button type="button" class="auth-btn" id="authLoginBtn">Sign In</button>';
    }
  }

  // ── Auth modal ─────────────────────────────────────────────

  function showAuthModal() {
    if (_authModal) _authModal.remove();
    _authModal = document.createElement('div');
    _authModal.className = 'auth-modal-overlay';
    _authModal.innerHTML =
      '<div class="auth-modal">' +
        '<button type="button" class="auth-modal-close" id="authModalClose">&times;</button>' +
        '<h2 class="auth-modal-title">Sign In</h2>' +
        '<p class="auth-modal-desc">Sign in to sync your progress across devices.</p>' +
        '<form id="authEmailForm" class="auth-form">' +
          '<label class="auth-label" for="authEmail">Email</label>' +
          '<input type="email" id="authEmail" class="auth-input" placeholder="your@email.com" required />' +
          '<button type="submit" class="auth-btn auth-btn-primary">Send Magic Link</button>' +
        '</form>' +
        '<div id="authEmailSent" class="auth-sent" style="display:none">' +
          '<p>Check your email for the login link!</p>' +
        '</div>' +
        '<div class="auth-divider"><span>or</span></div>' +
        '<button type="button" class="auth-btn auth-btn-steam" id="authSteamBtn">' +
          '<span class="auth-steam-icon">&#9783;</span> Sign in with Steam' +
        '</button>' +
        '<p class="auth-modal-hint">Steam login connects your achievements and syncs progress.</p>' +
      '</div>';
    document.body.appendChild(_authModal);
  }

  function hideAuthModal() {
    if (_authModal) {
      _authModal.remove();
      _authModal = null;
    }
  }

  // ── Migration prompt ───────────────────────────────────────

  function showMigrationPrompt() {
    const hasLocalData = (() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('isaac-') && key !== 'isaac-sync-queue') return true;
      }
      return false;
    })();
    if (!hasLocalData || _migrationDone) return;

    const banner = document.createElement('div');
    banner.className = 'migration-banner';
    banner.id = 'migrationBanner';
    banner.innerHTML =
      '<p>You have local progress data. Would you like to upload it to your account?</p>' +
      '<div class="migration-actions">' +
        '<button type="button" class="auth-btn auth-btn-primary" id="migrationYes">Import Progress</button>' +
        '<button type="button" class="auth-btn" id="migrationNo">Skip</button>' +
      '</div>';
    document.querySelector('.main')?.prepend(banner);
  }

  function hideMigrationBanner() {
    document.getElementById('migrationBanner')?.remove();
  }

  async function runMigration() {
    if (!_authUser) return;
    const btn = document.getElementById('migrationYes');
    if (btn) { btn.disabled = true; btn.textContent = 'Importing...'; }
    try {
      const count = await db.migrateLocalStorageToSupabase(_authUser.id);
      _migrationDone = true;
      hideMigrationBanner();
      if (count > 0) {
        window.dispatchEvent(new CustomEvent('isaac-progress-changed'));
      }
      alert('Imported ' + count + ' progress entries!');
    } catch (err) {
      alert('Migration failed: ' + err.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Import Progress'; }
    }
  }

  // ── Steam sync ─────────────────────────────────────────────

  async function triggerSteamSync() {
    const btn = document.getElementById('steamSyncBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Syncing...'; }
    try {
      const result = await db.syncSteamAchievements();
      window.dispatchEvent(new CustomEvent('isaac-progress-changed'));
      alert('Steam sync complete! ' + (result.synced || 0) + ' achievements synced.');
    } catch (err) {
      alert('Steam sync failed: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Sync Steam Achievements'; }
    }
  }

  // ── Event delegation ───────────────────────────────────────

  document.addEventListener('click', e => {
    // Login button
    if (e.target.closest('#authLoginBtn')) {
      showAuthModal();
      return;
    }
    // Close modal
    if (e.target.closest('#authModalClose') || (e.target.classList.contains('auth-modal-overlay'))) {
      hideAuthModal();
      return;
    }
    // Steam login
    if (e.target.closest('#authSteamBtn')) {
      window.location.href = db.getSteamLoginUrl();
      return;
    }
    // Menu toggle
    if (e.target.closest('#authMenuBtn')) {
      document.getElementById('authDropdown')?.classList.toggle('open');
      return;
    }
    // Logout
    if (e.target.closest('#authLogoutBtn')) {
      db.signOut().then(() => {
        _authUser = null;
        renderAuthBadge();
        window.dispatchEvent(new CustomEvent('isaac-auth-changed', { detail: { user: null } }));
      });
      return;
    }
    // Steam sync
    if (e.target.closest('#steamSyncBtn')) {
      triggerSteamSync();
      return;
    }
    // Migration yes
    if (e.target.closest('#migrationYes')) {
      runMigration();
      return;
    }
    // Migration no
    if (e.target.closest('#migrationNo')) {
      _migrationDone = true;
      hideMigrationBanner();
      return;
    }
    // Close dropdown when clicking outside
    if (!e.target.closest('.auth-badge')) {
      document.getElementById('authDropdown')?.classList.remove('open');
    }
  });

  // Email form
  document.addEventListener('submit', e => {
    if (e.target.id === 'authEmailForm') {
      e.preventDefault();
      const email = document.getElementById('authEmail')?.value;
      if (!email) return;
      const btn = e.target.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
      db.signInWithEmail(email).then(({ error }) => {
        if (error) {
          alert('Error: ' + error.message);
          if (btn) { btn.disabled = false; btn.textContent = 'Send Magic Link'; }
        } else {
          document.getElementById('authEmailForm').style.display = 'none';
          document.getElementById('authEmailSent').style.display = '';
        }
      });
    }
  });

  // ── Handle auth callback from URL hash ─────────────────────

  function handleAuthCallback() {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      // Supabase auto-detects the hash tokens
      // Clear the hash after processing
      setTimeout(() => {
        if (window.location.hash.includes('access_token=')) {
          history.replaceState(null, '', window.location.pathname + '#/');
        }
      }, 1000);
    }
  }

  // ── Init ───────────────────────────────────────────────────

  function init() {
    handleAuthCallback();

    db.onAuthStateChange(async (session) => {
      _authUser = session?.user || null;
      renderAuthBadge();
      hideAuthModal();

      if (_authUser) {
        // Process any queued offline changes
        await db.processSyncQueue(_authUser.id);
        // Offer migration if there's local data
        showMigrationPrompt();
      } else {
        hideMigrationBanner();
      }
      window.dispatchEvent(new CustomEvent('isaac-auth-changed', { detail: { user: _authUser } }));
    });

    // Initial render
    db.getUser().then(user => {
      _authUser = user;
      renderAuthBadge();
      if (user) showMigrationPrompt();
      window.dispatchEvent(new CustomEvent('isaac-auth-changed', { detail: { user } }));
    });
  }

  // ── Online/offline sync listener ────────────────────────────

  window.addEventListener('online', async () => {
    if (_authUser && db) {
      const errors = await db.processSyncQueue(_authUser.id);
      if (!errors || errors.length === 0) {
        await db.loadAllProgress?.call?.(null, _authUser.id); // noop if not available
        window.dispatchEvent(new CustomEvent('isaac-progress-changed'));
      }
    }
  });

  window.IsaacAuth = {
    init,
    getUser: () => _authUser,
    showAuthModal,
    hideAuthModal
  };
})();

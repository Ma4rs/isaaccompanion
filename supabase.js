// Supabase client for Isaac Companion
// Configure SUPABASE_URL and SUPABASE_ANON_KEY before use.
(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────
  // Replace these with your Supabase project values
  const SUPABASE_URL = window.ISAAC_SUPABASE_URL || 'https://misvptdgzbxhmujfumzn.supabase.co';
  const SUPABASE_ANON_KEY = window.ISAAC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pc3ZwdGRnemJ4aG11amZ1bXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzkxMjQsImV4cCI6MjA4NzQxNTEyNH0.10dDK5z6EK8rH-divy9Ej98hccIHU7I4A488bDihj-0';

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ── Auth helpers ───────────────────────────────────────────

  async function getUser() {
    const { data: { user } } = await sb.auth.getUser();
    return user;
  }

  async function getSession() {
    const { data: { session } } = await sb.auth.getSession();
    return session;
  }

  function onAuthStateChange(callback) {
    return sb.auth.onAuthStateChange((_event, session) => callback(session));
  }

  async function signInWithEmail(email) {
    const { error } = await sb.auth.signInWithOtp({ email });
    return { error };
  }

  async function signOut() {
    const { error } = await sb.auth.signOut();
    return { error };
  }

  function getSteamLoginUrl(redirectUrl) {
    return SUPABASE_URL + '/functions/v1/steam-auth?action=login&redirect_url=' + encodeURIComponent(redirectUrl || window.location.origin + window.location.pathname);
  }

  // ── Game data fetching ─────────────────────────────────────

  async function fetchItems() {
    const { data, error } = await sb.from('ic_items').select('*');
    if (error) throw error;
    return (data || []).map(r => ({
      id: r.id, name: r.name, description: r.description,
      iconUrl: r.icon_url, quality: r.quality, pool: r.pool,
      quote: r.quote, tags: r.tags || [], type: r.type,
      synergies: r.synergies || []
    }));
  }

  async function fetchTrinkets() {
    const { data, error } = await sb.from('ic_trinkets').select('*');
    if (error) throw error;
    return data || [];
  }

  async function fetchPaths() {
    const { data: paths, error: pe } = await sb.from('ic_paths').select('*');
    if (pe) throw pe;
    const { data: steps, error: se } = await sb.from('ic_path_steps').select('*').order('sort_order');
    if (se) throw se;
    const stepsByPath = {};
    (steps || []).forEach(s => {
      if (!stepsByPath[s.path_id]) stepsByPath[s.path_id] = [];
      stepsByPath[s.path_id].push({ id: s.step_id, label: s.label });
    });
    return (paths || []).map(p => ({
      id: p.id, name: p.name, description: p.description,
      steps: stepsByPath[p.id] || []
    }));
  }

  async function fetchUnlocks() {
    const { data: unlocks, error: ue } = await sb.from('ic_unlocks').select('*');
    if (ue) throw ue;
    const { data: steps, error: se } = await sb.from('ic_unlock_steps').select('*').order('sort_order');
    if (se) throw se;
    const { data: rewards, error: re } = await sb.from('ic_unlock_rewards').select('*');
    if (re) throw re;
    const stepsByUnlock = {};
    (steps || []).forEach(s => {
      if (!stepsByUnlock[s.unlock_id]) stepsByUnlock[s.unlock_id] = [];
      stepsByUnlock[s.unlock_id].push({ id: s.step_id, label: s.label });
    });
    const rewardsByUnlock = {};
    (rewards || []).forEach(r => {
      if (!rewardsByUnlock[r.unlock_id]) rewardsByUnlock[r.unlock_id] = [];
      rewardsByUnlock[r.unlock_id].push({ boss: r.boss, unlock: r.unlock });
    });
    return (unlocks || []).map(u => ({
      id: u.id, characterName: u.character_name, targetUnlock: u.target_unlock,
      steps: stepsByUnlock[u.id] || [], rewards: rewardsByUnlock[u.id] || []
    }));
  }

  async function fetchChallenges() {
    const { data, error } = await sb.from('ic_challenges').select('*').order('number');
    if (error) throw error;
    return data || [];
  }

  async function fetchTransformations() {
    const { data: transforms, error: te } = await sb.from('ic_transformations').select('*');
    if (te) throw te;
    const { data: tItems, error: ie } = await sb.from('ic_transformation_items').select('*');
    if (ie) throw ie;
    const itemsByTransform = {};
    (tItems || []).forEach(ti => {
      if (!itemsByTransform[ti.transformation_id]) itemsByTransform[ti.transformation_id] = [];
      itemsByTransform[ti.transformation_id].push(ti.item_name);
    });
    return (transforms || []).map(t => ({
      id: t.id, name: t.name, description: t.description,
      requires: t.requires, items: itemsByTransform[t.id] || []
    }));
  }

  // ── User progress CRUD ─────────────────────────────────────

  async function loadAllProgress(userId) {
    const [pathRes, unlockRes, challengeRes, markRes] = await Promise.all([
      sb.from('ic_user_path_progress').select('*').eq('user_id', userId),
      sb.from('ic_user_unlock_progress').select('*').eq('user_id', userId),
      sb.from('ic_user_challenge_progress').select('*').eq('user_id', userId),
      sb.from('ic_user_completion_marks').select('*').eq('user_id', userId)
    ]);
    return {
      paths: pathRes.data || [],
      unlocks: unlockRes.data || [],
      challenges: challengeRes.data || [],
      marks: markRes.data || []
    };
  }

  async function savePathProgress(userId, pathId, completedSteps) {
    const { error } = await sb.from('ic_user_path_progress').upsert({
      user_id: userId, path_id: pathId,
      completed_steps: completedSteps, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,path_id' });
    return { error };
  }

  async function saveUnlockProgress(userId, unlockId, completedSteps) {
    const { error } = await sb.from('ic_user_unlock_progress').upsert({
      user_id: userId, unlock_id: unlockId,
      completed_steps: completedSteps, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,unlock_id' });
    return { error };
  }

  async function saveChallengeProgress(userId, challengeId, completed) {
    const { error } = await sb.from('ic_user_challenge_progress').upsert({
      user_id: userId, challenge_id: challengeId,
      completed, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,challenge_id' });
    return { error };
  }

  async function saveMarkProgress(userId, characterId, completedBosses) {
    const { error } = await sb.from('ic_user_completion_marks').upsert({
      user_id: userId, character_id: characterId,
      completed_bosses: completedBosses, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,character_id' });
    return { error };
  }

  async function deletePathProgress(userId, pathId) {
    return sb.from('ic_user_path_progress').delete().eq('user_id', userId).eq('path_id', pathId);
  }

  async function deleteUnlockProgress(userId, unlockId) {
    return sb.from('ic_user_unlock_progress').delete().eq('user_id', userId).eq('unlock_id', unlockId);
  }

  async function deleteChallengeProgress(userId, challengeId) {
    return sb.from('ic_user_challenge_progress').delete().eq('user_id', userId).eq('challenge_id', challengeId);
  }

  async function deleteMarkProgress(userId, characterId) {
    return sb.from('ic_user_completion_marks').delete().eq('user_id', userId).eq('character_id', characterId);
  }

  // ── Offline sync queue ─────────────────────────────────────

  const SYNC_QUEUE_KEY = 'isaac-sync-queue';

  function getSyncQueue() {
    try {
      return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    } catch { return []; }
  }

  function addToSyncQueue(action) {
    const queue = getSyncQueue();
    queue.push({ ...action, timestamp: Date.now() });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  function clearSyncQueue() {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  }

  async function processSyncQueue(userId) {
    const queue = getSyncQueue();
    if (queue.length === 0) return;
    const errors = [];
    for (const action of queue) {
      try {
        switch (action.type) {
          case 'path':
            await savePathProgress(userId, action.id, action.data);
            break;
          case 'unlock':
            await saveUnlockProgress(userId, action.id, action.data);
            break;
          case 'challenge':
            await saveChallengeProgress(userId, action.id, action.data);
            break;
          case 'mark':
            await saveMarkProgress(userId, action.id, action.data);
            break;
          case 'delete-path':
            await deletePathProgress(userId, action.id);
            break;
          case 'delete-unlock':
            await deleteUnlockProgress(userId, action.id);
            break;
          case 'delete-challenge':
            await deleteChallengeProgress(userId, action.id);
            break;
          case 'delete-mark':
            await deleteMarkProgress(userId, action.id);
            break;
        }
      } catch (err) {
        errors.push({ action, error: err.message });
      }
    }
    if (errors.length === 0) {
      clearSyncQueue();
    } else {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(
        queue.filter((_, i) => errors.some(e => e.action === queue[i]))
      ));
    }
    return errors;
  }

  // ── Migration: localStorage → Supabase ─────────────────────

  async function migrateLocalStorageToSupabase(userId) {
    const PREFIX_PATH = 'isaac-path-';
    const PREFIX_UNLOCK = 'isaac-unlock-';
    const PREFIX_CHALLENGE = 'isaac-challenge-';
    const PREFIX_MARK = 'isaac-mark-';
    let migrated = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('isaac-')) continue;
      if (key === SYNC_QUEUE_KEY) continue;

      try {
        const val = JSON.parse(localStorage.getItem(key));
        if (key.startsWith(PREFIX_PATH)) {
          const id = key.slice(PREFIX_PATH.length);
          await savePathProgress(userId, id, Array.isArray(val) ? val : []);
          migrated++;
        } else if (key.startsWith(PREFIX_UNLOCK)) {
          const id = key.slice(PREFIX_UNLOCK.length);
          await saveUnlockProgress(userId, id, Array.isArray(val) ? val : []);
          migrated++;
        } else if (key.startsWith(PREFIX_CHALLENGE)) {
          const id = key.slice(PREFIX_CHALLENGE.length);
          const done = Array.isArray(val) ? val.includes('done') : false;
          await saveChallengeProgress(userId, id, done);
          migrated++;
        } else if (key.startsWith(PREFIX_MARK)) {
          const id = key.slice(PREFIX_MARK.length);
          await saveMarkProgress(userId, id, Array.isArray(val) ? val : []);
          migrated++;
        }
      } catch { /* skip malformed entries */ }
    }
    return migrated;
  }

  // ── Steam sync trigger ─────────────────────────────────────

  async function syncSteamAchievements() {
    const session = await getSession();
    if (!session) throw new Error('Not logged in');
    const res = await fetch(SUPABASE_URL + '/functions/v1/steam-sync', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + session.access_token,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || 'Steam sync failed');
    }
    return res.json();
  }

  // ── Public API ─────────────────────────────────────────────

  window.IsaacDB = {
    client: sb,
    SUPABASE_URL,

    // Auth
    getUser,
    getSession,
    onAuthStateChange,
    signInWithEmail,
    signOut,
    getSteamLoginUrl,

    // Game data
    fetchItems,
    fetchTrinkets,
    fetchPaths,
    fetchUnlocks,
    fetchChallenges,
    fetchTransformations,

    // Progress
    loadAllProgress,
    savePathProgress,
    saveUnlockProgress,
    saveChallengeProgress,
    saveMarkProgress,
    deletePathProgress,
    deleteUnlockProgress,
    deleteChallengeProgress,
    deleteMarkProgress,

    // Offline sync
    getSyncQueue,
    addToSyncQueue,
    clearSyncQueue,
    processSyncQueue,

    // Migration
    migrateLocalStorageToSupabase,

    // Steam
    syncSteamAchievements
  };
})();

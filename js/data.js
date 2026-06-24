(function () {
  'use strict';

  const PLACEHOLDER_ICON = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' +
    '<rect fill="%232a2018" width="48" height="48" rx="4"/>' +
    '<text x="24" y="30" font-size="20" fill="%23a89070" text-anchor="middle" font-family="sans-serif">?</text></svg>'
  );

  function mapItem(raw) {
    return {
      id: String(raw.id != null ? raw.id : raw.name != null ? raw.name : ''),
      name: String(raw.name != null ? raw.name : ''),
      description: raw.description != null ? String(raw.description) : undefined,
      iconUrl: raw.icon_url != null ? String(raw.icon_url) : raw.iconUrl != null ? String(raw.iconUrl) : undefined,
      quality: typeof raw.quality === 'number' ? raw.quality : undefined,
      pool: raw.pool != null ? String(raw.pool) : undefined,
      quote: raw.quote != null ? String(raw.quote) : undefined,
      tags: Array.isArray(raw.tags) ? raw.tags : undefined,
      type: raw.type != null ? String(raw.type) : undefined,
      synergies: Array.isArray(raw.synergies) ? raw.synergies : undefined
    };
  }

  function getItemImageUrl(item) {
    if (item && item.iconUrl) return item.iconUrl;
    if (!item || !item.id) return PLACEHOLDER_ICON;
    return 'icons/' + item.id + '.png';
  }

  function getTrinketImageUrl(trinket) {
    if (trinket && (trinket.iconUrl || trinket.icon_url)) return trinket.iconUrl || trinket.icon_url;
    if (!trinket || !trinket.id) return PLACEHOLDER_ICON;
    return 'icons/trinkets/' + trinket.id + '.png';
  }

  window.IsaacData = {
    PLACEHOLDER_ICON,
    mapItem,
    getItemImageUrl,
    getTrinketImageUrl,
  };
})();


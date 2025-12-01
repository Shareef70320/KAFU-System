// Default fallback values (used if API fails or before settings load)
const DEFAULT_LEVEL_NAMES = {
  BASIC: 'Aware',
  INTERMEDIATE: 'Knowledge',
  ADVANCED: 'Skilled',
  MASTERY: 'Mastery',
};

// Cache for level terminology (fetched from API)
let levelTerminologyCache = DEFAULT_LEVEL_NAMES;

// Initialize cache from localStorage on load
if (typeof window !== 'undefined') {
  try {
    const cached = localStorage.getItem('level_terminology');
    if (cached) {
      levelTerminologyCache = JSON.parse(cached);
    }
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Set level terminology cache (called from settings page or on app init)
export const setLevelTerminology = (terminology) => {
  levelTerminologyCache = { ...DEFAULT_LEVEL_NAMES, ...terminology };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('level_terminology', JSON.stringify(levelTerminologyCache));
    } catch (e) {
      // Ignore localStorage errors
    }
  }
};

// Clear cache (call this when settings are updated)
export const clearLevelTerminologyCache = () => {
  levelTerminologyCache = DEFAULT_LEVEL_NAMES;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('level_terminology');
    } catch (e) {
      // Ignore localStorage errors
    }
  }
};

// Get level display name (synchronous, uses cache)
export const getLevelDisplayName = (level) => {
  if (!level) return '';
  return levelTerminologyCache[level] || level;
};

// Get level display label
export const getLevelDisplayLabel = (level) => {
  const name = getLevelDisplayName(level);
  return name ? `${name} Level` : '';
};


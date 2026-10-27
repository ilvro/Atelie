/**
 * Procedural SVG illustrations for the Ateliê interface.
 */
export function emptyDeskIllustration() {
  return `
    <svg class="empty-desk-svg" width="160" height="190" viewBox="0 0 160 190" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id="paper-shadow" x="0" y="0" width="160" height="190" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.45"/>
        </filter>
        <filter id="clip-shadow" x="20" y="10" width="40" height="60" filterUnits="userSpaceOnUse">
          <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <!-- Base paper sheet with slight rotation -->
      <g transform="rotate(-2 80 95)" filter="url(#paper-shadow)">
        <rect x="25" y="20" width="110" height="150" rx="3" fill="var(--at-paper)" stroke="var(--at-paper-2)" stroke-width="1"/>
        <!-- Faint guidelines on paper -->
        <line x1="40" y1="50" x2="120" y2="50" stroke="var(--at-ink-faded)" stroke-width="1" stroke-dasharray="2 3" opacity="0.4"/>
        <line x1="40" y1="70" x2="120" y2="70" stroke="var(--at-ink-faded)" stroke-width="1" stroke-dasharray="2 3" opacity="0.3"/>
        <line x1="40" y1="90" x2="105" y2="90" stroke="var(--at-ink-faded)" stroke-width="1" stroke-dasharray="2 3" opacity="0.3"/>
        <line x1="40" y1="110" x2="115" y2="110" stroke="var(--at-ink-faded)" stroke-width="1" stroke-dasharray="2 3" opacity="0.3"/>
        <line x1="40" y1="130" x2="85" y2="130" stroke="var(--at-ink-faded)" stroke-width="1" stroke-dasharray="2 3" opacity="0.25"/>
      </g>
      <!-- Vintage metal paperclip on top-left -->
      <g filter="url(#clip-shadow)">
        <path d="M42 22 V52 C42 56 46 60 50 60 C54 60 58 56 58 52 V28 C58 25 56 23 53 23 C50 23 48 25 48 28 V48"
              fill="none" stroke="#7e7888" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M42 22 V52 C42 56 46 60 50 60 C54 60 58 56 58 52 V28 C58 25 56 23 53 23 C50 23 48 25 48 28 V48"
              fill="none" stroke="#b0a8ba" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
      </g>
    </svg>
  `;
}


/**
 * Small empty-state drawings (search with no result, empty folder, a document with only its paper).
 * Paper sheets on the desk, tilted, drawn with the current text colour so they follow the theme.
 */
export function emptyStateIllustration(kind = 'search') {
  const sheet = '<rect x="34" y="18" width="62" height="78" rx="3" fill="var(--at-paper, #e9dfc8)" stroke="currentColor" stroke-opacity=".25" transform="rotate(-6 65 57)"/>';
  const lines = '<path d="M46 40h38M46 52h38M46 64h26" stroke="#1d1b24" stroke-opacity=".28" stroke-width="2.4" stroke-linecap="round" transform="rotate(-6 65 57)"/>';
  let extra = '';
  if (kind === 'search') {
    extra = '<circle cx="92" cy="78" r="17" fill="none" stroke="currentColor" stroke-width="4"/><path d="m105 91 15 15" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M85 72l14 12M99 72 85 84" stroke="currentColor" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>';
  } else if (kind === 'folder') {
    extra = '<path d="M26 74h30l8 10h42v30H26z" fill="var(--at-desk-3, #2a2634)" stroke="currentColor" stroke-opacity=".55" stroke-width="2.5" stroke-linejoin="round"/>';
  } else if (kind === 'layers') {
    extra = '<g fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="2.5" stroke-dasharray="5 5"><rect x="46" y="70" width="58" height="34" rx="3" transform="rotate(4 75 87)"/></g><path d="M75 80v14M68 87h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>';
  }
  return `<svg class="empty-state-svg empty-state-${kind}" width="132" height="124" viewBox="0 0 140 124" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="color: var(--at-muted, #8d8578);">${sheet}${lines}${extra}</svg>`;
}

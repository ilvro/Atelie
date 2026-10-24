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


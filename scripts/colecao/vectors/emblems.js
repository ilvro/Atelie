export function items() {
  const list = [
    // 1. Escudo com águia
    {
      id: 'casa-emblema-escudo-aguia',
      name: 'Emblema · escudo com águia',
      category: 'Emblemas',
      tags: ['emblema', 'brasão', 'escudo', 'águia', 'heráldica', 'imperial'],
      width: 300,
      height: 360,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360" width="300" height="360">
  <g stroke="#000000" fill="none" stroke-linejoin="round" stroke-linecap="round">
    <!-- Outer heraldic shield -->
    <path d="M 50 40 L 250 40 L 250 180 C 250 260 180 310 150 330 C 120 310 50 260 50 180 Z" stroke-width="4.5"/>
    <path d="M 64 54 L 236 54 L 236 178 C 236 248 174 294 150 312 C 126 294 64 248 64 178 Z" stroke-width="1.8"/>
    <!-- Heraldic Eagle displayed -->
    <!-- Head & Beak facing left -->
    <path d="M 150 90 C 145 75 135 75 132 82 C 122 84 126 90 134 93 C 136 100 144 104 150 108" stroke-width="2.5" fill="#000000"/>
    <!-- Wings spread -->
    <path d="M 145 110 C 120 90 85 95 75 135 C 90 135 105 145 125 160 M 75 135 C 85 155 100 170 120 180" stroke-width="3"/>
    <path d="M 155 110 C 180 90 215 95 225 135 C 210 135 195 145 175 160 M 225 135 C 215 155 200 170 180 180" stroke-width="3"/>
    <!-- Body and Tail -->
    <path d="M 142 110 L 158 110 L 162 190 L 150 220 L 138 190 Z" stroke-width="2.5" fill="#000000"/>
    <!-- Talons -->
    <path d="M 130 195 L 115 220 M 135 200 L 125 225 M 170 195 L 185 220 M 165 200 L 175 225" stroke-width="3"/>
  </g>
</svg>`,
    },
    // 2. Escudo com leão
    {
      id: 'casa-emblema-escudo-leao',
      name: 'Emblema · escudo com leão',
      category: 'Emblemas',
      tags: ['emblema', 'brasão', 'escudo', 'leão', 'heráldica', 'nobreza'],
      width: 300,
      height: 360,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360" width="300" height="360">
  <g stroke="#000000" fill="none" stroke-linejoin="round" stroke-linecap="round">
    <!-- Shield -->
    <path d="M 50 40 L 250 40 L 250 180 C 250 260 180 310 150 330 C 120 310 50 260 50 180 Z" stroke-width="4.5"/>
    <path d="M 64 54 L 236 54 L 236 178 C 236 248 174 294 150 312 C 126 294 64 248 64 178 Z" stroke-width="1.8"/>
    <!-- Lion Rampant silhouette -->
    <!-- Head & mane -->
    <path d="M 155 90 C 160 80 175 80 178 92 C 188 92 188 100 180 104 C 185 110 175 118 165 115" stroke-width="2.5" fill="#000000"/>
    <!-- Forepaws raised -->
    <path d="M 165 115 L 195 105 M 195 105 L 205 100 M 165 125 L 190 125 M 190 125 L 200 122" stroke-width="3"/>
    <!-- Body & Spine -->
    <path d="M 158 115 C 145 130 140 160 150 190 C 155 205 150 220 145 235" stroke-width="4"/>
    <!-- Hind legs -->
    <path d="M 150 190 L 180 215 L 188 235 M 145 235 L 130 255 L 140 265" stroke-width="3.5"/>
    <!-- Tail curved upwards -->
    <path d="M 142 220 C 115 210 105 160 120 135 C 125 125 115 115 110 125 C 105 140 125 155 115 170" stroke-width="2.5"/>
  </g>
</svg>`,
    },
    // 3. Escudo com chave
    {
      id: 'casa-emblema-escudo-chave',
      name: 'Emblema · escudo com chaves',
      category: 'Emblemas',
      tags: ['emblema', 'brasão', 'escudo', 'chaves', 'segredo', 'arquivo', 'cofre'],
      width: 300,
      height: 360,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360" width="300" height="360">
  <g stroke="#000000" fill="none" stroke-linejoin="round" stroke-linecap="round">
    <path d="M 50 40 L 250 40 L 250 180 C 250 260 180 310 150 330 C 120 310 50 260 50 180 Z" stroke-width="4.5"/>
    <path d="M 64 54 L 236 54 L 236 178 C 236 248 174 294 150 312 C 126 294 64 248 64 178 Z" stroke-width="1.8"/>
    <!-- Crossed antique keys -->
    <!-- Key 1: top-left to bottom-right -->
    <line x1="95" y1="105" x2="205" y2="215" stroke-width="4"/>
    <circle cx="85" cy="95" r="14" stroke-width="3.5"/>
    <circle cx="85" cy="95" r="6" stroke-width="2"/>
    <!-- Bits of Key 1 -->
    <path d="M 205 215 L 217 203 M 197 223 L 209 211 M 197 223 L 189 231" stroke-width="3.5"/>
    <!-- Key 2: top-right to bottom-left -->
    <line x1="205" y1="105" x2="95" y2="215" stroke-width="4"/>
    <circle cx="215" cy="95" r="14" stroke-width="3.5"/>
    <circle cx="215" cy="95" r="6" stroke-width="2"/>
    <!-- Bits of Key 2 -->
    <path d="M 95 215 L 83 203 M 103 223 L 91 211 M 103 223 L 111 231" stroke-width="3.5"/>
    <!-- Star above keys -->
    <polygon points="150,80 154,90 165,90 156,97 160,108 150,101 140,108 144,97 135,90 146,90" fill="#000000"/>
  </g>
</svg>`,
    },
    // 4. Emblema de polícia genérico (Estrela de 6 pontas)
    {
      id: 'casa-emblema-policia-estrela',
      name: 'Emblema · distintivo de polícia',
      category: 'Emblemas',
      tags: ['emblema', 'distintivo', 'polícia', 'estrela', 'xerife', 'investigador'],
      width: 320,
      height: 320,
      svg: (() => {
        const cx = 160;
        const cy = 160;
        // 6-pointed star with rounded ball tips
        const points = [];
        const tips = [];
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6 - Math.PI / 2;
          const r = i % 2 === 0 ? 120 : 65;
          const px = cx + r * Math.cos(a);
          const py = cy + r * Math.sin(a);
          points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
          if (i % 2 === 0) tips.push({ x: px, y: py });
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
  <g stroke="#000000" fill="none" stroke-linejoin="round" stroke-linecap="round">
    <!-- Star body -->
    <polygon points="${points.join(' ')}" stroke-width="4"/>
    <polygon points="${points.join(' ')}" stroke-width="1.2" transform="translate(160, 160) scale(0.9) translate(-160, -160)"/>
    <!-- Ball tips on the 6 star points -->
    ${tips.map(t => `<circle cx="${t.x.toFixed(1)}" cy="${t.y.toFixed(1)}" r="7" fill="#000000"/>`).join('\n    ')}
    <!-- Center circular badge disc -->
    <circle cx="160" cy="160" r="48" stroke-width="3"/>
    <circle cx="160" cy="160" r="42" stroke-width="1.2" stroke-dasharray="3 3"/>
    <!-- Center scale of justice / balance -->
    <line x1="160" y1="130" x2="160" y2="185" stroke-width="2.5"/>
    <line x1="140" y1="142" x2="180" y2="142" stroke-width="2"/>
    <path d="M 134 165 C 134 172 146 172 146 165 Z" fill="#000000"/>
    <line x1="140" y1="142" x2="134" y2="165" stroke-width="1.2"/>
    <line x1="140" y1="142" x2="146" y2="165" stroke-width="1.2"/>
    <path d="M 174 165 C 174 172 186 172 186 165 Z" fill="#000000"/>
    <line x1="180" y1="142" x2="174" y2="165" stroke-width="1.2"/>
    <line x1="180" y1="142" x2="186" y2="165" stroke-width="1.2"/>
  </g>
</svg>`;
      })(),
    },
    // 5. Emblema médico (Bastão com serpente)
    {
      id: 'casa-emblema-medico-bastao',
      name: 'Emblema · bastão de esculápio médico',
      category: 'Emblemas',
      tags: ['emblema', 'médico', 'saúde', 'esculápio', 'serpente', 'bastão', 'hospital'],
      width: 300,
      height: 360,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360" width="300" height="360">
  <g stroke="#000000" fill="none" stroke-linejoin="round" stroke-linecap="round">
    <!-- Oval laurel framing -->
    <ellipse cx="150" cy="180" rx="115" ry="145" stroke-width="2"/>
    <ellipse cx="150" cy="180" rx="125" ry="155" stroke-width="3.5"/>
    <!-- Knotty wooden staff -->
    <line x1="150" y1="55" x2="150" y2="305" stroke-width="5"/>
    <circle cx="150" cy="50" r="8" fill="#000000"/>
    <!-- Entwined Serpent of Asclepius -->
    <path d="M 150 290 C 120 280 120 250 150 240 C 180 230 180 200 150 190 C 120 180 120 150 150 140 C 180 130 180 100 150 90 C 135 85 130 70 142 62" stroke-width="4"/>
    <!-- Snake head facing staff top -->
    <path d="M 142 62 C 146 56 156 58 152 68 C 148 76 138 72 142 62 Z" fill="#000000"/>
    <circle cx="147" cy="62" r="1.5" fill="#ffffff"/>
  </g>
</svg>`,
    },
    // 6. Emblema de universidade (Livro e tocha)
    {
      id: 'casa-emblema-universidade-livro-tocha',
      name: 'Emblema · universidade livro e tocha',
      category: 'Emblemas',
      tags: ['emblema', 'universidade', 'acadêmico', 'livro', 'tocha', 'saber', 'ciência'],
      width: 300,
      height: 360,
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360" width="300" height="360">
  <g stroke="#000000" fill="none" stroke-linejoin="round" stroke-linecap="round">
    <!-- Crest shield -->
    <path d="M 50 50 L 250 50 L 250 190 C 250 265 180 315 150 330 C 120 315 50 265 50 190 Z" stroke-width="4.5"/>
    <path d="M 64 64 L 236 64 L 236 186 C 236 250 176 298 150 312 C 124 298 64 250 64 186 Z" stroke-width="1.8"/>
    <!-- Flaming torch in upper crest -->
    <line x1="150" y1="120" x2="150" y2="175" stroke-width="4.5"/>
    <polygon points="144,120 156,120 153,132 147,132" fill="#000000"/>
    <!-- Torch flames -->
    <path d="M 150 115 C 140 105 142 90 150 78 C 158 90 160 105 150 115 Z" fill="#000000"/>
    <path d="M 148 95 C 135 88 138 78 145 70 C 148 80 154 88 148 95 Z" fill="#000000"/>
    <!-- Open Book below torch -->
    <!-- Left page -->
    <path d="M 150 240 C 130 234 105 236 90 244 L 90 196 C 105 188 130 186 150 192 Z" stroke-width="2.5"/>
    <!-- Right page -->
    <path d="M 150 240 C 170 234 195 236 210 244 L 210 196 C 195 188 170 186 150 192 Z" stroke-width="2.5"/>
    <!-- Book lines representing text -->
    <line x1="100" y1="205" x2="140" y2="201" stroke-width="1.2"/>
    <line x1="100" y1="215" x2="140" y2="211" stroke-width="1.2"/>
    <line x1="100" y1="225" x2="140" y2="221" stroke-width="1.2"/>
    <line x1="160" y1="201" x2="200" y2="205" stroke-width="1.2"/>
    <line x1="160" y1="211" x2="200" y2="215" stroke-width="1.2"/>
    <line x1="160" y1="221" x2="200" y2="225" stroke-width="1.2"/>
  </g>
</svg>`,
    },
  ];

  return list;
}


/**
 * Deterministic pseudo-random number generator (mulberry32).
 * Returns a float in [0, 1).
 */
export function prng(seed = 1, index = 0, stream = 0) {
  let t = (Math.imul((seed || 1) & 0xffffffff, 9973) + index * 31 + stream * 101) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Deterministic wobble of one glyph for an ink style. `index` counts glyphs across the whole layer.
 * Returns { dx, dy, rotate (rad), scale, alpha, ghost: null | { dx, dy, alpha } } in document px.
 */
export function inkJitter(style, { seed = 1, index = 0, size = 16, wear = 0 } = {}) {
  const neutral = { dx: 0, dy: 0, rotate: 0, scale: 1, alpha: 1, ghost: null };
  if (style === 'clean' || wear === 0) {
    return { ...neutral };
  }

  if (style === 'typewriter') {
    const r1 = prng(seed, index, 1);
    const r2 = prng(seed, index, 2);
    const r3 = prng(seed, index, 3);
    const r4 = prng(seed, index, 4);

    const dy = (r1 * 2 - 1) * 0.04 * size * wear;
    const dx = (r2 * 2 - 1) * 0.015 * size * wear;
    const alpha = 1 - r3 * 0.45 * wear;
    const hasGhost = r4 < 1 / 12;
    const ghost = hasGhost
      ? {
          dx: 0.03 * size * wear,
          dy: 0.03 * size * wear,
          alpha: 0.35 * wear,
        }
      : null;

    return { dx, dy, rotate: 0, scale: 1, alpha, ghost };
  }

  if (style === 'handwriting') {
    const r1 = prng(seed, index, 1);
    const r2 = prng(seed, index, 2);

    const rotate = (r1 * 2 - 1) * 0.05 * wear;
    const scale = 1 + (r2 * 2 - 1) * 0.06 * wear;
    const dy = Math.sin(index * 0.35) * 0.03 * size * wear;

    return { dx: 0, dy, rotate, scale, alpha: 1, ghost: null };
  }

  if (style === 'stamp') {
    const rSeed = prng(seed, 0, 99);
    const rAlpha = prng(seed, index, 1);

    const rotate = (rSeed * 2 - 1) * 0.03 * wear;
    const alpha = 1 - rAlpha * 0.45 * wear;

    return { dx: 0, dy: 0, rotate, scale: 1, alpha, ghost: null };
  }

  return { ...neutral };
}

function splitLongWord(word, px, width, measureWidth) {
  const chunks = [];
  let remaining = word;
  while (measureWidth(remaining, px) > width && remaining.length > 1) {
    let cut = remaining.length - 1;
    while (cut > 1 && measureWidth(remaining.slice(0, cut), px) > width) {
      cut--;
    }
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  if (remaining.length > 0) {
    chunks.push(remaining);
  }
  return chunks;
}

/**
 * Breaks content into lines of words for a given font size `px`.
 */
function breakContentLines(content, { measureWidth, width, box, px }) {
  if (content == null || content === '') {
    return [];
  }

  const cleanContent = String(content).replace(/\t/g, '    ');
  const rawParagraphs = cleanContent.replace(/\r\n?/g, '\n').split('\n');
  const lines = [];

  if (box === 'point') {
    for (const paragraph of rawParagraphs) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      const lineWords = words.map(w => ({ text: w, width: measureWidth(w, px) }));
      lines.push({
        text: paragraph,
        words: lineWords,
        isLastInParagraph: true,
      });
    }
    while (lines.length > 0 && lines[lines.length - 1].text === '') {
      lines.pop();
    }
    return lines;
  }

  // box === 'area'
  for (const paragraph of rawParagraphs) {
    const rawWords = paragraph.split(/\s+/).filter(Boolean);
    if (!rawWords.length) {
      lines.push({
        text: '',
        words: [],
        isLastInParagraph: true,
      });
      continue;
    }

    const words = [];
    for (const rawWord of rawWords) {
      if (measureWidth(rawWord, px) > width && rawWord.length > 1) {
        const slices = splitLongWord(rawWord, px, width, measureWidth);
        words.push(...slices);
      } else {
        words.push(rawWord);
      }
    }

    let currentWords = [];
    for (const word of words) {
      const wordObj = { text: word, width: measureWidth(word, px) };
      if (currentWords.length === 0) {
        currentWords.push(wordObj);
      } else {
        const candidateText = [...currentWords, wordObj].map(w => w.text).join(' ');
        if (measureWidth(candidateText, px) <= width) {
          currentWords.push(wordObj);
        } else {
          lines.push({
            text: currentWords.map(w => w.text).join(' '),
            words: currentWords,
            isLastInParagraph: false,
          });
          currentWords = [wordObj];
        }
      }
    }

    if (currentWords.length > 0) {
      lines.push({
        text: currentWords.map(w => w.text).join(' '),
        words: currentWords,
        isLastInParagraph: true,
      });
    }
  }

  while (lines.length > 0 && lines[lines.length - 1].text === '') {
    lines.pop();
  }

  return lines;
}

/**
 * Lines of a text block. `measure(text, px)` gives the width of a string at a size (the renderer passes the canvas'
 * measureText; tests pass a fake). Sizes in document px.
 * Returns { size, lines: [{ text, x, y, width, words: [{ text, x, width }] }], height, overflow }
 *   x, y: start of the line's baseline inside the box (box top-left = 0,0)
 */
export function layoutText(content, {
  measure,
  width,
  height,
  size,
  lineHeight = 1.25,
  letterSpacing = 0,
  align = 'left',
  valign = 'top',
  box = 'area',
  fit = 'overflow',
  minSize = size * 0.4,
}) {
  const measureWidth = (str, px) => {
    if (!str) return 0;
    const base = measure(str, px);
    const extra = str.length * (px * (letterSpacing / 1000));
    return base + extra;
  };

  const getLinesHeight = (lines, px) => lines.length * px * lineHeight;

  let curSize = size;
  let overflow = false;

  if (fit === 'shrink') {
    const linesAtSize = breakContentLines(content, { measureWidth, width, box, px: curSize });
    const hAtSize = getLinesHeight(linesAtSize, curSize);

    if (hAtSize > height) {
      const linesAtMin = breakContentLines(content, { measureWidth, width, box, px: minSize });
      const hAtMin = getLinesHeight(linesAtMin, minSize);

      if (hAtMin > height) {
        curSize = minSize;
        overflow = true;
      } else {
        let low = minSize;
        let high = curSize;
        for (let step = 0; step < 12; step++) {
          const mid = (low + high) / 2;
          const candidateLines = breakContentLines(content, { measureWidth, width, box, px: mid });
          const candidateH = getLinesHeight(candidateLines, mid);
          if (candidateH <= height) {
            low = mid;
          } else {
            high = mid;
          }
        }
        curSize = low;
        overflow = false;
      }
    }
  } else {
    const linesAtSize = breakContentLines(content, { measureWidth, width, box, px: curSize });
    const hAtSize = getLinesHeight(linesAtSize, curSize);
    overflow = hAtSize > height;
  }

  const rawLines = breakContentLines(content, { measureWidth, width, box, px: curSize });
  const totalTextHeight = getLinesHeight(rawLines, curSize);
  const spaceWidth = measureWidth(' ', curSize);

  let yShift = 0;
  if (valign === 'middle') {
    yShift = (height - totalTextHeight) / 2;
  } else if (valign === 'bottom') {
    yShift = height - totalTextHeight;
  }

  const lines = rawLines.map((rawLine, i) => {
    const baselineY = curSize * 0.8 + i * curSize * lineHeight + yShift;
    const lineWords = rawLine.words;
    const lineText = rawLine.text;

    if (!lineWords.length) {
      return {
        text: '',
        x: 0,
        y: baselineY,
        width: 0,
        words: [],
      };
    }

    const naturalWidth = measureWidth(lineText, curSize);

    if (align === 'justify' && !rawLine.isLastInParagraph && lineWords.length > 1) {
      const sumWordsW = lineWords.reduce((s, w) => s + w.width, 0);
      const gap = (width - sumWordsW) / (lineWords.length - 1);
      let wx = 0;
      const wordsWithX = lineWords.map(w => {
        const item = { text: w.text, x: wx, width: w.width };
        wx += w.width + gap;
        return item;
      });
      return {
        text: lineText,
        x: 0,
        y: baselineY,
        width,
        words: wordsWithX,
      };
    }

    let lineX = 0;
    if (align === 'center') {
      lineX = (width - naturalWidth) / 2;
    } else if (align === 'right') {
      lineX = width - naturalWidth;
    }

    let searchIdx = 0;
    const wordsWithX = lineWords.map(w => {
      let wordOffset = 0;
      const foundIdx = lineText.indexOf(w.text, searchIdx);
      if (foundIdx >= 0) {
        wordOffset = measureWidth(lineText.slice(0, foundIdx), curSize);
        searchIdx = foundIdx + w.text.length;
      }
      return { text: w.text, x: lineX + wordOffset, width: w.width };
    });

    return {
      text: lineText,
      x: lineX,
      y: baselineY,
      width: naturalWidth,
      words: wordsWithX,
    };
  });

  return {
    size: curSize,
    lines,
    height: totalTextHeight,
    overflow,
  };
}


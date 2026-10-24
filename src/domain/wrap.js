/**
 * Breaks text into the lines of a page. `measure(text)` gives the width of a string in the
 * units of `width`. Explicit line breaks are kept, a blank line is a paragraph, and a word
 * longer than the line is split by letters. Returns the lines and whether text was left over
 * after `maxLines`.
 */
export function wrapText(text, measure, width, maxLines = Infinity) {
  const lines = [];
  for (const paragraph of String(text ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(''); continue; }
    let line = '';
    for (let word of words) {
      while (measure(word) > width && word.length > 1) {
        // A word wider than the page: as many letters as fit, then the rest on the next line.
        if (line) { lines.push(line); line = ''; }
        let cut = word.length - 1; while (cut > 1 && measure(word.slice(0, cut)) > width) cut--;
        lines.push(word.slice(0, cut)); word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next) > width) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
  }
  while (lines.length && lines.at(-1) === '') lines.pop();
  return lines.length > maxLines ? { lines: lines.slice(0, maxLines), overflow: true } : { lines, overflow: false };
}


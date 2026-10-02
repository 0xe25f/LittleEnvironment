/**
 * Removes comments and redundant whitespace from JavaScript without dependencies.
 * It intentionally preserves public identifiers so the generated ESM API remains debuggable.
 *
 * @param {string} source JavaScript source.
 * @returns {string} Compact JavaScript.
 */
export function minifyJavaScript(source) {
  let output = '';
  let index = 0;
  let quote = null;
  let escaped = false;
  let pendingWhitespace = false;
  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];
    if (quote) {
      output += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      index += 1;
      continue;
    }
    if (character === '\'' || character === '"' || character === '`') {
      if (pendingWhitespace && /[A-Za-z0-9_$]/.test(output.at(-1) ?? '')) output += ' ';
      pendingWhitespace = false;
      quote = character;
      output += character;
      index += 1;
      continue;
    }
    if (character === '/' && next === '/') {
      index += 2;
      while (index < source.length && source[index] !== '\n') index += 1;
      pendingWhitespace = true;
      continue;
    }
    if (character === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1;
      index += 2;
      pendingWhitespace = true;
      continue;
    }
    if (/\s/.test(character)) {
      pendingWhitespace = true;
      index += 1;
      continue;
    }
    if (pendingWhitespace) {
      const previous = output.at(-1) ?? '';
      if (/[A-Za-z0-9_$]/.test(previous) && /[A-Za-z0-9_$]/.test(character)) output += ' ';
      pendingWhitespace = false;
    }
    output += character;
    index += 1;
  }
  return output.trim();
}

/**
 * Deterministically shortens selected internal helper identifiers.
 * Public API names are deliberately never mangled.
 *
 * @param {string} source JavaScript source.
 * @returns {string} Source with internal identifiers shortened.
 */
export function manglePrivateIdentifiers(source) {
  const names = [
    'attributeClamp',
    'boundedLightHash',
    'climateClamp',
    'colourClamp',
    'combatClamp',
    'findAttribute',
    'normaliseGradientTime',
    'seededWeatherRandom',
    'vitalClamp',
    'weatherClamp',
  ];
  return names.reduce((result, name, index) => result.replace(new RegExp(`\\b${name}\\b`, 'g'), `_${index.toString(36)}`), source);
}

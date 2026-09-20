function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value, max = 6000) {
  if (!value) return '';
  return value.length <= max ? value : `${value.slice(0, max - 3)}...`;
}

module.exports = { normalizeText, truncateText };

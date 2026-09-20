const { normalizeText } = require('./text');

const LEGAL_FORM_STOPWORDS = new Set([
  'ип',
  'индивидуальный',
  'предприниматель',
  'ооо',
  'ооо.',
  'зао',
  'пао',
  'ао',
  'оао',
  'общество',
  'ограниченной',
  'ответственностью'
]);

function buildBranchSearchText(branch) {
  return normalizeText([
    branch.id,
    branch.jur_lico,
    branch.status,
    branch.iiko?.address_tt,
    branch.location?.address,
    branch.location?.city
  ].filter(Boolean).join(' | '));
}

function tokenize(value) {
  return normalizeText(value)
    .replace(/["'`«»()\[\],.]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function tokenizeJurName(value) {
  return tokenize(value).filter((token) => !LEGAL_FORM_STOPWORDS.has(token));
}

function isTokenMatch(queryToken, targetToken) {
  if (!queryToken || !targetToken) return false;
  if (queryToken === targetToken) return true;
  if (queryToken.length >= 3 && targetToken.startsWith(queryToken)) return true;
  if (targetToken.length >= 3 && queryToken.startsWith(targetToken)) return true;
  return false;
}

function scoreJurTokens(branch, query) {
  const queryTokens = tokenizeJurName(query);
  const jurTokens = tokenizeJurName(branch.jur_lico);

  if (!queryTokens.length || !jurTokens.length) return 0;

  const matchedCount = queryTokens.filter((queryToken) => {
    return jurTokens.some((jurToken) => isTokenMatch(queryToken, jurToken));
  }).length;

  if (!matchedCount) return 0;

  const allMatched = matchedCount === queryTokens.length;
  const firstTokenMatched = isTokenMatch(queryTokens[0], jurTokens[0])
    || jurTokens.some((jurToken) => isTokenMatch(queryTokens[0], jurToken));

  if (queryTokens.length >= 2 && !allMatched) return 0;
  if (allMatched && queryTokens.length >= 2 && firstTokenMatched) return 88;
  if (allMatched) return 82;
  return 62;
}

function scoreBranch(branch, query) {
  const q = normalizeText(query);
  const jur = normalizeText(branch.jur_lico);
  const tt = normalizeText(branch.iiko?.address_tt);
  const address = normalizeText(branch.location?.address);
  const city = normalizeText(branch.location?.city);
  const full = buildBranchSearchText(branch);
  const jurTokenScore = scoreJurTokens(branch, query);

  if (!q) return 0;
  if (String(branch.id) === q) return 100;
  if (tt === q) return 95;
  if (jur === q) return 90;
  if (address === q) return 85;
  if (jurTokenScore) return jurTokenScore;
  if (city === q) return 70;
  if (tt.includes(q)) return 60;
  if (jur.includes(q)) return 55;
  if (address.includes(q)) return 50;
  if (full.includes(q)) return 40;
  return 0;
}

function searchBranches(branches, query, limit = 10) {
  return branches
    .map((branch) => ({ branch, score: scoreBranch(branch, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.branch.id) - Number(b.branch.id))
    .slice(0, limit)
    .map((item) => item.branch);
}

module.exports = { searchBranches };

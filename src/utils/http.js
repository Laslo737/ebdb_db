async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} for ${url}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

module.exports = { fetchJson };

const API = 'https://api.github.com';

function repoInfo() {
  const repo = process.env.GITHUB_REPO;
  if (!repo || !repo.includes('/')) throw new Error('GITHUB_REPO env var must be "owner/repo"');
  const [owner, name] = repo.split('/');
  return { owner, name, branch: process.env.GITHUB_BRANCH || 'main' };
}

async function ghFetch(path, options) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN env var not set');
  const res = await fetch(API + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'aerovisioon-admin',
      ...(options && options.headers),
    },
  });
  return res;
}

async function getFileSha(path) {
  const file = await getFile(path);
  return file ? file.sha : null;
}

async function getFile(path) {
  const { owner, name, branch } = repoInfo();
  const res = await ghFetch(`/repos/${owner}/${name}/contents/${encodeURIComponent(path)}?ref=${branch}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('GitHub GET failed: ' + res.status + ' ' + (await res.text()));
  const json = await res.json();
  return { sha: json.sha, content: Buffer.from(json.content, 'base64').toString('utf8') };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function putFile(path, base64Content, message) {
  const { owner, name, branch } = repoInfo();
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    const sha = await getFileSha(path);
    const res = await ghFetch(`/repos/${owner}/${name}/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: base64Content,
        branch,
        ...(sha ? { sha } : {}),
      }),
    });
    if (res.ok) return res.json();
    const text = await res.text();
    lastErr = new Error('GitHub PUT failed: ' + res.status + ' ' + text);
    // 409 = another write landed between our sha read and this PUT (or 422 with a sha mismatch
    // message, which GitHub sometimes returns instead). Re-fetch the latest sha and retry.
    const isConflict = res.status === 409 || (res.status === 422 && /sha/i.test(text));
    if (!isConflict) throw lastErr;
    await sleep(150 + Math.floor(Math.random() * 250));
  }
  throw lastErr;
}

module.exports = { putFile, getFileSha, getFile };

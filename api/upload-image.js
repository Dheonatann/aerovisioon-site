const { requireAuth } = require('./_lib/auth');
const { putFile } = require('./_lib/github');

function safeFileName(name) {
  const base = String(name || 'foto').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cleaned = base.replace(/[^a-z0-9.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned || 'foto';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAuth(req, process.env.AUTH_SECRET)) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const { filename, dataBase64 } = req.body || {};
  if (!filename || !dataBase64) {
    res.status(400).json({ error: 'filename e dataBase64 são obrigatórios' });
    return;
  }
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/.exec(dataBase64);
  if (!match) {
    res.status(400).json({ error: 'Formato de imagem não suportado (use PNG, JPEG ou WEBP)' });
    return;
  }
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const base64 = match[2];
  const stamp = Date.now().toString(36);
  const name = safeFileName(filename.replace(/\.[a-zA-Z0-9]+$/, '')) + '-' + stamp + '.' + ext;
  const path = 'images/' + name;
  try {
    await putFile(path, base64, 'Upload de imagem via painel admin: ' + name);
    res.status(200).json({ ok: true, path });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

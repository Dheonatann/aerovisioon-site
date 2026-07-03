const { requireAuth } = require('./_lib/auth');
const { putFile } = require('./_lib/github');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAuth(req, process.env.AUTH_SECRET)) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }
  const { content } = req.body || {};
  if (!content || typeof content !== 'object') {
    res.status(400).json({ error: 'Conteúdo inválido' });
    return;
  }
  try {
    const base64 = Buffer.from(JSON.stringify(content, null, 2), 'utf8').toString('base64');
    await putFile('content.json', base64, 'Atualizar conteúdo do site via painel admin');
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

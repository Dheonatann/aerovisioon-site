const { getFile, putFile } = require('./_lib/github');

function sanitize(s, max) {
  return String(s || '').trim().slice(0, max || 200);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const body = req.body || {};

  if (body.hp) {
    res.status(200).json({ ok: true });
    return;
  }

  const entry = {
    id: 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    package: sanitize(body.package, 120),
    name: sanitize(body.name, 120),
    whatsapp: sanitize(body.whatsapp, 40),
    date: sanitize(body.date, 20),
    time: sanitize(body.time, 20),
    location: sanitize(body.location, 200),
    status: 'pendente',
    createdAt: Date.now(),
  };

  if (!entry.package || !entry.name || !entry.whatsapp || !entry.date || !entry.time || !entry.location) {
    res.status(400).json({ error: 'Campos obrigatórios faltando' });
    return;
  }

  const path = 'reservations.json';
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const file = await getFile(path);
      let list = [];
      if (file) {
        try {
          list = JSON.parse(file.content);
          if (!Array.isArray(list)) list = [];
        } catch {
          list = [];
        }
      }
      list.push(entry);
      const base64 = Buffer.from(JSON.stringify(list, null, 2), 'utf8').toString('base64');
      await putFile(path, base64, 'Nova reserva: ' + entry.name + ' (' + entry.package + ')');
      res.status(200).json({ ok: true, id: entry.id });
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  res.status(500).json({ error: 'Erro ao salvar reserva: ' + (lastErr && lastErr.message) });
};

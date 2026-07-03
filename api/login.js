const { sign } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { password } = req.body || {};
  if (!process.env.ADMIN_PASSWORD || !process.env.AUTH_SECRET) {
    res.status(500).json({ error: 'Server not configured' });
    return;
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({
      error: 'Senha incorreta',
      debug: {
        bodyType: typeof req.body,
        receivedLen: password ? password.length : null,
        receivedChars: password ? JSON.stringify(password) : null,
        envLen: process.env.ADMIN_PASSWORD.length,
        envChars: JSON.stringify(process.env.ADMIN_PASSWORD),
      },
    });
    return;
  }
  const token = sign({ exp: Date.now() + 12 * 3600 * 1000 }, process.env.AUTH_SECRET);
  res.status(200).json({ token });
};

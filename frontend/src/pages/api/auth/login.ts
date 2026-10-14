import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  name?: string;
  otp_required?: boolean;
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    const apiRes = await fetch(`${process.env.API_URL}/api/authentication/login/`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'API-Key': `${process.env.BACKEND_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await apiRes.json();

    if (apiRes.status !== 200) {
      return res.status(apiRes.status).json({ error: data?.error || 'Server error.' });
    }

    // Con 2FA activado el backend envía un código al correo en vez de los tokens
    if (data.results?.otp_required) {
      return res.status(200).json({ otp_required: true });
    }

    const { access, refresh } = data.results;
    res.setHeader('Set-Cookie', [
      `access=${access}; HttpOnly; Path=/; SameSite=Strict; Secure=${process.env.NODE_ENV === 'production' ? 'true' : 'false'}; Max-Age=2592000`,
      `refresh=${refresh}; HttpOnly; Path=/; SameSite=Strict; Secure=${process.env.NODE_ENV === 'production' ? 'true' : 'false'}; Max-Age=5184000`,
    ]);

    return res.status(200).json({ name: 'Login successfull' });
  } catch (err) {
    return res.status(500).json({
      error: 'Something went wrong',
    });
  }
}

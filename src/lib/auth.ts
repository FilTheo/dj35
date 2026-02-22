import { createHmac, randomBytes } from 'crypto';

const getSecret = () => {
  const secret = process.env.APP_SECRET_TOKEN;
  if (!secret) {
    throw new Error('APP_SECRET_TOKEN environment variable is not set');
  }
  return secret;
};

export function createToken(): string {
  const sessionId = randomBytes(16).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `${sessionId}.${timestamp}`;
  const signature = createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

export function verifyToken(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [sessionId, timestamp, signature] = parts;
    const payload = `${sessionId}.${timestamp}`;
    const expected = createHmac('sha256', getSecret())
      .update(payload)
      .digest('hex');

    // Constant-time comparison
    if (signature.length !== expected.length) return false;
    let mismatch = 0;
    for (let i = 0; i < signature.length; i++) {
      mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    if (mismatch !== 0) return false;

    // Token expires after 24 hours
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    if (tokenAge > 24 * 60 * 60 * 1000) return false;

    return true;
  } catch {
    return false;
  }
}

export function validatePassword(password: string): boolean {
  const validPassword = process.env.APP_PASSWORD;
  if (!validPassword) {
    throw new Error('APP_PASSWORD environment variable is not set');
  }
  return password.trim() === validPassword.trim();
}

import bcrypt from 'bcryptjs';

const DEFAULT_ROUNDS = 10;

export async function hashPassword(plainTextPassword: string, saltRounds: number = DEFAULT_ROUNDS): Promise<string> {
  if (!plainTextPassword) {
    throw new Error('Password must not be empty');
  }
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(plainTextPassword, salt);
  return hash;
}

export async function verifyPassword(plainTextPassword: string, passwordHash: string): Promise<boolean> {
  if (!plainTextPassword || !passwordHash) {
    return false;
  }
  return bcrypt.compare(plainTextPassword, passwordHash);
}



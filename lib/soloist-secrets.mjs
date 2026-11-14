import { mkdir, readFile, writeFile, unlink, chmod } from 'node:fs/promises';
import path from 'node:path';

const keyFile = dir => path.join(dir, 'soloist-key');
const prefsFile = dir => path.join(dir, 'soloist-preferences.json');

export function validSoloistKey(key) {
  return typeof key === 'string' && key.length >= 10 && key.length <= 2048
    && !/[\r\n\0]/.test(key);
}
export async function readSoloistKey(dir) {
  try {
    const key = (await readFile(keyFile(dir), 'utf8')).trim();
    return validSoloistKey(key) ? key : null;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
export async function storeSoloistKey(dir, key) {
  if (!validSoloistKey(key)) throw new Error('Invalid Soloist API key.');
  await mkdir(dir, { recursive:true, mode:0o700 });
  await writeFile(keyFile(dir), key, { mode:0o600 });
  await chmod(keyFile(dir), 0o600);
}
export async function deleteSoloistKey(dir) {
  try { await unlink(keyFile(dir)); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
export async function readSoloistPreferences(dir) {
  try {
    const data = JSON.parse(await readFile(prefsFile(dir), 'utf8'));
    return { binary: typeof data.binary === 'string' ? data.binary : '' };
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return { binary:'' };
    throw error;
  }
}
export async function storeSoloistPreferences(dir, binary) {
  await mkdir(dir, { recursive:true, mode:0o700 });
  await writeFile(prefsFile(dir), JSON.stringify({binary},null,2), {mode:0o600});
  await chmod(prefsFile(dir), 0o600);
}

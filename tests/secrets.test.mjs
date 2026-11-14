import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  readSoloistKey, storeSoloistKey, deleteSoloistKey,
  readSoloistPreferences, storeSoloistPreferences, validSoloistKey
} from '../lib/soloist-secrets.mjs';

test('stored Soloist credentials are private and survive restart', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'aura-secrets-'));
  const key = 'local-only-test-key-please-do-not-use';
  try {
    assert.equal(await readSoloistKey(dir), null);
    assert.equal(validSoloistKey(key), true);
    assert.equal(validSoloistKey('bad\nkey'), false);
    await storeSoloistKey(dir, key);
    assert.equal(await readSoloistKey(dir), key);
    if (process.platform !== 'win32') {
      assert.equal((await stat(path.join(dir, 'soloist-key'))).mode & 0o777, 0o600);
    }
    await storeSoloistPreferences(dir, '/usr/bin/soloist');
    assert.deepEqual(await readSoloistPreferences(dir), {binary:'/usr/bin/soloist'});
    assert.ok(!(await readFile(path.join(dir,'soloist-preferences.json'),'utf8')).includes(key));
    await deleteSoloistKey(dir);
    assert.equal(await readSoloistKey(dir), null);
  } finally {
    await rm(dir, {recursive:true, force:true});
  }
});

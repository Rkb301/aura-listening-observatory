import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const python='/usr/bin/python3';
const probed=process.platform==='linux'?spawnSync(python,['-c',
  'import gi; gi.require_version("Gio","2.0"); from gi.repository import Gio, GLib'],
  {timeout:4000}):null;
const canTest=process.platform==='linux'&&probed?.status===0;

test('Linux AURA MPRIS metadata adapter validates its offline player model',
  {skip:!canTest},()=>{
  const helper=path.resolve(import.meta.dirname,'../scripts/aura-mpris-linux.py');
  const result=spawnSync(python,[helper,'--selftest'],{
    encoding:'utf8',timeout:5000
  });
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/self-test|tests passed/i);
});

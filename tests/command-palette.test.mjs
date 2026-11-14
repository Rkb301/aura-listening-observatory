import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../src/app-core.js',import.meta.url),'utf8');
const from=source.indexOf('const AURA_COMMANDS='),to=source.indexOf('\nfunction keys(',from);
assert.ok(from>0&&to>from);
const code=source.slice(from,to);
test('command palette has all major AURA destinations and filters without Spotify calls',()=>{
 const document={querySelector:()=>null};
 const context={document,$:()=>null,esc:s=>s,nav:()=>{throw Error('Navigation not requested')},window:{}};
 const get=runInNewContext(code+'\n({AURA_COMMANDS,paletteEntries})',context);
 assert.ok(get.AURA_COMMANDS.length>=12);
 assert.deepEqual([...get.paletteEntries('spoken').map(x=>x[0])],['podcasts']);
 assert.deepEqual([...get.paletteEntries('LIKED').map(x=>x[0])],['liked']);
 assert.equal(get.paletteEntries('not a destination').length,0);
 assert.equal(new Set(get.AURA_COMMANDS.map(x=>x[0])).size,get.AURA_COMMANDS.length);
});
test('palette shortcut and search shortcut remain distinct',()=>{
 const keys=source.slice(source.indexOf('function keys('),source.indexOf('\nasync function bootstrap('));
 assert.match(keys,/e\.key\.toLowerCase\(\)==='p'/);
 assert.match(keys,/e\.key\.toLowerCase\(\)==='k'/);
 assert.match(keys,/if\(paletteKey\(e\)\)return/);
});

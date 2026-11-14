import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// Read-only check catches a generated-file-only edit or a source change that
// was never rebuilt, without rewriting the live UI served by AURA.
test('committed web assets match canonical UI source',()=>{
 const result=spawnSync(process.execPath,['scripts/build-web.mjs','--check'],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||result.stdout);
});
test('repeat control regression runs against canonical source, not generated bundle',()=>{
 const testSource=readFileSync(new URL('./repeat-control.test.mjs',import.meta.url),'utf8');
 assert.match(testSource,/src\/app-core\.js/);
 assert.doesNotMatch(testSource,/public\/app\.js/);
});

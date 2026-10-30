import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { selectMidi, readMidi, createMidiRoute } from '../vendor/spessasynth/src/server/midi_source.ts';
const midi = Buffer.from('4d546864000000060000000100604d54726b0000000400ff2f00','hex');
async function fixture(t) {
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'clave-midi-'));
 t.after(()=>fs.rm(tmp,{recursive:true,force:true}));
 const root=path.join(tmp,'source'); await fs.mkdir(path.join(root,'Compositor'),{recursive:true});
 await fs.writeFile(path.join(root,'Compositor','Canção.midi'),midi);
 return {tmp,root,relative:'Compositor/Canção.midi'};
}
test('finds one nested MIDI and preserves relative name',async t=>{
 const {root,relative}=await fixture(t);
 assert.deepEqual(await selectMidi(root),{root,relativePath:relative});
 assert.deepEqual(await readMidi(root,relative),midi);
});
test('missing source gives actionable guidance',async()=>{
 await assert.rejects(selectMidi(undefined),/MIDI_SOURCE_DIR/);
});
test('rejects traversal, absolute paths, wrong formats and escaping symlinks',async t=>{
 const {tmp,root}=await fixture(t);
 await fs.writeFile(path.join(tmp,'outside.mid'),midi);
 await fs.symlink(path.join(tmp,'outside.mid'),path.join(root,'escape.mid'));
 await fs.symlink(tmp,path.join(root,'escape-directory'));
 await fs.writeFile(path.join(root,'invalid.mid'),'not MIDI');
 await fs.writeFile(path.join(root,'truncated.mid'),midi.subarray(0,24));
 for(const value of ['../outside.mid',path.join(tmp,'outside.mid'),'escape.mid','escape-directory/outside.mid','invalid.mid','truncated.mid','anything.txt']) {
  await assert.rejects(readMidi(root,value),value);
 }
});
test('accepts in-root symlink, detects later replacement outside root',async t=>{
 const {tmp,root,relative}=await fixture(t);
 await fs.symlink(path.join(root,relative),path.join(root,'alias.mid'));
 assert.deepEqual(await readMidi(root,'alias.mid'),midi);
 await fs.unlink(path.join(root,'alias.mid'));
 await fs.writeFile(path.join(tmp,'outside.mid'),midi);
 await fs.symlink(path.join(tmp,'outside.mid'),path.join(root,'alias.mid'));
 await assert.rejects(readMidi(root,'alias.mid'));
});
test('bounded discovery and explicit selection',async t=>{
 const {tmp}=await fixture(t);const root=path.join(tmp,'empty');await fs.mkdir(root);
 for(let i=0;i<257;i++) await fs.writeFile(path.join(root,`${i}.txt`),'');
 await assert.rejects(selectMidi(root),/256/);
});
test('HTTP serves only fixed endpoints and rejects user paths',async t=>{
 const {root,relative}=await fixture(t);
 const route=createMidiRoute(root,relative);
 const server=http.createServer(async(req,res)=>{if(!await route(req,res)){res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const meta=await (await fetch(base+'/clave-sol/midi-test')).json();
 assert.equal(meta.relativePath,relative);assert.equal(meta.fileName,'Canção.midi');
 const response=await fetch(base+meta.url);assert.equal(response.status,200);
 assert.deepEqual(Buffer.from(await response.arrayBuffer()),midi);
 for(const suffix of ['?path=../outside.mid','/file?path=../outside.mid','/%2e%2e%2foutside.mid','/file/anything']) {
  assert.equal((await fetch(base+'/clave-sol/midi-test'+suffix)).status,400);
 }
 assert.equal((await fetch(base+meta.url,{method:'POST'})).status,400);
});

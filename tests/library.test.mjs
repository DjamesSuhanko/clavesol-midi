import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createLibraryRoute} from '../vendor/spessasynth/src/server/midi_library.ts';
const midi=Buffer.from('4d546864000000060000000100604d54726b0000000400ff2f00','hex');
test('library lists sample, plays/downloads original bytes and confines IDs/links',async t=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'clave-library-'));t.after(()=>fs.rm(tmp,{recursive:true,force:true}));
 const root=path.join(tmp,'source');await fs.mkdir(root);
 await fs.writeFile(path.join(root,'Canção.mid'),midi);await fs.writeFile(path.join(tmp,'outside.mid'),midi);
 const route=createLibraryRoute(root,[{id:'m01',title:'Canção',composer:'Teste',relativePath:'Canção.mid'},{id:'m02',title:'Missing',composer:'Teste',relativePath:'missing.mid'}]);
 const server=http.createServer(async(req,res)=>{if(!await route(req,res)){res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}/clave-sol/library`;
 const list=await(await fetch(base)).json();assert.equal(list.length,2);assert.equal(list[0].fileName,'Canção.mid');assert.equal(list[0].relativePath,undefined);
 for(const action of ['file','download']){
  const response=await fetch(`${base}/m01/${action}`);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),midi);
  if(action==='download') assert.match(response.headers.get('content-disposition'),/attachment;.*Can%C3%A7%C3%A3o.mid/);
 }
 assert.equal((await fetch(`${base}/m02/file`)).status,404);
 assert.equal((await fetch(`${base}/unknown/file`)).status,404);
 for(const suffix of ['/m01/file?path=../outside.mid','/%2e%2e%2foutside.mid/file','/m01/download/extra'])assert.equal((await fetch(base+suffix)).status,400);
 assert.equal((await fetch(`${base}/m01/file`,{method:'POST'})).status,400);
 await fs.unlink(path.join(root,'Canção.mid'));await fs.symlink(path.join(tmp,'outside.mid'),path.join(root,'Canção.mid'));
 assert.equal((await fetch(`${base}/m01/file`)).status,404);
 assert.equal((await fetch(`${base}/m01/download`)).status,404);
});
test('sample index has 18 unique IDs across composers and relative MIDI paths',async()=>{
 const entries=JSON.parse(await fs.readFile(new URL('../vendor/spessasynth/library-sample.json',import.meta.url)));
 assert.equal(entries.length,18);assert.equal(new Set(entries.map(x=>x.id)).size,18);
 assert.ok(new Set(entries.map(x=>x.composer)).size>=15);
 for(const entry of entries){assert.match(entry.id,/^[a-z0-9]+$/);assert.equal(path.isAbsolute(entry.relativePath),false);assert.match(entry.relativePath,/\.midi?$/i);}
});

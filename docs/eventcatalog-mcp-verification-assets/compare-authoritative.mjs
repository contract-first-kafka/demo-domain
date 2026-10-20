import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import YAML from '../../eventcatalog/node_modules/yaml/dist/index.js';
import crypto from 'node:crypto';
const evidence=JSON.parse(fs.readFileSync(process.argv[2]));
const sources=[['order-events','d7f07e4de1ced076db9f3bbfb1a43e6ce0562a62'],['inventory-reservations','33e7919bcf5a4b08c6a75206d793930a07173430']];
const results=[];
for(const [name,sha] of sources){
 const raw=execFileSync('git',['-C',`order-fulfillment-${name}-api`,'show',`${sha}:specification.yaml`],{encoding:'utf8'});
 const doc=YAML.parse(raw),id=`order-fulfillment--${name}`;
 const contract=evidence.calls.find(c=>c.name==='getSchemaForResource'&&c.args.resourceId===id).data[0].code;
 assert.deepEqual(YAML.parse(contract),doc);assert.equal(contract.trimEnd(),raw.trimEnd());
 const resolve=x=>x?.$ref?x.$ref.slice(2).split('/').reduce((o,k)=>o[k],doc):x;
 // The native AsyncAPI parser dereferences local schemas and adds provenance IDs.
 const normalize=x=>Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.entries(resolve(x)).filter(([k])=>k!=='x-parser-schema-id').map(([k,v])=>[k,normalize(v)])):x;
 const relation=evidence.calls.find(c=>c.name==='getMessagesProducedOrConsumedByResource'&&c.args.resourceId===id).data;
 for(const [action,key] of [['send','sends'],['receive','receives']]) {
  const expected=[...new Set(Object.values(doc.operations).filter(op=>op.action===action).flatMap(op=>op.messages.map(m=>`${id}-${m.$ref.split('/').at(-1)}`)))].sort();
  assert.deepEqual(relation[key].map(m=>m.id).sort(),expected);
 }
 assert.ok(evidence.domain.data.services.some(s=>s.id===id));
 const events=[];
 for(const channel of Object.values(doc.channels))for(const [key,ref] of Object.entries(channel.messages)){
  const eventId=`${id}-${key}`;
  const call=evidence.calls.find(c=>c.name==='getSchemaForResource'&&c.args.resourceId===eventId);
  assert.ok(call,eventId);
  const message=resolve(ref),payload=resolve(message.payload),schema=resolve(payload.schema||payload);
  assert.deepEqual(normalize(JSON.parse(call.data[0].code)),normalize(schema));
  if(!events.includes(eventId))events.push(eventId);
 }
 results.push({repository:`order-fulfillment-${name}-api`,commit:sha,semanticEquality:true,normalizedTextEquality:true,declaredRelationshipsMatch:true,sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),schemas:events});
}
console.log(JSON.stringify(results,null,2));

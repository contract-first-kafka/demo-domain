import fs from 'node:fs';
import crypto from 'node:crypto';
import {Client, StreamableHTTPClientTransport} from '../../eventcatalog/node_modules/@modelcontextprotocol/client/dist/index.mjs';
const client=new Client({name:'cf-idp-e2e',version:'1.0.0'});
const result={endpoint:process.argv[2],checkedAt:new Date().toISOString(),calls:[]};
result.protocol=[];
const tracedFetch=async(url,options)=>{
 const request=typeof options?.body==='string'?JSON.parse(options.body):undefined;
 const response=await fetch(url,options);
 result.protocol.push({httpMethod:options?.method||'GET',method:request?.method,protocolVersion:request?.params?.protocolVersion,status:response.status});
 return response;
};
await client.connect(new StreamableHTTPClientTransport(new URL(result.endpoint),{fetch:tracedFetch}));
result.server=client.getServerVersion();result.capabilities=client.getServerCapabilities();result.tools=(await client.listTools()).tools;result.resources=await client.listResources();
async function call(name,args){const response=await client.callTool({name,arguments:args});if(response.isError)throw Error(name+': '+JSON.stringify(response));const data=JSON.parse(response.content.find(c=>c.type==='text').text);result.calls.push({name,args,data});return data;}
for(const collection of ['domains','systems','services','events','channels'])await call('getResources',{collection});
const services=result.calls.find(c=>c.args.collection==='services').data.resources;
for(const svc of services){
 await call('getResource',{collection:'services',id:svc.id});
 await call('getMessagesProducedOrConsumedByResource',{resourceCollection:'services',resourceId:svc.id});
 const schemas=await call('getSchemaForResource',{resourceCollection:'services',resourceId:svc.id});
 if(!Array.isArray(schemas)||!schemas.some(s=>s.code.includes('asyncapi:')))throw Error('Missing AsyncAPI specification');
 for(const s of schemas)s.sha256=crypto.createHash('sha256').update(s.code).digest('hex');
}
const events=result.calls.find(c=>c.args.collection==='events').data.resources;
for(const event of events){
 const schemas=await call('getSchemaForResource',{resourceCollection:'events',resourceId:event.id});
 if(!Array.isArray(schemas)||!schemas.some(s=>s.code))throw Error('Missing message schema');
 await call('getProducersOfMessage',{messageId:event.id,messageCollection:'events'});
 await call('getConsumersOfMessage',{messageId:event.id,messageCollection:'events'});
}
result.domain=await call('getResource',{collection:'domains',id:'demo'});
result.diagram=await call('showResource',{view:'architecture',resourceCollection:'domains',resourceId:'demo'});
result.schemaView=await call('showResource',{view:'schema',resourceCollection:'events',resourceId:'order-fulfillment--order-events-accepted'});
result.all=await client.readResource({uri:'eventcatalog://all'});
await client.close();
fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));
console.log(JSON.stringify({server:result.server,tools:result.tools.length,calls:result.calls.length,services:services.length,events:events.length}));

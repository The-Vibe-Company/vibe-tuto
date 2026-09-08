#!/usr/bin/env node
// All localhost interactions run through agent-browser. Uses the signed-in browser
// session and creates only its own fixture/token; --cleanup removes those fixtures.
import { execFileSync } from 'node:child_process';
const session = process.env.CAPTUTO_BROWSER_SESSION || 'captuto-audit';
function evaluate(fn) {
  let raw;
  try { raw = execFileSync('agent-browser',['--session',session,'--json','eval',`(${fn.toString()})()`],{encoding:'utf8',maxBuffer:5*1024*1024}); } catch(error) {
    const output = JSON.parse(error.stdout || '{}');
    throw new Error(output.error || 'agent-browser failed');
  }
  const result=JSON.parse(raw);
  if (!result.success) throw new Error(result.error);
  return result.data.result;
}
if (process.argv.includes('--cleanup')) {
  console.log(evaluate(async()=>{
    const state=JSON.parse(sessionStorage.getItem('captuto-smoke') || 'null');
    if (!state) return {cleaned:false};
    const tutorial=await fetch(`/api/tutorials/${state.id}`,{method:'DELETE'});
    const token=await fetch(`/api/tokens?id=${state.tokenId}`,{method:'DELETE'});
    if ((!tutorial.ok && tutorial.status !== 404) || !token.ok) throw new Error('Fixture cleanup failed');
    sessionStorage.removeItem('captuto-smoke');return {cleaned:true};
  }));
  process.exit(0);
}
console.log(evaluate(async()=>{
  if (sessionStorage.getItem('captuto-smoke')) throw new Error('Run --cleanup before another smoke run');
  const res=await fetch('/api/tokens',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Captuto smoke fixture (temporary)'})});
  if (!res.ok) throw new Error('Sign in through agent-browser first');
  const token=await res.json();
  const id=crypto.randomUUID();
  const state={id,token:token.token,tokenId:token.id,stepId:crypto.randomUUID()};
  sessionStorage.setItem('captuto-smoke',JSON.stringify(state));
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=700;
  const c=canvas.getContext('2d');c.fillStyle='#fbf8f2';c.fillRect(0,0,1200,700);
  c.fillStyle='#232522';c.font='bold 44px sans-serif';c.fillText('Companion — Your workspace',64,90);
  c.font='26px sans-serif';c.fillText('Start your first conversation',64,155);
  c.fillStyle='#e36951';c.fillRect(700,320,320,80);c.fillStyle='#ffffff';c.font='bold 28px sans-serif';c.fillText('New companion',745,372);
  const payload={recording:{client_id:id,title:'Guide de prise en main de Companion — test',duration:4,started_at:new Date().toISOString()},steps:[{order_index:0,timestamp:1000,action_type:'click',screenshot_key:'fixture.jpg',screenshot_data:canvas.toDataURL('image/jpeg').split(',')[1],click_x:0.72,click_y:0.52,viewport_width:1200,viewport_height:700}]};
  const headers={'Content-Type':'application/json',Authorization:`Bearer ${state.token}`};
  for(let i=0;i<2;i++) {
    const upload=await fetch('/api/recordings',{method:'POST',headers,body:JSON.stringify(payload)});
    if(!upload.ok) throw new Error(`Upload failed: ${await upload.text()}`);
    const body=await upload.json();if(body.tutorialId!==id) throw new Error('Retry changed recording ID');
  }
  // A small valid PCM WAV verifies binary upload without external speech services.
  const bytes=new Uint8Array(44+1600);const view=new DataView(bytes.buffer);
  const str=(o,s)=>{for(let i=0;i<s.length;i++)bytes[o+i]=s.charCodeAt(i);};
  str(0,'RIFF');view.setUint32(4,bytes.length-8,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,1600,true);
  const form=new FormData();form.set('file',new File([bytes],'narration.wav',{type:'audio/wav'}));
  const audio=await fetch(`/api/recordings/${id}/audio`,{method:'POST',headers:{Authorization:`Bearer ${state.token}`},body:form});
  if(!audio.ok)throw new Error(`Audio failed: ${await audio.text()}`);
  return {recordingId:id,uploadRetry:'same recording',audio:'uploaded'};
}));
console.log(evaluate(async()=>{
  const s=JSON.parse(sessionStorage.getItem('captuto-smoke'));
  const headers={'Content-Type':'application/json',Accept:'application/json, text/event-stream',Authorization:`Bearer ${s.token}`};
  let sequence=1;
  async function rpc(method,params) {
    const r=await fetch('/api/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:sequence++,method,params})});
    if(!r.ok)throw new Error(`MCP HTTP ${r.status}: ${await r.text()}`);
    const body=await r.json();if(body.error)throw new Error(JSON.stringify(body.error));return body.result;
  }
  async function tool(name,args){const r=await rpc('tools/call',{name,arguments:args});if(r.isError)throw new Error(JSON.stringify(r));return r;}
  await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'captuto-smoke',version:'1'}});
  const tools=await rpc('tools/list',{});
  const read=JSON.parse((await tool('read_tutorial',{tutorialId:s.id})).content[0].text);
  if(read.sources.length!==1 || !read.audioUrl)throw new Error('Sources/audio missing or retry duplicated sources');
  const audio=await fetch(read.audioUrl);if(!audio.ok)throw new Error('Audio URL does not resolve');
  const step={id:s.stepId,source_id:read.sources[0].id,order_index:0,step_type:'image',text_content:'Créer votre premier compagnon',description:'Cliquez sur New companion pour ouvrir la création de votre assistant.',annotations:[{id:'box',type:'rectangle',x:0.57,y:0.44,width:0.3,height:0.15,color:'#d9462f'},{id:'arrow',type:'arrow',x:0.4,y:0.65,endX:0.59,endY:0.53,color:'#d9462f'}]};
  await tool('save_steps',{tutorialId:s.id,steps:[step]});
  const preview=await tool('preview_step',{tutorialId:s.id,stepId:s.stepId});
  if(preview.content[0].type!=='image' || preview.content[0].data.length<1000)throw new Error('No preview image');
  step.annotations[1].endX=0.6;
  await tool('save_steps',{tutorialId:s.id,steps:[step]});
  const corrected=await tool('preview_step',{tutorialId:s.id,stepId:s.stepId});
  if(corrected.content[0].data===preview.content[0].data)throw new Error('Correction did not change rendered image');
  const invalid=await rpc('tools/call',{name:'save_steps',arguments:{tutorialId:s.id,steps:[{...step,annotations:[{id:'bad',type:'rectangle',x:0.95,y:0,width:0.5,height:0.2}]}]}});
  if(!invalid.isError)throw new Error('Invalid geometry accepted');
  const unrelated=await rpc('tools/call',{name:'read_tutorial',arguments:{tutorialId:crypto.randomUUID()}});
  if(!unrelated.isError)throw new Error('Missing tutorial not rejected');
  const pdf=await tool('export_pdf',{tutorialId:s.id});
  if(atob(pdf.content[0].resource.blob).slice(0,5)!=='%PDF-')throw new Error('Not a PDF artifact');
  const shared=JSON.parse((await tool('share_tutorial',{tutorialId:s.id,visibility:'link_only'})).content[0].text);
  s.shareUrl=shared.url;sessionStorage.setItem('captuto-smoke',JSON.stringify(s));
  return {toolCount:tools.tools.length,preview:'image changed after correction',invalidGeometry:'rejected',pdf:'valid PDF artifact',shareUrl:shared.url};
}));

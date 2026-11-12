const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const $ = id => document.getElementById(id);
const preferences={get(key){try{return localStorage.getItem(key)}catch{return null}},set(key,value){try{localStorage.setItem(key,value)}catch{}}};
const visit={seen(){try{return sessionStorage.getItem('hemant:intro-seen')==='1'}catch{return false}},mark(){try{sessionStorage.setItem('hemant:intro-seen','1')}catch{}}};
let introCancelled=false;
const introSelectors=['.outline-title','.hello','h1','.portrait','.role','.hero-copy','.hero-links','.hero-metrics'];
const buildItems=introSelectors.map(selector=>document.querySelector('#home '+selector));
buildItems.forEach(el=>el.setAttribute('data-intro',''));
const scenes=[document.querySelector('#home')];
const sceneNames=['Building your first impression'];
const schedule=buildItems.map(el=>({el,scene:0,done:false,finished:false}));
const crewSize=2;
let batch=[], batchReadyAt=0, sceneCompletedAt=0;
function taskKind(el){return el.matches('figure,article,.project-metrics,.layers,.filters,.contact-line,.hero-links')?'PLACE':el.matches('h1,h2,h3,p,blockquote,.outline-title')?'WRITE':'DRAW';}
let building=false, buildPaused=false, motionPaused=reduced.matches||preferences.get("hemant:motion")==="off", elapsed=0, activeScene=-1, finishedCount=0;
const colors = ['#72d7e7','#cca3f4','#f0ce8a','#a1dfc2','#f39cad','#dbe6f6'];
const finePointer = matchMedia('(pointer:fine)');
const agentCount = matchMedia('(max-width:600px)').matches ? 12 : 24;
const field=$('cursor-field'), overlay=$('construction-overlay');
const agents=Array.from({length:agentCount},(_,i)=>{
  const el=document.createElement('div');el.className='agent-cursor';
  const color=colors[i%colors.length];el.style.color=color;el.style.setProperty('--agent-color',color);
  el.innerHTML='<svg viewBox="0 0 24 30"><path d="M3 2L21 17L12.5 18L9 26Z" fill="currentColor" stroke="#09090b" stroke-width="1.2" stroke-linejoin="round"/></svg><span>'+['LAYOUT','TYPE','STYLE'][i%3]+' '+String(i+1).padStart(2,'0')+'</span>';
  field.append(el);
  return {el,color,x:Math.random()*innerWidth,y:Math.random()*innerHeight,vx:0,vy:0,tx:Math.random()*innerWidth,ty:Math.random()*innerHeight,next:0,phase:i/agentCount*Math.PI*2,drift:.35+Math.random()*.6,radius:30+Math.random()*75,response:6+Math.random()*5,size:.65+Math.random()*.35};
});
const pointer={active:false,x:0,y:0,movedAt:0,history:[]};
addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  if(!pointer.active||e.clientX!==pointer.x||e.clientY!==pointer.y){pointer.active=true;pointer.x=e.clientX;pointer.y=e.clientY;pointer.movedAt=performance.now();pointer.history.push({x:e.clientX,y:e.clientY,t:pointer.movedAt});pointer.history=pointer.history.filter(p=>pointer.movedAt-p.t<900).slice(-90)}
},{passive:true});
function releasePointer(){pointer.active=false;pointer.history=[];agents.forEach(a=>a.next=0)}
document.documentElement.addEventListener('pointerleave',releasePointer);addEventListener('blur',releasePointer);
let highlights=[];
function addHighlight(item,index){
  const frame=document.createElement('div');frame.className='selection-frame';frame.style.setProperty('--agent-color',agents[index].color);
  const label=document.createElement('span');label.textContent=item.kind+' '+String(index+1).padStart(2,'0');frame.append(label);overlay.append(frame);
  const h={frame,el:item.el,item};highlights.push(h);item.highlight=h;
}
function updateFrames(){
 highlights=highlights.filter(h=>{if(!building||h.item.finished&&elapsed-h.item.completedAt>260){h.frame.remove();return false}const r=h.el.getBoundingClientRect();h.frame.style.transform=`translate3d(${r.left-4}px,${r.top-3}px,0)`;h.frame.style.width=(r.width+8)+'px';h.frame.style.height=(r.height+6)+'px';h.frame.style.opacity=h.item.state==='travel'?'0.35':'1';return true});
}
function updateConsole(){
  const percent=building?finishedCount/schedule.length*100:100;
  $('build-progress').style.width=percent+'%';document.querySelector('.console-meter').setAttribute('aria-valuenow',Math.round(percent));
  if(building){$('build-status').textContent=(buildPaused?'Paused · ':'' )+sceneNames[Math.max(0,activeScene)];$('build-detail').textContent=`${crewSize} builders · ${finishedCount}/${schedule.length} elements placed`;}
}
function finishBuild(skipped=false){
  if(!building){introCancelled=true;return;}
  visit.mark();
  building=false;buildPaused=false;document.body.classList.remove('building','build-paused');
  buildItems.forEach(el=>{el.classList.remove('assembling');el.classList.add('assembled');el.style.removeProperty('--build-reveal')});
  highlights.forEach(h=>h.frame.remove());highlights=[];agents.forEach(a=>{a.el.classList.remove('working','building-agent','pressing');a.el.style.opacity='';a.task=null;a.next=0});
  $('build-pause').hidden=true;$('build-skip').hidden=true;$('build-replay').hidden=false;
  $('build-status').textContent=skipped?'Portfolio ready':'Visual build complete';
  $('build-detail').textContent=skipped?`${agentCount} cursors · follow & hover`:`${schedule.length} elements built · explore the portfolio`;
  updateConsole();
}
function startBuild(){
  if(reduced.matches){$('build-status').textContent='Portfolio ready';$('build-detail').textContent='Reduced motion enabled';$('build-pause').hidden=true;$('build-skip').hidden=true;$('build-replay').hidden=true;updateConsole();return;}
  motionPaused=false;setMotion();
  building=true;buildPaused=false;elapsed=0;activeScene=-1;finishedCount=0;batch=[];batchReadyAt=0;sceneCompletedAt=0;
  agents.forEach((a,i)=>{a.task=null;a.el.classList.toggle('building-agent',i<crewSize);a.el.style.opacity=i<crewSize?'1':'0';a.x=innerWidth/2+(i-1)*35;a.y=innerHeight-85;a.vx=0;a.vy=0});
  document.body.classList.remove('build-paused');
  document.dispatchEvent(new Event('portfolio:reset-search'));
  document.querySelectorAll('[data-category]').forEach(card=>card.hidden=false);
  document.querySelectorAll('[data-filter]').forEach(b=>{const all=b.dataset.filter==='all';b.classList.toggle('active',all);b.setAttribute('aria-pressed',all)});
  highlights.forEach(h=>h.frame.remove());highlights=[];
  schedule.forEach(item=>{item.done=false;item.finished=false;item.state='queued';item.el.style.removeProperty('--build-reveal');item.el.classList.remove('assembling','assembled')});
  document.body.classList.add('building');
  $('build-pause').hidden=false;$('build-skip').hidden=false;$('build-replay').hidden=true;
  $('build-pause').textContent='Ⅱ';$('build-pause').setAttribute('aria-label','Pause build animation');
  scrollTo({top:0,behavior:'instant'});updateConsole();
}
$('build-skip').addEventListener('click',()=>finishBuild(true));
$('build-replay').addEventListener('click',startBuild);
$('build-pause').addEventListener('click',()=>{buildPaused=!buildPaused;$('build-pause').textContent=buildPaused?'▷':'Ⅱ';$('build-pause').setAttribute('aria-label',buildPaused?'Resume build animation':'Pause build animation');document.body.classList.toggle('build-paused',buildPaused);updateConsole()});
function setMotion(){
  $('motion-toggle').setAttribute('aria-pressed',motionPaused);$('motion-toggle').setAttribute('aria-label',motionPaused?'Resume cursor motion':'Pause cursor motion');$('motion-toggle').textContent=motionPaused?'Motion off':'Motion on';document.body.classList.toggle('motion-off',motionPaused);
}
$('motion-toggle').addEventListener('click',()=>{motionPaused=!motionPaused;preferences.set('hemant:motion',motionPaused?'off':'on');if(motionPaused)finishBuild(true);setMotion()});setMotion();
reduced.addEventListener('change',e=>{motionPaused=e.matches||preferences.get("hemant:motion")==="off";setMotion();if(e.matches){finishBuild(true);$('build-replay').hidden=true;}else $('build-replay').hidden=false});
// A visitor's navigation takes priority over the guided visual sequence.
addEventListener('wheel',()=>finishBuild(true),{passive:true});addEventListener('touchstart',e=>{if(!e.target.closest('.build-console'))finishBuild(true)},{passive:true});
addEventListener('keydown',e=>{if(['Escape','PageDown','PageUp','ArrowDown','ArrowUp','Home','End','Tab'].includes(e.key))finishBuild(true)});
const nav=document.querySelector('nav');$('menu').addEventListener('click',()=>{finishBuild(true);const open=nav.classList.toggle('open');$('menu').setAttribute('aria-expanded',open);$('menu').textContent=open?'✕':'☰'});
document.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{finishBuild(true);nav.classList.remove('open');$('menu').setAttribute('aria-expanded','false');$('menu').textContent='☰'}));
const layers=[
 ['LAYER 01 // DYNAMIC CONFIGURATION','Build only what changed.','Path filtering detects which service changed. CircleCI continuation selects the relevant workflow so unaffected services do not rebuild.',['PATH FILTERING','CONTINUATION ORB']],
 ['LAYER 02 // SECURITY GATES','Check the source before the build.','TruffleHog scans for exposed secrets and Semgrep checks code patterns. These checks run alongside tests, and required jobs must pass before the build proceeds.',['TRUFFLEHOG','SEMGREP','PARALLEL CHECKS']],
 ['LAYER 03 // TEST MATRIX','Test across Python versions.','CircleCI matrix jobs run the service tests with Python 3.10 and 3.11. Both jobs must succeed before the next stage.',['PYTEST','PYTHON 3.10','PYTHON 3.11']],
 ['LAYER 04 // CONTAINER BUILD','Package, scan, and identify.','Docker packages the service. Trivy scans the image for vulnerabilities, with critical findings blocking the pipeline. A Git SHA tag traces the image to its source commit.',['DOCKER','TRIVY','GIT SHA']],
 ['LAYER 05 // AZURE DEPLOYMENT','Deploy through an environment context.','The dev branch updates Azure Container Apps through a CircleCI environment context. Terraform defines the infrastructure and uses remote state. Production approval is listed as future work.',['AZURE CONTAINER APPS','TERRAFORM','CIRCLECI CONTEXT']]
];
const layerButtons=[...document.querySelectorAll('[data-layer]')];
function selectLayer(button){finishBuild(true);const data=layers[+button.dataset.layer];layerButtons.forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-selected',b===button);b.tabIndex=b===button?0:-1});$('layer-kicker').textContent=data[0];$('layer-title').textContent=data[1];$('layer-copy').textContent=data[2];$('layer-tags').replaceChildren(...data[3].map(t=>{const s=document.createElement('span');s.textContent=t;return s}));$('layer-detail').setAttribute('aria-labelledby',button.id)}
layerButtons.forEach((b,i)=>{b.addEventListener('click',()=>selectLayer(b));b.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%layers.length;if(e.key==='ArrowLeft')n=(i+layers.length-1)%layers.length;if(e.key==='Home')n=0;if(e.key==='End')n=layers.length-1;if(n!==undefined){e.preventDefault();selectLayer(layerButtons[n]);layerButtons[n].focus()}})});
// Project filtering is coordinated with search in refinements.js.
$('copy-contact').addEventListener('click',async()=>{finishBuild(true);const address='https://www.linkedin.com/in/hemant-deshwal';try{await navigator.clipboard.writeText(address);$('copy-feedback').textContent='Profile link copied.';$('copy-contact').textContent='✓ Copied';}catch{$('copy-feedback').textContent='Select and copy: '+address;}setTimeout(()=>{$('copy-contact').textContent='▢ Copy profile link'},2500)});
function buildTick(dt){
 if(!building||buildPaused)return;
 elapsed+=dt*1000;
 if(elapsed>=8000){finishBuild();return;}
 if(activeScene<0){activeScene=0;batchReadyAt=elapsed+160;}
 if(batch.length&&batch.every(item=>item.finished)){
   if(!sceneCompletedAt)sceneCompletedAt=elapsed;
   if(elapsed-sceneCompletedAt<300){updateFrames();return}
   batch=[];sceneCompletedAt=0;
 }
 if(!batch.length){
   let queued=schedule.filter(item=>item.scene===activeScene&&!item.done);
   if(!queued.length){activeScene++;if(activeScene>=scenes.length){finishBuild();return}queued=schedule.filter(item=>item.scene===activeScene&&!item.done);}

   // Pair deliberate hero tasks; the rest of the portfolio is already readable.
   batch=queued.slice(0,crewSize);

   // The intro never scrolls the visitor away from the hero.
   batchReadyAt=elapsed+180;
   batch.forEach((item,i)=>{item.done=true;item.state='travel';item.kind=taskKind(item.el);item.progress=0;item.agent=agents[i];agents[i].task=item;agents[i].el.classList.add('working');agents[i].el.querySelector('span').textContent=item.kind+' '+String(i+1).padStart(2,'0');item.el.style.setProperty('--build-reveal','0%');addHighlight(item,i)});
 }
 batch.forEach(item=>{
   const a=item.agent,r=item.el.getBoundingClientRect();
   if(item.state==='travel'&&elapsed>=batchReadyAt&&Math.hypot(a.x-r.left,a.y-r.top)<14){item.state='work';item.startedAt=elapsed;item.el.classList.add('assembling');a.el.classList.add('pressing');}
   if(item.state==='work'){
     const duration=1100;
     item.progress=Math.min(1,(elapsed-item.startedAt)/duration);
     item.el.style.setProperty('--build-reveal',(item.progress*100)+'%');
     item.highlight.frame.querySelector('span').textContent=item.kind+' '+Math.round(item.progress*100)+'%';
     if(item.progress===1){item.state='done';item.finished=true;item.completedAt=elapsed;finishedCount++;item.el.classList.remove('assembling');item.el.classList.add('assembled');item.el.style.removeProperty('--build-reveal');item.highlight.frame.querySelector('span').textContent='✓ PLACED';a.el.querySelector('span').textContent='✓ DONE';a.el.classList.remove('pressing');a.task=null;}
   }
 });
 updateFrames();updateConsole();
}
function moveBuilders(dt){
 agents.forEach((a,i)=>{
   if(i>=crewSize)return;
   const item=a.task;
   if(item){const r=item.el.getBoundingClientRect();const p=item.state==='work'?item.progress:0;a.tx=r.left+r.width*p;a.ty=r.top+(item.kind==='PLACE'?r.height*p:0);}
   else {a.tx=innerWidth/2+(i-1)*38;a.ty=innerHeight-82;}
   const ease=1-Math.exp(-dt*22);a.x+=(a.tx-a.x)*ease;a.y+=(a.ty-a.y)*ease;
   a.el.style.transform=`translate3d(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px,0) scale(1.15)`;
 });
}
let clock=0;
function moveAgents(dt,now){
  if(motionPaused||(building&&buildPaused)||document.querySelector('dialog[open]'))return;if(building){moveBuilders(dt);return;}clock+=dt;
  const rest=Math.max(0,Math.min(1,(now-pointer.movedAt-100)/600)),hover=rest*rest*(3-2*rest);
  agents.forEach((a,i)=>{
    let tracking=false;
    if(pointer.active){
      a.el.classList.remove('working');tracking=true;
      const angle=a.phase+clock*a.drift;
      const radius=(8+i*.75)*(1-hover)+(a.radius+Math.sin(clock*1.3+a.phase)*13)*hover;
      const history=pointer.history;const past=history.length?history[Math.max(0,history.length-1-Math.floor(i*1.7))]:pointer;
      const cx=pointer.x*hover+past.x*(1-hover),cy=pointer.y*hover+past.y*(1-hover);
      a.tx=cx+Math.cos(angle)*radius+Math.sin(clock*.7+a.phase*2)*13*hover;
      a.ty=cy+Math.sin(angle)*radius*.75+Math.cos(clock*.9+a.phase)*9*hover;
    } else {
      a.el.classList.remove('working');if(now>a.next||Math.hypot(a.tx-a.x,a.ty-a.y)<20){a.tx=25+Math.random()*(innerWidth-50);a.ty=90+Math.random()*Math.max(30,innerHeight-170);a.next=now+1500+Math.random()*3500}
    }
    const x=Math.max(6,Math.min(innerWidth-22,a.tx)),y=Math.max(7,Math.min(innerHeight-60,a.ty));const dx=x-a.x,dy=y-a.y,d=Math.hypot(dx,dy)||1;
    const speed=tracking?Math.min(1700,d*a.response):35+i*1.2;const ease=1-Math.exp(-dt*(tracking?10:2));
    a.vx+=(dx/d*speed-a.vx)*ease;a.vy+=(dy/d*speed-a.vy)*ease;a.x+=a.vx*dt;a.y+=a.vy*dt;
    const rotation=Math.sin(clock*.7+a.phase)*10+Math.max(-22,Math.min(22,a.vx*.035));
    a.el.style.transform=`translate3d(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px,0) rotate(${rotation.toFixed(1)}deg) scale(${a.size})`;
  });
}
let previous=0;
function tick(now){const realDt=previous?(now-previous)/1000:.016;const dt=Math.min(realDt,.05);previous=now;if(document.visibilityState==='visible'){buildTick(Math.min(realDt,1));if(!reduced.matches)moveAgents(dt,now)}requestAnimationFrame(tick)}
// Start after fonts and the profile artwork settle, without hiding content on failure.
let introInitialized=false;
function initializePortfolio(){if(introInitialized)return;introInitialized=true;
 const directSection=location.hash&&location.hash!=='#home';
 if(visit.seen()||directSection||introCancelled||motionPaused||reduced.matches){building=true;finishBuild(true);if(reduced.matches){$('build-replay').hidden=true;$('build-detail').textContent='Reduced motion enabled';}}
 else startBuild();
 requestAnimationFrame(tick);
}
Promise.race([Promise.all([document.fonts.ready,$('home').querySelector('img').decode().catch(()=>{})]),new Promise(resolve=>setTimeout(resolve,1200))]).then(initializePortfolio);

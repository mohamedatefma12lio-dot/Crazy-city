'use strict';
/* =====================================================================
   حرامي وظابط – مطاردة في القاهرة
   لعبة 2D كاملة بدون أي مكتبات. كل حاجة في الملف ده.
   ===================================================================== */

/* ---------- أدوات عامة ---------- */
const $=id=>document.getElementById(id);
const IS_TOUCH='ontouchstart' in window||navigator.maxTouchPoints>0;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const R=(a,b)=>a+Math.random()*(b-a);
const RI=(a,b)=>Math.floor(R(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function angDiff(a,b){let d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;}
function rectDist(r,x,y){const dx=Math.max(r.x-x,0,x-(r.x+r.w)),dy=Math.max(r.y-y,0,y-(r.y+r.h));return Math.hypot(dx,dy);}

const cv=$('cv'),ov=$('ov'),ctx=ov.getContext('2d');
const mini=$('mini'),mctx=mini.getContext('2d');
let VW=0,VH=0,DPR=1,zoom=1;
let renderer=null,scene=null,camera=null;
function resize(){DPR=Math.min(3,window.devicePixelRatio||1);VW=innerWidth;VH=innerHeight;ov.width=Math.round(VW*Math.min(2,DPR));ov.height=Math.round(VH*Math.min(2,DPR));
  if(renderer){renderer.setPixelRatio(QPR());renderer.setSize(VW,VH,false);camera.aspect=VW/VH;camera.fov=VW/VH<1.2?78:62;camera.updateProjectionMatrix();}}
addEventListener('resize',resize);resize();

let AC=null;
function beep(f,d,type,v){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.type=type||'square';o.frequency.value=f||440;g.gain.value=v||.04;o.connect(g);g.connect(AC.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+(d||.12));o.stop(AC.currentTime+(d||.12));}catch(e){}}

/* ---------- حفظ التقدم ---------- */
let SAVE={max:0,stars:{},q:null};
try{const s=localStorage.getItem('cairoHeist');if(s)SAVE=Object.assign(SAVE,JSON.parse(s));}catch(e){}
function saveGame(){try{localStorage.setItem('cairoHeist',JSON.stringify(SAVE));}catch(e){}}

/* ---------- تعريف الخرايط (5 مناطق) ----------
   كل منطقة ليها شكل شوارع وأنواع ناس وثروة وشجاعة متفرجين مختلفة.
   الـseed بيثبّت شكل الشوارع. أما الناس فبتتوزع عشوائي في كل مرة.
   لو عايز الشوارع كمان تتغير كل مرة: غيّر seed:11 لـ seed:Math.random()*1e6 */
const T=(n,col,spd,w,cash,brave,mode,where)=>({n,col,spd,w,cash,brave,mode,where});
const MAPS=[
{id:'faisal',name:'فيصل',emoji:'🚌',seed:11,cols:10,rows:7,bw:290,bh:250,rw:66,
 road:'#3b3b40',pave:'#8f8777',parkCol:'#5d8a4a',open:null,
 pal:['#b5835a','#a0522d','#c49a6c','#8d6e63','#9c6b4e','#7b5e57'],
 density:.9,park:.03,plaza:.14,split:.7,wealth:.7,npc:64,patrol:0,brave:.3,
 hideName:'ورشة خردة',stall:['#ffd600','#ef5350','#42a5f5'],
 errands:[['ماكينة الصرافة',1],['السوبر ماركت',0],['موقف الميكروباص',0],['ماكينة الصرافة',1],['البيت',0]],
 desc:'شارع فيصل: زحمة ميكروباصات وباعة وناس مالهاش آخر. الشوارع ضيقة، الزحمة بتخبّيك وفي نفس الوقت بتعطّلك. الفلوس هنا قليلة بس الفرص كتير.',
 types:[T('عامل','#4e6b8a',58,3,[20,70],.3,'walk'),T('بياع','#c0392b',0,2,[40,120],.4,'stay'),T('سواق ميكروباص','#f1c40f',0,1.5,[60,160],.5,'stay'),T('طالب','#27ae60',70,2,[5,30],.3,'walk'),T('ست','#8e44ad',55,2.2,[30,100],.35,'walk'),T('عيّل','#ff7043',95,1,[0,0],0,'jog')]},
{id:'dokki',name:'الدقي',emoji:'🌉',seed:22,cols:10,rows:7,bw:300,bh:260,rw:70,
 road:'#3d3f46',pave:'#a8a39a',parkCol:'#5f9a52',open:null,water:'right',
 pal:['#8d99ae','#adb5bd','#9fb3c8','#b0a99f','#7d8597','#c4b8a5'],
 density:.8,park:.1,plaza:.06,split:.6,wealth:1,npc:46,patrol:0,brave:.4,
 hideName:'عمارة قديمة',stall:['#80deea','#ffab91','#a5d6a7'],
 errands:[['ماكينة الصرافة',1],['الجامعة',0],['كافيه النيل',0],['ماكينة الصرافة',1],['البيت',0]],
 desc:'الدقي: موظفين وطلبة وكافيهات على الكورنيش والنيل في آخر الخريطة. ناس أغنى شوية، وبيبلّغوا أسرع.',
 types:[T('موظف','#34495e',60,3,[60,200],.35,'walk'),T('طالبة','#e91e63',62,2,[20,90],.3,'walk'),T('قاعد في كافيه','#795548',0,1.3,[80,250],.4,'stay'),T('جوجر','#00bcd4',100,1,[10,60],.5,'jog'),T('دكتور','#cfd8dc',58,1.2,[100,300],.4,'walk')]},
{id:'giza',name:'الجيزة',emoji:'🔺',seed:33,cols:10,rows:7,bw:300,bh:260,rw:70,
 road:'#44413c',pave:'#b5a98a',parkCol:'#6a9a4e',open:'#d9c18a',
 skip:(i,j)=>i>=6&&j<=1,desert:true,
 pal:['#d6b97b','#c9a66b','#bfa06a','#a98c5d','#c2b280','#9c8663'],
 density:.85,park:.05,plaza:.1,split:.6,wealth:.9,npc:52,patrol:0,brave:.25,
 hideName:'خيمة مرشدين',stall:['#ff8f00','#8d6e63','#26a69a'],
 errands:[['ماكينة الصرافة',1],['بازار الهدايا',0],['موقف الأتوبيس',0],['ماكينة الصرافة',1],['الفندق',0]],
 desc:'الجيزة: الأهرامات في الركن، وسياح معاهم فلوس كتير وبيتفرجوا على أي حاجة. ناس كتير في الصحرا ومفيش بلاغات بسرعة.',
 types:[T('سائح','#ff9800',52,3.2,[150,420],.2,'walk'),T('بياع بردي','#6d4c41',0,2,[30,110],.4,'stay','pyr'),T('مرشد','#2e7d32',58,1.2,[60,180],.5,'walk'),T('عيّل','#ffb74d',90,1,[0,0],0,'jog'),T('سواق جمل','#a1887f',0,1.2,[40,140],.3,'stay','pyr')]},
{id:'maadi',name:'المعادي',emoji:'🌳',seed:44,cols:9,rows:6,bw:320,bh:280,rw:84,
 road:'#3a3d40',pave:'#b7c4a8',parkCol:'#4f9a55',open:null,
 pal:['#e8dcc8','#f2e9d8','#dfd3bd','#cfe0d0','#e5d5c0','#f0e0d0'],
 density:.62,park:.28,plaza:.05,split:.55,wealth:1.6,npc:36,patrol:1,brave:.55,
 hideName:'جراج مهجور',stall:['#a5d6a7','#fff59d','#ce93d8'],
 errands:[['ماكينة الصرافة',1],['السوبر ماركت',0],['النادي',0],['ماكينة الصرافة',1],['الفيلا',0]],
 desc:'المعادي: شوارع واسعة وحدايق وأجانب وفلوس كتير، بس الناس هنا بتبلّغ فوراً وفي دوريات إضافية. عايز تنجح؟ استخبّى في الأزقة والشجر.',
 types:[T('أجنبي','#90caf9',56,2.2,[150,500],.45,'walk'),T('جوجر','#ff5252',105,2,[20,120],.6,'jog'),T('ست وكلب','#f48fb1',52,1.6,[100,350],.5,'walk'),T('سواق خاص','#546e7a',0,1,[60,200],.5,'stay'),T('طالب مدرسة','#fff176',68,1.4,[10,60],.4,'walk')]},
{id:'alex',name:'إسكندرية',emoji:'🌊',seed:55,cols:10,rows:7,bw:300,bh:260,rw:76,
 road:'#3b4048',pave:'#c7c2ad',parkCol:'#6aa25a',open:null,water:'top',skip:(i,j)=>j===0,
 pal:['#e9e4d4','#cfd8dc','#f0e6cf','#b0c4de','#e0d6c0','#d7ccc8'],
 density:.82,park:.07,plaza:.08,split:.65,wealth:1.1,npc:50,patrol:0,brave:.3,
 hideName:'كشك على الشاطئ',stall:['#4fc3f7','#ffb74d','#f06292'],
 errands:[['ماكينة الصرافة',1],['المحطة',0],['الكورنيش',0],['ماكينة الصرافة',1],['الشقة',0]],
 desc:'إسكندرية: البحر فوق والكورنيش عامر ناس. صيادين وسياح وكبل بيتمشوا. شوارع متوسطة وفلوس كويسة.',
 types:[T('صياد','#37474f',0,2,[30,120],.3,'stay','water'),T('سائح','#ffa726',55,2,[120,350],.25,'walk'),T('بياع درة','#ef6c00',0,1.5,[30,90],.4,'stay'),T('كوبل','#f06292',45,2,[50,200],.3,'walk'),T('جوجر','#26c6da',100,1,[10,80],.5,'jog')]}
];
const LVL_NAMES=['تمهيد وجسّ نبض','الدنيا سخنت','المطاردة الكبرى'];
const LVL_TXT=['اتعرف على المنطقة. الدوريات قليلة والفرصة كويسة.','دوريات أكتر وناس بتبلّغ أسرع. خلّي بالك.','أصعب مرحلة في المنطقة. الضابط أسرع ونظره أحد.'];

/* ---------- توليد العالم ---------- */
const CS=14;
let W=null,G=null;
const worldCache={};

function genWorld(m){
  const rng=mulberry(m.seed);
  const w=m.cols*m.bw,h=m.rows*m.bh,ins=m.rw/2;
  const o={m,w,h,solids:[],hides:[],blds:[],blocks:[],bushes:[],trees:[],stalls:[],inter:[],pyr:[],water:null,desert:null,bg:null};
  W=o;
  if(m.water==='right')o.water={x:(m.cols-1)*m.bw+ins,y:0,w:w-((m.cols-1)*m.bw+ins),h:h};
  if(m.water==='top')o.water={x:0,y:0,w:w,h:m.bh-ins};
  if(o.water)o.solids.push(o.water);
  if(m.desert){
    o.desert={x:6*m.bw-ins,y:0,w:w-(6*m.bw-ins),h:2*m.bh-ins};
    [{x:6.6*m.bw,y:.3*m.bh,w:250,h:190},{x:8.3*m.bw,y:.45*m.bh,w:200,h:150},{x:7.5*m.bw,y:1.15*m.bh,w:130,h:100}].forEach(p=>{o.pyr.push(p);o.solids.push(p);});
  }
  const addB=(x,y,bw,bh,col)=>{const b={x,y,w:bw,h:bh,col,tank:rng()<.35,dish:rng()<.3};o.blds.push(b);o.solids.push(b);};
  for(let i=0;i<m.cols;i++)for(let j=0;j<m.rows;j++){
    if(m.skip&&m.skip(i,j))continue;
    const bx=i*m.bw+ins,by=j*m.bh+ins,bw=m.bw-m.rw,bh=m.bh-m.rw;
    const r=rng();let type='bld';
    if(r<m.park)type='park';else if(r<m.park+m.plaza)type='plaza';
    else if(rng()>m.density)type='plaza';
    o.blocks.push({x:bx,y:by,w:bw,h:bh,type});
    const pad=8,ix=bx+pad,iy=by+pad,iw=bw-pad*2,ih=bh-pad*2;
    if(type==='bld'){
      const col=()=>m.pal[Math.floor(rng()*m.pal.length)];
      if(rng()<m.split&&iw>=190){
        const aw=80,lw=(iw-aw)*(.35+rng()*.3);
        addB(ix,iy,lw,ih,col());o.hides.push({x:ix+lw,y:by,w:aw,h:bh});addB(ix+lw+aw,iy,iw-lw-aw,ih,col());
      }else addB(ix,iy,iw,ih,col());
    }else if(type==='park'){
      for(let k=0;k<3;k++){const b={x:ix+rng()*(iw-60),y:iy+rng()*(ih-44),w:56,h:40};o.bushes.push(b);o.hides.push(b);}
      for(let k=0;k<8;k++)o.trees.push({x:ix+rng()*iw,y:iy+rng()*ih,r:12+rng()*8});
    }else{
      for(let a=0;a<2;a++)for(let b2=0;b2<2;b2++){
        const sx=ix+a*iw/2+iw/4-22+(rng()-.5)*30,sy=iy+b2*ih/2+ih/4-14+(rng()-.5)*20;
        const st={x:sx,y:sy,w:44,h:28,col:m.stall[Math.floor(rng()*m.stall.length)]};o.stalls.push(st);o.solids.push(st);
      }
    }
  }
  // شبكة الملاحة
  o.gw=Math.ceil(w/CS);o.gh=Math.ceil(h/CS);
  const N=o.gw*o.gh,sg=new Uint8Array(N);
  for(const s of o.solids){
    const x0=clamp(Math.floor(s.x/CS),0,o.gw-1),x1=clamp(Math.floor((s.x+s.w)/CS),0,o.gw-1);
    const y0=clamp(Math.floor(s.y/CS),0,o.gh-1),y1=clamp(Math.floor((s.y+s.h)/CS),0,o.gh-1);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)sg[y*o.gw+x]=1;
  }
  o.sg=sg;
  const nav=new Uint8Array(N);
  for(let y=0;y<o.gh;y++)for(let x=0;x<o.gw;x++){
    let b=0;
    if(x===0||y===0||x===o.gw-1||y===o.gh-1)b=1;
    else for(let dy=-1;dy<=1&&!b;dy++)for(let dx=-1;dx<=1;dx++)if(sg[(y+dy)*o.gw+x+dx]){b=1;break;}
    nav[y*o.gw+x]=b;
  }
  o.nav=nav;o.Q=new Int32Array(N);o.par=new Int32Array(N);o.vis=new Int32Array(N);o.stamp=0;
  // نقاط التقاطع
  for(let i=1;i<m.cols;i++)for(let j=1;j<m.rows;j++){
    const x=i*m.bw,y=j*m.bh;
    if(!nav[cellAt(x,y)])o.inter.push({x,y});
  }
  // المناطق اللي ممكن توصلها
  const reach=new Uint8Array(N),q=[];const s0=cellAt(o.inter[0].x,o.inter[0].y);reach[s0]=1;q.push(s0);
  for(let qi=0;qi<q.length;qi++){
    const c=q[qi],cx=c%o.gw,cy=(c/o.gw)|0;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=o.gw||ny>=o.gh)continue;
      const n=ny*o.gw+nx;if(reach[n]||nav[n])continue;reach[n]=1;q.push(n);
    }
  }
  o.cells=Int32Array.from(q);
  o.inter=o.inter.filter(p=>reach[cellAt(p.x,p.y)]);
  paintBg(o);
  return o;
}
function cellAt(x,y){const cx=clamp((x/CS)|0,0,W.gw-1),cy=clamp((y/CS)|0,0,W.gh-1);return cy*W.gw+cx;}
function solidAt(x,y){return W.sg[cellAt(x,y)]===1;}
function los(x0,y0,x1,y1){const d=Math.hypot(x1-x0,y1-y0),n=Math.ceil(d/10);for(let i=1;i<n;i++){const t=i/n;if(solidAt(x0+(x1-x0)*t,y0+(y1-y0)*t))return false;}return true;}
function navLOS(x0,y0,x1,y1){const d=Math.hypot(x1-x0,y1-y0),n=Math.ceil(d/6);for(let i=0;i<=n;i++){const t=i/n;if(W.nav[cellAt(x0+(x1-x0)*t,y0+(y1-y0)*t)])return false;}return true;}
function snap(c){
  const o=W;if(!o.nav[c])return c;const gw=o.gw,gh=o.gh,cx=c%gw,cy=(c/gw)|0;
  for(let r=1;r<=8;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=gw||ny>=gh)continue;
    const n=ny*gw+nx;if(!o.nav[n])return n;
  }
  return -1;
}
function findPath(x0,y0,x1,y1){
  const o=W,gw=o.gw,gh=o.gh,nav=o.nav;
  const s=snap(cellAt(x0,y0)),g=snap(cellAt(x1,y1));
  if(s<0||g<0)return null;
  const Q=o.Q,par=o.par,vis=o.vis,st=++o.stamp;
  let qh=0,qt=0;Q[qt++]=s;vis[s]=st;par[s]=-1;
  const DX=[1,-1,0,0,1,1,-1,-1],DY=[0,0,1,-1,1,-1,1,-1];
  while(qh<qt){
    const c=Q[qh++];if(c===g)break;
    const cx=c%gw,cy=(c/gw)|0;
    for(let k=0;k<8;k++){
      const nx=cx+DX[k],ny=cy+DY[k];
      if(nx<0||ny<0||nx>=gw||ny>=gh)continue;
      const n=ny*gw+nx;
      if(vis[n]===st||nav[n])continue;
      if(k>3&&(nav[cy*gw+nx]||nav[ny*gw+cx]))continue;
      vis[n]=st;par[n]=c;Q[qt++]=n;
    }
  }
  if(vis[g]!==st)return null;
  const pts=[];for(let c=g;c!==-1;c=par[c])pts.push({x:(c%gw+.5)*CS,y:((c/gw|0)+.5)*CS});
  pts.reverse();
  const out=[],last=pts.length-1;let i=0;
  while(i<last){let j=Math.min(last,i+30);while(j>i+1&&!navLOS(pts[i].x,pts[i].y,pts[j].x,pts[j].y))j--;out.push(pts[j]);i=j;}
  if(out.length&&!nav[cellAt(x1,y1)]&&navLOS(out[out.length-1].x,out[out.length-1].y,x1,y1))out.push({x:x1,y:y1});
  return out.length?out:[{x:x1,y:y1}];
}
function randCell(x,y,minD,maxD){
  for(let k=0;k<40;k++){
    const c=W.cells[(Math.random()*W.cells.length)|0],cx=(c%W.gw+.5)*CS,cy=((c/W.gw|0)+.5)*CS,d=Math.hypot(cx-x,cy-y);
    if(d>=minD&&d<=maxD)return{x:cx,y:cy};
  }
  const c=W.cells[(Math.random()*W.cells.length)|0];return{x:(c%W.gw+.5)*CS,y:((c/W.gw|0)+.5)*CS};
}
function freePt(x,y){const c=snap(cellAt(x,y));if(c<0)return null;return{x:(c%W.gw+.5)*CS,y:((c/W.gw|0)+.5)*CS};}
function isHidden(t){
  for(const h of W.hides)if(t.x>h.x&&t.x<h.x+h.w&&t.y>h.y&&t.y<h.y+h.h)return true;
  for(const s of G.smokes)if(Math.hypot(t.x-s.x,t.y-s.y)<s.r)return true;
  return false;
}

/* ---------- رسم الخلفية (مرة واحدة لكل منطقة) ---------- */
function paintBg(o){
  const m=o.m,b=document.createElement('canvas');b.width=o.w;b.height=o.h;const c=b.getContext('2d');
  c.fillStyle=m.road;c.fillRect(0,0,o.w,o.h);
  c.strokeStyle='rgba(255,255,255,.28)';c.lineWidth=2;c.setLineDash([16,14]);
  for(let i=0;i<=m.cols;i++){c.beginPath();c.moveTo(i*m.bw,0);c.lineTo(i*m.bw,o.h);c.stroke();}
  for(let j=0;j<=m.rows;j++){c.beginPath();c.moveTo(0,j*m.bh);c.lineTo(o.w,j*m.bh);c.stroke();}
  c.setLineDash([]);
  if(o.desert){
    c.fillStyle=m.open;c.fillRect(o.desert.x,o.desert.y,o.desert.w,o.desert.h);
    c.strokeStyle='rgba(150,110,50,.25)';c.lineWidth=3;
    for(let k=0;k<60;k++){const x=o.desert.x+Math.random()*o.desert.w,y=Math.random()*o.desert.h;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+30,y-10,x+60,y);c.stroke();}
  }
  if(o.water){
    const wr=o.water,g=c.createLinearGradient(wr.x,wr.y,wr.x+wr.w,wr.y+wr.h);g.addColorStop(0,'#2a6f9f');g.addColorStop(1,'#3f8fc4');
    c.fillStyle=g;c.fillRect(wr.x,wr.y,wr.w,wr.h);
    c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=2;
    for(let k=0;k<110;k++){const x=wr.x+Math.random()*wr.w,y=wr.y+Math.random()*wr.h;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+10,y-5,x+20,y);c.quadraticCurveTo(x+30,y+5,x+40,y);c.stroke();}
  }
  for(const k of o.blocks){c.fillStyle=k.type==='park'?m.parkCol:m.pave;c.fillRect(k.x,k.y,k.w,k.h);c.strokeStyle='rgba(0,0,0,.2)';c.lineWidth=2;c.strokeRect(k.x,k.y,k.w,k.h);}
  for(const h of o.hides){c.fillStyle='rgba(0,0,0,.3)';c.fillRect(h.x,h.y,h.w,h.h);c.strokeStyle='rgba(255,255,255,.2)';c.setLineDash([5,5]);c.strokeRect(h.x+.5,h.y+.5,h.w-1,h.h-1);c.setLineDash([]);}
  for(const bs of o.bushes){c.fillStyle='#2e6b34';for(let k=0;k<7;k++){c.beginPath();c.arc(bs.x+8+Math.random()*(bs.w-16),bs.y+8+Math.random()*(bs.h-16),11,0,7);c.fill();}}
  for(const s of o.stalls){c.fillStyle='rgba(0,0,0,.3)';c.fillRect(s.x+4,s.y+5,s.w,s.h);c.fillStyle=s.col;c.fillRect(s.x,s.y,s.w,s.h);c.fillStyle='rgba(255,255,255,.55)';for(let k=0;k<s.w;k+=11)c.fillRect(s.x+k,s.y,5,s.h);}
  for(const bd of o.blds){
    c.fillStyle='rgba(0,0,0,.28)';c.fillRect(bd.x+6,bd.y+8,bd.w,bd.h);
    c.fillStyle=bd.col;c.fillRect(bd.x,bd.y,bd.w,bd.h);
    c.fillStyle='rgba(0,0,0,.13)';
    for(let yy=bd.y+8;yy<bd.y+bd.h-10;yy+=16)for(let xx=bd.x+8;xx<bd.x+bd.w-10;xx+=16)c.fillRect(xx,yy,8,6);
    c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=3;c.strokeRect(bd.x+1.5,bd.y+1.5,bd.w-3,bd.h-3);
    if(bd.tank){c.fillStyle='#78909c';c.beginPath();c.arc(bd.x+bd.w*.7,bd.y+bd.h*.3,9,0,7);c.fill();c.fillStyle='#b0bec5';c.beginPath();c.arc(bd.x+bd.w*.7-2,bd.y+bd.h*.3-2,5,0,7);c.fill();}
    if(bd.dish){c.fillStyle='#eceff1';c.beginPath();c.arc(bd.x+bd.w*.25,bd.y+bd.h*.7,6,0,7);c.fill();}
  }
  for(const t of o.trees){c.fillStyle='rgba(0,0,0,.22)';c.beginPath();c.arc(t.x+3,t.y+4,t.r,0,7);c.fill();c.fillStyle='#2f7d32';c.beginPath();c.arc(t.x,t.y,t.r,0,7);c.fill();c.fillStyle='#4caf50';c.beginPath();c.arc(t.x-3,t.y-3,t.r*.55,0,7);c.fill();}
  for(const p of o.pyr){
    const cx=p.x+p.w/2,cy=p.y+p.h/2,cols=['#e8cf8f','#c9a85a','#a88a45','#d9bd75'];
    const cn=[[p.x,p.y],[p.x+p.w,p.y],[p.x+p.w,p.y+p.h],[p.x,p.y+p.h]];
    for(let k=0;k<4;k++){const a=cn[k],bb=cn[(k+1)%4];c.fillStyle=cols[k];c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(bb[0],bb[1]);c.lineTo(cx,cy);c.closePath();c.fill();}
    c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=2;c.strokeRect(p.x,p.y,p.w,p.h);
  }
  c.fillStyle='rgba(255,255,255,.07)';c.font='bold 90px Tahoma';c.textAlign='center';
  c.fillText(m.name,o.w/2,o.h/2);
  o.bg=b;
}

/* ---------- كيانات اللعبة ---------- */
function mk(kind,x,y,p){return Object.assign({kind,x,y,r:11,mx:0,my:0,sp:0,face:Math.random()*6.28,stamina:100,tired:false,run:false,path:null,pi:0,pT:0,pg:null,anim:Math.random()*6,mass:3,skin:pick(['#e0ac82','#c68c62','#f1c9a0','#a9744f']),hair:pick(['#1b1b1b','#3b2a1e','#5a4030','#111'])},p);}
function moveWith(e,dx,dy,run){const l=Math.hypot(dx,dy)||1;e.mx=dx/l;e.my=dy/l;e.run=!!run;}
function steerTo(e,tx,ty,run,dt,rep){
  const d=Math.hypot(tx-e.x,ty-e.y);
  if(d<12)return true;
  e.pT-=dt;
  const moved=!e.pg||Math.hypot(e.pg.x-tx,e.pg.y-ty)>(rep>0?40:6);
  if(!e.path||moved||(rep>0&&e.pT<=0)){
    e.pT=rep>0?rep*R(.8,1.3):999;e.pg={x:tx,y:ty};
    e.path=navLOS(e.x,e.y,tx,ty)?[{x:tx,y:ty}]:(findPath(e.x,e.y,tx,ty)||[{x:tx,y:ty}]);
    e.pi=0;
  }
  let w=e.path[e.pi];
  while(w&&e.pi<e.path.length-1&&Math.hypot(w.x-e.x,w.y-e.y)<14){e.pi++;w=e.path[e.pi];}
  if(!w)return true;
  const dx=w.x-e.x,dy=w.y-e.y,l=Math.hypot(dx,dy);
  if(l<8&&e.pi>=e.path.length-1)return true;
  moveWith(e,dx,dy,run);
  return false;
}
function canSee(a,b,range){
  const d=dist(a,b);if(d>range)return false;
  if(b.kind==='thief'&&d>70&&isHidden(b))return false;
  return los(a.x,a.y,b.x,b.y);
}

/* ---------- بدء المرحلة ---------- */
let mode='menu',pendingIdx=0;
const cam={x:0,y:0};
let camYaw=0,camPitch=.34,DT=.016;
function startLevel(idx){
  const mi=Math.floor(idx/3),n=idx%3+1,m=MAPS[mi];
  W=worldCache[m.id]||(worldCache[m.id]=genWorld(m));useWorld(W);
  const tgt={stash:Math.max(100,Math.round([450,800,1300][n-1]*m.wealth/50)*50),arrests:[1,2,3][n-1],errands:[3,4,5][n-1]};
  G={idx,mi,n,m,W,time:[480,540,600][n-1],total:[480,540,600][n-1],ctrl:'thief',target:tgt,stash:0,arrests:0,errands:0,stolen:0,recovered:0,
     people:[],npcs:[],cops:[],smokes:[],floats:[],cps:[],vision:250+idx*9,over:false,hudT:0,seen:0};
  const inter=W.inter.slice().sort(()=>Math.random()-.5);
  const hide=inter.pop();
  inter.sort((a,b)=>dist(b,hide)-dist(a,hide));
  const ospawn=inter[Math.floor(Math.random()*Math.min(4,inter.length))];
  inter.splice(inter.indexOf(ospawn),1);inter.sort(()=>Math.random()-.5);
  const vspawn=inter.pop();
  G.hide={x:hide.x,y:hide.y,name:m.hideName};
  // المشاوير
  const errs=m.errands.slice(0,tgt.errands);
  let prev=vspawn;
  errs.forEach((e,i)=>{
    let best=null;
    for(let k=0;k<inter.length;k++){const c=inter[k];if(dist(c,prev)>300&&dist(c,hide)>150){best=k;break;}}
    const p=inter.splice(best==null?0:best,1)[0]||vspawn;
    G.cps.push({x:p.x,y:p.y,name:e[0],atm:!!e[1]});prev=p;
  });
  const th=mk('thief',hide.x,hide.y,{base:136,canRun:true,carry:0,revealed:0,stun:0,smokeCd:0,carryGoal:R(150,330),stealP:0,stealT:null,dep:0,col:'#3b4252',tgt:null,tgtT:0});
  const of=mk('officer',ospawn.x,ospawn.y,{base:134+idx*1.8,canRun:true,main:true,arrCool:0,lastSeen:null,pingCd:0,lost:0,wait:0,pt:null,col:'#1f3a68'});
  const vi=mk('victim',vspawn.x,vspawn.y,{base:104,canRun:true,cash:Math.round(R(200,380)*m.wealth/10)*10,burn:0,discover:0,next:0,wait:0,shoutCd:0,reported:false,col:'#4aa3df'});
  G.thief=th;G.officer=of;G.victim=vi;
  G.people.push(th,of,vi);
  const nc=Math.min(5,Math.floor(idx/3)+m.patrol+(n>1?1:0)-(idx<3?1:0));
  for(let i=0;i<Math.max(0,nc);i++){
    const far=inter.slice().sort((a,b)=>dist(b,hide)-dist(a,hide));
    const p=far[Math.floor(Math.random()*Math.min(5,far.length))]||hide;
    const c=mk('cop',p.x,p.y,{base:126+idx*1.5,canRun:true,arrCool:0,lastSeen:null,lost:0,wait:R(0,2),pt:null,col:'#2c4f8f'});
    G.cops.push(c);G.people.push(c);
  }
  // الناس (عشوائي ومختلف لكل منطقة)
  const cnt=Math.round(m.npc*R(.85,1.2)*(1+idx*.01));
  const tot=m.types.reduce((s,t)=>s+t.w,0);
  for(let i=0;i<cnt;i++){
    let r=Math.random()*tot,ty=m.types[0];for(const t of m.types){r-=t.w;if(r<=0){ty=t;break;}}
    let pos=null;
    for(let k=0;k<80&&!pos;k++){
      const p=randCell(0,0,0,1e9);
      if(dist(p,hide)<140||dist(p,vspawn)<90||dist(p,ospawn)<90)continue;
      if(ty.where==='water'&&(!W.water||rectDist(W.water,p.x,p.y)>70))continue;
      if(ty.where==='pyr'&&(!W.desert||rectDist(W.desert,p.x,p.y)>10))continue;
      pos=p;
    }
    if(!pos)pos=randCell(0,0,0,1e9);
    const np=mk('npc',pos.x,pos.y,{r:10,mass:1,t:ty,col:ty.col,base:ty.mode==='stay'?42:ty.spd,mode:ty.mode,cash:RI(ty.cash[0],ty.cash[1]),brave:clamp(ty.brave*.6+m.brave*.5+Math.random()*.15,0,1),
      st:'idle',wait:R(0,4),home:{x:pos.x,y:pos.y},robbed:false,burn:0,discover:0,gt:0,gx:0,gy:0,gfx:0,gfy:0,tx:0,ty:0,sT:0,lx:pos.x,ly:pos.y});
    G.npcs.push(np);G.people.push(np);
  }
  // خريطة صغيرة
  const mw=180,mh=Math.round(180*W.h/W.w);mini.width=mw;mini.height=mh;
  G.mini=document.createElement('canvas');G.mini.width=mw;G.mini.height=mh;G.mini.getContext('2d').drawImage(W.bg,0,0,mw,mh);
  cam.x=th.x;cam.y=th.y;camYaw=Math.atan2(W.h/2-th.y,W.w/2-th.x);th.face=camYaw;camF=1;setup3D();
  $('lvname').textContent=`${m.emoji} ${m.name} – مرحلة ${n}: ${LVL_NAMES[n-1]}`;
  $('hud').style.display='block';$('toasts').innerHTML='';
  hideScreens();mode='play';
  toast('🦹 انت الحرامي دلوقتي. بدّل بين الشخصيات بـ 1 / 2 / 3','#ffd54a');
  toast('الشخصيتين التانيين بيتحكم فيهم الكمبيوتر لحد ما تبدّل ليهم');
}

/* ---------- الإدخال ---------- */
const keys={},edge=new Set(),joy={x:0,y:0};
addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();
  if(!e.repeat){keys[e.code]=true;edge.add(e.code);onKey(e.code);}
});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;if(mode==='play')setPause(true);});
function onKey(c){
  if(mode==='play'){
    if(c==='Digit1')setCtrl('thief');else if(c==='Digit2')setCtrl('officer');else if(c==='Digit3')setCtrl('victim');
    else if(c==='Tab'){const r=['thief','officer','victim'];setCtrl(r[(r.indexOf(G.ctrl)+1)%3]);}
    else if(c==='KeyP'||c==='Escape')setPause(true);
  }else if(mode==='pause'&&(c==='KeyP'||c==='Escape'))setPause(false);
}
const ROLE={thief:{n:'الحرامي',ic:'🦹'},officer:{n:'الضابط',ic:'👮'},victim:{n:'الضحية',ic:'🧍'}};
function setCtrl(r){if(!G||G.ctrl===r)return;G.ctrl=r;camYaw=G[r].face;G.thief.stealP=0;G.thief.stealT=null;beep(660,.08,'sine');toast(`${ROLE[r].ic} بتلعب دلوقتي بـ ${ROLE[r].n}`,'#ffd54a');updateHUD(true);}
function playerMove(e){
  let x=0,y=0;
  if(keys.KeyA)x--;if(keys.KeyD)x++;if(keys.KeyW||keys.ArrowUp)y--;if(keys.KeyS||keys.ArrowDown)y++;
  x+=joy.x;y+=joy.y;
  const l=Math.hypot(x,y);
  if(l>.2){
    const fx=Math.cos(camYaw),fy=Math.sin(camYaw),rx=-fy,ry=fx;
    const dx=rx*x-fx*y,dy=ry*x-fy*y;
    const jm=Math.hypot(joy.x,joy.y);
    moveWith(e,dx,dy,keys.ShiftLeft||keys.ShiftRight||keys.Space||jm>.93);
    if(Math.abs(joy.x)>.45)camYaw+=Math.sign(joy.x)*(Math.abs(joy.x)-.45)*1.3*DT;
  }
}
// لمس
if(IS_TOUCH){document.body.classList.add('touch');
  $('touch').style.display='block';
  const jz=$('joyzone'),jr=$('joy'),kn=$('knob');let jid=null,jo=null;
  jz.addEventListener('touchstart',e=>{const t=e.changedTouches[0];jid=t.identifier;jo={x:t.clientX,y:t.clientY};jr.style.display='block';jr.style.left=(jo.x-50)+'px';jr.style.top=(jo.y-50-(innerHeight*.45))+'px';e.preventDefault();},{passive:false});
  jz.addEventListener('touchmove',e=>{for(const t of e.changedTouches)if(t.identifier===jid){let dx=t.clientX-jo.x,dy=t.clientY-jo.y;const l=Math.hypot(dx,dy),M=50;if(l>M){dx=dx/l*M;dy=dy/l*M;}joy.x=dx/M;joy.y=dy/M;kn.style.left=(30+dx)+'px';kn.style.top=(30+dy)+'px';}e.preventDefault();},{passive:false});
  const endJ=e=>{for(const t of e.changedTouches)if(t.identifier===jid){jid=null;joy.x=joy.y=0;jr.style.display='none';kn.style.left=kn.style.top='30px';}};
  jz.addEventListener('touchend',endJ);jz.addEventListener('touchcancel',endJ);
  const bind=(id,code)=>{const b=$(id);const dn=e=>{keys[code]=true;edge.add(code);onKey(code);e.preventDefault();};const up=e=>{keys[code]=false;e.preventDefault();};b.addEventListener('touchstart',dn,{passive:false});b.addEventListener('touchend',up,{passive:false});b.addEventListener('touchcancel',up,{passive:false});};
  bind('bE','KeyE');bind('bQ','KeyQ');bind('bR','ShiftLeft');bind('bT','Tab');
  const lz=$('lookzone');let lid=null,lp=null;
  lz.addEventListener('touchstart',e=>{const t=e.changedTouches[0];lid=t.identifier;lp={x:t.clientX,y:t.clientY};e.preventDefault();},{passive:false});
  lz.addEventListener('touchmove',e=>{for(const t of e.changedTouches)if(t.identifier===lid){camYaw+=(t.clientX-lp.x)*.0075;camPitch=clamp(camPitch+(t.clientY-lp.y)*.004,.1,.85);lp={x:t.clientX,y:t.clientY};}e.preventDefault();},{passive:false});
  const endL=e=>{for(const t of e.changedTouches)if(t.identifier===lid)lid=null;};
  lz.addEventListener('touchend',endL);lz.addEventListener('touchcancel',endL);
}

// ماوس: اسحب لتدوير الكاميرا
let dragging=false,lastM=null;
cv.addEventListener('mousedown',e=>{if(mode==='play'){dragging=true;lastM={x:e.clientX,y:e.clientY};}});
addEventListener('mouseup',()=>{dragging=false;});
addEventListener('mousemove',e=>{if(dragging&&mode==='play'){camYaw+=(e.clientX-lastM.x)*.006;camPitch=clamp(camPitch+(e.clientY-lastM.y)*.004,.1,.85);lastM={x:e.clientX,y:e.clientY};}});
/* ---------- أحداث اللعبة ---------- */
function toast(msg,col){
  const d=document.createElement('div');d.className='toast';d.textContent=msg;if(col)d.style.color=col;
  const b=$('toasts');b.appendChild(d);while(b.children.length>4)b.removeChild(b.firstChild);
  setTimeout(()=>{if(d.parentNode)d.parentNode.removeChild(d);},4200);
}
function floatTxt(x,y,txt,col){G.floats.push({x,y,txt,col,t:1.6});}
function reveal(sec){const t=G.thief;if(t.stun>0)return;if(t.revealed<=0&&G.ctrl==='thief')toast('❗ اتكشفت! الكل عارف مكانك','#ff6e6e');t.revealed=Math.max(t.revealed,sec);}
function gather(x,y,rad){
  rad=rad||340;
  for(const n of G.npcs){
    if(n.burn>0||Math.hypot(n.x-x,n.y-y)>rad||Math.random()>.8)continue;
    n.st='gawk';n.gt=R(6,11);
    const a=R(0,6.28),d=R(55,130),p=freePt(x+Math.cos(a)*d,y+Math.sin(a)*d);
    n.gx=p?p.x:n.x;n.gy=p?p.y:n.y;n.gfx=x;n.gfy=y;n.path=null;
  }
}
function dropSmoke(t){t.smokeCd=14;G.smokes.push({x:t.x,y:t.y,r:78,t:5.5});beep(180,.25,'sawtooth');if(G.ctrl==='thief')toast('💨 رميت قنبلة دخان – استخبّى جواها!');}
function victimBurn(v){
  v.burn=9;v.reported=false;
  if(dist(v,G.thief)<600)reveal(5);
  gather(v.x,v.y,360);beep(240,.3,'sawtooth');
  toast('🔥 الضحية اكتشف إنه اتسرق وبيصرخ!','#ff9d4a');
}
function findStealTarget(t){
  let best=null,bd=44;
  const v=G.victim;if(v.cash>0&&dist(t,v)<bd){best=v;bd=dist(t,v);}
  for(const n of G.npcs){if(n.cash>0&&!n.robbed){const d=dist(t,n);if(d<bd){best=n;bd=d;}}}
  return best;
}
function stealStep(t,dt,want,tg){
  if(!want||!tg){t.stealP=0;t.stealT=null;return;}
  if(t.stealT!==tg){t.stealT=tg;t.stealP=0;}
  t.stealP+=dt;
  if(t.stealP>=.7){doSteal(t,tg);t.stealP=0;t.stealT=null;}
}
function doSteal(t,tg){
  const amt=tg.cash;tg.cash=0;if(tg.kind==='npc')tg.robbed=true;
  t.carry+=amt;G.stolen+=amt;beep(880,.1,'triangle');
  floatTxt(t.x,t.y-20,'+'+amt+' ج','#7CFC00');
  let noticed=false;
  if(tg.kind==='victim'){const a=Math.abs(angDiff(tg.face,Math.atan2(t.y-tg.y,t.x-tg.x)));noticed=Math.random()<(a<1.6?.6:.15);}
  else noticed=Math.random()<tg.brave*.6;
  let wit=0;for(const n of G.npcs)if(n!==tg&&Math.hypot(n.x-t.x,n.y-t.y)<190&&Math.random()<.3)wit++;
  let seen=false;for(const c of [G.officer,...G.cops])if(canSee(c,t,G.vision*.8)){seen=true;break;}
  if(noticed||wit>0||seen){
    reveal(seen?6:(noticed?6:4));gather(t.x,t.y,380);
    if(tg.kind==='victim')victimBurn(tg);else{tg.burn=6;}
    if(G.ctrl!=='thief')toast(seen?'🚨 الضابط شاف الحرامي وهو بينشل!':'👀 الناس شافت الحرامي!');
  }else{
    if(tg.kind==='victim')tg.discover=R(2,4);else tg.discover=R(2,4);
    if(G.ctrl==='thief')toast('🤫 نشل ناجح ومحدش واخد باله… لسه','#7CFC00');
  }
}
function arrest(t,by){
  if(t.stun>0)return;
  const lost=t.carry;t.carry=0;G.recovered+=lost;G.victim.cash+=lost;
  if(by.main){G.arrests++;toast(`✅ اتقبض على الحرامي! اترجّع ${lost} ج`,'#7CFC00');}
  else toast('🚨 دورية مسكت الحرامي (مش بتتحسب للمهمة)','#ffd54a');
  if(G.ctrl==='thief')toast('⛓️ اتقبض عليك! هتفضل متجمد 4 ثواني ومعاك فلوس راحت','#ff6e6e');
  beep(300,.3,'square',.06);
  t.stun=4;t.revealed=0;t.x=G.hide.x;t.y=G.hide.y;t.path=null;t.stealP=0;t.stealT=null;
  for(const c of [G.officer,...G.cops]){c.lastSeen=null;c.lost=0;c.path=null;}
  by.arrCool=3;
}

/* ---------- ذكاء الشخصيات ---------- */
function aiThief(t,dt){
  if(t.stun>0)return;
  let threat=null,td=1e9;
  for(const c of [G.officer,...G.cops]){const d=dist(t,c);if(d<td){td=d;threat=c;}}
  if(td<120&&t.smokeCd<=0)dropSmoke(t);
  const goHome=t.carry>=t.carryGoal||(t.carry>0&&(t.revealed>0||td<220))||td<100;
  if(goHome&&(t.carry>0||td<100)){steerTo(t,G.hide.x,G.hide.y,td<240,dt,.7);return;}
  t.tgtT-=dt;
  if(!t.tgt||t.tgtT<=0||(t.tgt.kind==='npc'&&t.tgt.robbed)||t.tgt.cash<=0){
    t.tgtT=2.5;t.tgt=null;
    const v=G.victim;if(v.cash>0&&v.burn<=0&&dist(t,v)<900)t.tgt=v;
    else{let bd=1e9;for(const n of G.npcs){if(n.cash>0&&!n.robbed){const d=dist(t,n);if(d<bd){bd=d;t.tgt=n;}}}}
  }
  if(t.tgt){
    const d=dist(t,t.tgt);
    if(d<38){stealStep(t,dt,true,t.tgt);}
    else{t.stealP=0;steerTo(t,t.tgt.x,t.tgt.y,td<170,dt,.5);}
  }
}
function aiChaser(c,dt){
  const t=G.thief,main=!!c.main;
  c.arrCool=Math.max(0,c.arrCool-dt);
  if(main&&G.ctrl==='officer')return;
  const rv=t.revealed>0&&dist(c,t)<(main?1500:800);
  const vis=t.stun<=0&&(rv||canSee(c,t,G.vision));
  if(vis){
    c.lastSeen={x:t.x,y:t.y};c.lost=0;const d=dist(c,t);
    steerTo(c,t.x,t.y,d<260,dt,.3);
    if(d<c.r+t.r+14&&c.arrCool<=0)arrest(t,c);
    return;
  }
  if(c.lastSeen){
    const ar=steerTo(c,c.lastSeen.x,c.lastSeen.y,false,dt,0);c.lost+=dt;
    if(ar||c.lost>9){c.lastSeen=null;c.lost=0;c.path=null;c.wait=1;}
    return;
  }
  if(c.wait>0){c.wait-=dt;return;}
  if(!c.pt){c.pt=main?randCell(G.victim.x,G.victim.y,0,450):randCell(c.x,c.y,250,900);c.path=null;}
  if(steerTo(c,c.pt.x,c.pt.y,false,dt,0)){c.wait=R(.5,2.2);c.pt=null;}
}
function aiVictim(v,dt){
  if(v.burn>0){
    const o=G.officer;steerTo(v,o.x,o.y,true,dt,.6);
    if(dist(v,o)<80&&!v.reported){v.reported=true;reveal(6);toast('📢 الضحية بلّغ الضابط عن مكان الحرامي!');}
    return;
  }
  if(v.wait>0){v.wait-=dt;return;}
  const cp=G.cps[v.next];
  if(cp)steerTo(v,cp.x,cp.y,false,dt,0);
  else{
    if(!v.pt||steerTo(v,v.pt.x,v.pt.y,false,dt,0)){v.pt=randCell(v.x,v.y,150,700);v.path=null;v.wait=R(1,3);}
  }
}
function aiNpc(n,dt){
  if(n.burn>0){return;}
  if(n.st==='gawk'){
    const d=Math.hypot(n.gx-n.x,n.gy-n.y);
    if(d>16&&n.mode!=='stay')steerTo(n,n.gx,n.gy,false,dt,0);
    else n.face=Math.atan2(n.gfy-n.y,n.gfx-n.x);
    n.gt-=dt;if(n.gt<=0){n.st='idle';n.wait=R(.5,2);n.path=null;}
    return;
  }
  if(n.st==='idle'){
    n.wait-=dt;
    if(n.wait<=0){
      const p=n.mode==='stay'?randCell(n.home.x,n.home.y,5,50):randCell(n.x,n.y,200,900);
      n.tx=p.x;n.ty=p.y;n.st='go';n.path=null;n.sT=0;n.lx=n.x;n.ly=n.y;
    }
    return;
  }
  const ar=steerTo(n,n.tx,n.ty,false,dt,0);
  n.sT+=dt;
  if(n.sT>1.6){if(Math.hypot(n.x-n.lx,n.y-n.ly)<8){n.st='idle';n.wait=R(.3,1);}n.sT=0;n.lx=n.x;n.ly=n.y;}
  if(ar){n.st='idle';n.wait=n.mode==='stay'?R(3,8):R(.5,4);}
}
/* ---------- تحكم اللاعب ---------- */
function playerThief(t,dt){
  if(t.stun>0){t.stealP=0;return;}
  playerMove(t);
  if(edge.has('KeyQ')&&t.smokeCd<=0)dropSmoke(t);
  stealStep(t,dt,!!keys.KeyE,findStealTarget(t));
}
function playerOfficer(o,dt){
  playerMove(o);o.arrCool=Math.max(0,o.arrCool-dt);
  const t=G.thief;
  if(keys.KeyE&&t.stun<=0&&o.arrCool<=0&&dist(o,t)<o.r+t.r+22)arrest(t,o);
  if(edge.has('KeyQ')&&o.pingCd<=0){
    o.pingCd=10;beep(520,.2,'sine');
    if(dist(o,t)<560&&t.stun<=0){t.revealed=Math.max(t.revealed,3.5);toast('📡 رصدت الحرامي! خد بالك من السهم','#7CFC00');}
    else toast('📡 مفيش أي أثر للحرامي قريب… دوّر عند الناس المتجمعة 👀');
  }
}
function playerVictim(v,dt){
  playerMove(v);
  if(edge.has('KeyE')&&v.shoutCd<=0){
    v.shoutCd=8;beep(300,.25,'sawtooth');
    if(dist(v,G.officer)<90){reveal(6);toast('📢 بلّغت الضابط بمكان الحرامي!');}
    else{gather(v.x,v.y,300);if(dist(v,G.thief)<450){reveal(5);toast('📣 صرخت! الناس بتبص على الحرامي');}else toast('📣 صرخت… بس الحرامي بعيد');}
  }
}

/* ---------- الفيزيا ---------- */
function speedPass(e,dt){
  const mv=e.mx||e.my;
  if(e.canRun){
    const wr=e.run&&mv&&!e.tired;
    if(wr){e.stamina-=34*dt;if(e.stamina<=0){e.stamina=0;e.tired=true;}}
    else{e.stamina=Math.min(100,e.stamina+(mv?10:20)*dt);if(e.tired&&e.stamina>=30)e.tired=false;}
    e.sp=mv?e.base*(wr?1.55:1):0;e.running=wr&&!!mv;
  }else e.sp=mv?e.base:0;
  e.run=false;
}
function collideSolids(e){
  for(const s of W.solids){
    if(e.x+e.r<s.x||e.x-e.r>s.x+s.w||e.y+e.r<s.y||e.y-e.r>s.y+s.h)continue;
    const cx=clamp(e.x,s.x,s.x+s.w),cy=clamp(e.y,s.y,s.y+s.h),dx=e.x-cx,dy=e.y-cy,d2=dx*dx+dy*dy;
    if(d2<e.r*e.r){
      if(d2>.0001){const d=Math.sqrt(d2),p=e.r-d;e.x+=dx/d*p;e.y+=dy/d*p;}
      else{const l=e.x-s.x,r=s.x+s.w-e.x,t=e.y-s.y,b=s.y+s.h-e.y,mn=Math.min(l,r,t,b);
        if(mn===l)e.x=s.x-e.r;else if(mn===r)e.x=s.x+s.w+e.r;else if(mn===t)e.y=s.y-e.r;else e.y=s.y+s.h+e.r;}
    }
  }
  e.x=clamp(e.x,e.r,W.w-e.r);e.y=clamp(e.y,e.r,W.h-e.r);
}
function phys(e,dt){
  let vx=e.mx*e.sp,vy=e.my*e.sp;
  if(e.stun>0)vx=vy=0;
  e.x+=vx*dt;e.y+=vy*dt;
  if(vx||vy){e.face=Math.atan2(vy,vx);e.anim+=dt*e.sp/16;}
  collideSolids(e);
}
function separate(){
  const P=G.people;
  for(let i=0;i<P.length;i++){const a=P[i];
    for(let j=i+1;j<P.length;j++){const b=P[j];
      const dx=b.x-a.x,dy=b.y-a.y;if(Math.abs(dx)>24||Math.abs(dy)>24)continue;
      const d=Math.hypot(dx,dy),mn=a.r+b.r;
      if(d<mn&&d>.01){const p=(mn-d),wa=b.mass/(a.mass+b.mass),wb=a.mass/(a.mass+b.mass);
        a.x-=dx/d*p*wa;a.y-=dy/d*p*wa;b.x+=dx/d*p*wb;b.y+=dy/d*p*wb;}
    }
  }
}

/* ---------- التحديث الرئيسي ---------- */
function update(dt){DT=dt;if(keys.ArrowLeft)camYaw-=2.2*dt;if(keys.ArrowRight)camYaw+=2.2*dt;
  const g=G,t=g.thief,o=g.officer,v=g.victim;
  g.time-=dt;
  for(const e of g.people){e.mx=0;e.my=0;}
  if(g.ctrl==='thief')playerThief(t,dt);else aiThief(t,dt);
  if(g.ctrl==='officer')playerOfficer(o,dt);
  aiChaser(o,dt);
  if(g.ctrl==='victim')playerVictim(v,dt);else aiVictim(v,dt);
  for(const c of g.cops)aiChaser(c,dt);
  for(const n of g.npcs)aiNpc(n,dt);
  // مؤقتات
  t.revealed=Math.max(0,t.revealed-dt);t.stun=Math.max(0,t.stun-dt);t.smokeCd=Math.max(0,t.smokeCd-dt);
  o.pingCd=Math.max(0,o.pingCd-dt);v.shoutCd=Math.max(0,v.shoutCd-dt);v.burn=Math.max(0,v.burn-dt);
  if(v.discover>0){v.discover-=dt;if(v.discover<=0)victimBurn(v);}
  for(const n of g.npcs){
    if(n.discover>0){n.discover-=dt;if(n.discover<=0){n.burn=6;if(Math.random()<.4+n.brave){reveal(3);gather(n.x,n.y,260);if(g.ctrl!=='thief')toast('📣 واحد اكتشف إن جيبه اتسرق وبيزعق!');}}}
    if(n.burn>0)n.burn-=dt;
  }
  for(const s of g.smokes)s.t-=dt;g.smokes=g.smokes.filter(s=>s.t>0);
  for(const f of g.floats){f.t-=dt;f.h=(f.h||0)+26*dt;}g.floats=g.floats.filter(f=>f.t>0);
  // مشاوير الضحية
  const cp=g.cps[v.next];
  if(cp&&dist(v,cp)<44){
    if(cp.atm){const add=Math.round(R(180,380)*g.m.wealth/10)*10;v.cash+=add;floatTxt(v.x,v.y-20,'سحب '+add+' ج','#ffd54a');}
    g.errands=v.next+1;v.next++;v.wait=1.2;beep(740,.12,'triangle');
    toast(`✅ الضحية خلّص مشوار: ${cp.name} (${g.errands}/${g.target.errands})`,'#7CFC00');
  }
  // إيداع الحرامي
  if(t.carry>0&&dist(t,g.hide)<46&&t.stun<=0){t.dep+=dt;if(t.dep>1.2){g.stash+=t.carry;floatTxt(t.x,t.y-24,'اتودّع '+t.carry+' ج','#7CFC00');toast(`💰 ودّعت ${t.carry} ج في ${g.hide.name} (${Math.min(g.stash,g.target.stash)}/${g.target.stash})`,'#7CFC00');t.carry=0;t.carryGoal=R(150,330);t.dep=0;beep(990,.15,'triangle');}}
  else t.dep=0;
  for(const e of g.people)speedPass(e,dt);
  for(const e of g.people)phys(e,dt);
  separate();
  for(const e of g.people)collideSolids(e);
  // كاميرا
  const ce=g[g.ctrl];cam.x+=(ce.x-cam.x)*Math.min(1,dt*12);cam.y+=(ce.y-cam.y)*Math.min(1,dt*12);
  // الفوز والخسارة
  if(!g.over){
    if(g.stash>=g.target.stash&&g.arrests>=g.target.arrests&&g.errands>=g.target.errands)endLevel(true);
    else if(g.time<=0)endLevel(false);
  }
}

/* ---------- نهاية المرحلة ---------- */
function endLevel(win){
  G.over=true;mode='result';
  const last=G.idx>=MAPS.length*3-1;
  if(win){
    const r=G.time/G.total,stars=r>.45?3:r>.2?2:1;
    SAVE.stars[G.idx]=Math.max(SAVE.stars[G.idx]||0,stars);SAVE.max=Math.max(SAVE.max,Math.min(G.idx+1,MAPS.length*3-1));saveGame();
    $('rsTitle').textContent=last?'🏆 خلّصت اللعبة كلها!':'🎉 المرحلة خلصت!';
    $('rsText').innerHTML=`${'⭐'.repeat(stars)}<br>الوقت المتبقي: ${fmt(G.time)} — فلوس اتسرقت: ${G.stolen} ج — قبض: ${G.arrests} — مشاوير: ${G.errands}`;
    $('bNext').style.display=last?'none':'inline-block';beep(880,.3,'triangle');
  }else{
    $('rsTitle').textContent='⏰ الوقت خلص';
    $('rsText').innerHTML=`لازم الـ3 مهمات يخلصوا قبل الوقت.<br>مخبأ: ${G.stash}/${G.target.stash} — قبض: ${G.arrests}/${G.target.arrests} — مشاوير: ${G.errands}/${G.target.errands}`;
    $('bNext').style.display='none';beep(150,.5,'sawtooth');
  }
  $('hud').style.display='none';show('result');
}
const fmt=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};

/* ---------- العرض ثلاثي الأبعاد: منظور الشخص الثالث ---------- */
const SKY={faisal:'#cdbb9f',dokki:'#a8d2f0',giza:'#f0d9a6',maadi:'#bfe4c8',alex:'#9ccff0'};
const HGT={faisal:[80,190],dokki:[80,170],giza:[45,110],maadi:[45,105],alex:[70,170]};
const CAM_D=118;
let TH=null,camF=1;const camGame={x:0,y:0};
function QPR(){const q=SAVE.q||(IS_TOUCH?'med':'high');return q==='low'?.7:q==='med'?Math.min(1.1,DPR):Math.min(DPR,2);}
const QN={low:'منخفضة',med:'متوسطة',high:'عالية'};
function qualLabel(){$('bQual').textContent='⚙️ الجودة: '+QN[SAVE.q||(IS_TOUCH?'med':'high')];}
function matC(col){const k='m'+col;return TH.mat[k]||(TH.mat[k]=new THREE.MeshLambertMaterial({color:col}));}

function initThree(){
  try{renderer=new THREE.WebGLRenderer({canvas:cv,antialias:!IS_TOUCH,powerPreference:'high-performance'});}
  catch(e){return false;}
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(62,VW/VH,2,2200);
  scene.add(new THREE.HemisphereLight(0xffffff,0x8a8a96,.85));
  const sun=new THREE.DirectionalLight(0xfff2d6,.7);sun.position.set(-300,500,200);scene.add(sun);
  TH={world:null,dyn:new THREE.Group(),chars:new Map(),mat:{},geo:{},smoke:[],sel:null};
  scene.add(TH.dyn);
  const g=TH.geo;
  g.torso=new THREE.BoxGeometry(8,14,16);
  g.leg=new THREE.BoxGeometry(5,14,5.5).translate(0,-7,0);
  g.arm=new THREE.BoxGeometry(4,13,4).translate(0,-6.5,0);
  g.head=new THREE.SphereGeometry(5.6,12,10);
  g.mask=new THREE.SphereGeometry(5.95,12,10);
  g.eyes=new THREE.BoxGeometry(1.2,2.2,7);
  g.cap=new THREE.CylinderGeometry(6,6.4,2.6,12);
  g.visor=new THREE.BoxGeometry(5,.9,8);
  g.hair=new THREE.SphereGeometry(5.9,12,8,0,Math.PI*2,0,Math.PI*.55);
  g.longhair=new THREE.BoxGeometry(3,9,10);
  g.bag=new THREE.BoxGeometry(4,9,9);
  g.sack=new THREE.BoxGeometry(6,9,8);
  g.badge=new THREE.BoxGeometry(.8,3,3);
  g.shadow=new THREE.CircleGeometry(11,16).rotateX(-Math.PI/2);
  g.flame=new THREE.ConeGeometry(3.5,13,6).translate(0,6.5,0);
  g.pole=new THREE.CylinderGeometry(1.1,1.4,52,6).translate(0,26,0);
  TH.shadowMat=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.3,depthWrite:false});
  TH.flameMats=[new THREE.MeshBasicMaterial({color:0xff5a1f}),new THREE.MeshBasicMaterial({color:0xffb020})];
  resize();
  return true;
}

/* --- نسيج الشبابيك + هندسة المباني المدمجة (درو كول واحد للمدينة كلها) --- */
function winTex(){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.fillStyle='#ffffff';x.fillRect(0,0,128,128);
  for(let r=0;r<4;r++)for(let q=0;q<4;q++){
    const lit=Math.random()<.22;
    x.fillStyle=lit?'#ffe7a0':'#33445e';x.fillRect(q*32+7,r*32+6,18,20);
    x.fillStyle=lit?'#fff3cf':'#4a5d7c';x.fillRect(q*32+7,r*32+6,18,6);
    x.fillStyle='rgba(0,0,0,.2)';x.fillRect(q*32+4,r*32+27,24,2);
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function boxGeo(x,z,w,d,h,col,plain,y0){
  const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv;
  for(let f=0;f<6;f++)for(let k=0;k<4;k++){
    const i=f*4+k;let u=uv.getX(i),v=uv.getY(i);
    if(plain||f===2||f===3){u=.03;v=.03;}else{const fw=f<2?d:w;u=u*fw/80;v=v*h/96;}
    uv.setXY(i,u,v);
  }
  const c=new THREE.Color(col),n=g.attributes.position.count,arr=new Float32Array(n*3);
  for(let i=0;i<n;i++){arr[i*3]=c.r;arr[i*3+1]=c.g;arr[i*3+2]=c.b;}
  g.setAttribute('color',new THREE.BufferAttribute(arr,3));
  g.translate(x+w/2,(y0||0)+h/2,z+d/2);
  return g;
}
function mergeGeos(list){
  let nv=0,ni=0;for(const g of list){nv+=g.attributes.position.count;ni+=g.index.count;}
  const P=new Float32Array(nv*3),N=new Float32Array(nv*3),U=new Float32Array(nv*2),C=new Float32Array(nv*3),I=new Uint32Array(ni);
  let a=0,b=0;
  for(const g of list){
    P.set(g.attributes.position.array,a*3);N.set(g.attributes.normal.array,a*3);U.set(g.attributes.uv.array,a*2);C.set(g.attributes.color.array,a*3);
    const ix=g.index.array;for(let i=0;i<ix.length;i++)I[b+i]=ix[i]+a;
    a+=g.attributes.position.count;b+=ix.length;
  }
  const m=new THREE.BufferGeometry();
  m.setAttribute('position',new THREE.BufferAttribute(P,3));m.setAttribute('normal',new THREE.BufferAttribute(N,3));
  m.setAttribute('uv',new THREE.BufferAttribute(U,2));m.setAttribute('color',new THREE.BufferAttribute(C,3));
  m.setIndex(new THREE.BufferAttribute(I,1));return m;
}

function build3D(o){
  const m=o.m,grp=new THREE.Group(),rng=mulberry(m.seed*7+3),H=HGT[m.id];
  // الأرض (نفس رسمة الخريطة القديمة كنسيج)
  const mt=renderer.capabilities.maxTextureSize||4096;
  let src=o.bg;
  if(Math.max(o.w,o.h)>mt){const k=mt/Math.max(o.w,o.h),c=document.createElement('canvas');c.width=Math.floor(o.w*k);c.height=Math.floor(o.h*k);c.getContext('2d').drawImage(o.bg,0,0,c.width,c.height);src=c;}
  const tex=new THREE.CanvasTexture(src);
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps=true;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(o.w,o.h).rotateX(-Math.PI/2).translate(o.w/2,0,o.h/2),new THREE.MeshBasicMaterial({map:tex}));
  grp.add(ground);
  const outer=new THREE.Mesh(new THREE.PlaneGeometry(30000,30000).rotateX(-Math.PI/2).translate(o.w/2,-1,o.h/2),new THREE.MeshBasicMaterial({color:m.pave}));
  grp.add(outer);
  // المباني والأكشاك والسور
  const list=[];
  for(const b of o.blds){
    const hh=H[0]+rng()*(H[1]-H[0]);
    list.push(boxGeo(b.x,b.y,b.w,b.h,hh,b.col,false));
    list.push(boxGeo(b.x-2,b.y-2,b.w+4,b.h+4,4,'#6f6f78',true,hh));
  }
  for(const s of o.stalls){
    list.push(boxGeo(s.x,s.y,s.w,s.h,16,s.col,true));
    list.push(boxGeo(s.x-5,s.y-5,s.w+10,s.h+10,3,'#f2f2f2',true,16));
  }
  const wallC='#4a4a54';
  list.push(boxGeo(-40,-40,o.w+80,40,70,wallC,true));list.push(boxGeo(-40,o.h,o.w+80,40,70,wallC,true));
  list.push(boxGeo(-40,0,40,o.h,70,wallC,true));list.push(boxGeo(o.w,0,40,o.h,70,wallC,true));
  const city=new THREE.Mesh(mergeGeos(list),new THREE.MeshLambertMaterial({map:winTex(),vertexColors:true}));
  grp.add(city);
  // الأهرامات
  for(const p of o.pyr){
    const hgt=Math.max(p.w,p.h)*.82;
    const cg=new THREE.ConeGeometry(1,1,4,1).rotateY(Math.PI/4).toNonIndexed();cg.computeVertexNormals();
    const ms=new THREE.Mesh(cg,new THREE.MeshLambertMaterial({color:'#d9bd78',flatShading:true}));
    ms.scale.set(p.w/1.4142,hgt,p.h/1.4142);ms.position.set(p.x+p.w/2,hgt/2,p.y+p.h/2);grp.add(ms);
  }
  // الشجر
  if(o.trees.length){
    const n=o.trees.length,d=new THREE.Object3D(),gc=new THREE.Color();
    const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(2,2.8,16,6).translate(0,8,0),new THREE.MeshLambertMaterial({color:'#6d4c41'}),n);
    const crown=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),new THREE.MeshLambertMaterial({color:'#ffffff'}),n);
    o.trees.forEach((t,i)=>{
      d.position.set(t.x,0,t.y);d.scale.set(1,1,1);d.updateMatrix();trunk.setMatrixAt(i,d.matrix);
      const r=t.r*1.25;d.position.set(t.x,16+r*.7,t.y);d.scale.set(r,r*.9,r);d.updateMatrix();crown.setMatrixAt(i,d.matrix);
      gc.set(['#2f7d32','#3d8b40','#43a047','#2e7031'][i%4]);crown.setColorAt(i,gc);
    });
    grp.add(trunk,crown);
  }
  // الشجيرات (أماكن الاستخباء)
  if(o.bushes.length){
    const d=new THREE.Object3D(),n=o.bushes.length*6;
    const bu=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),new THREE.MeshLambertMaterial({color:'#2e7d32'}),n);
    let i=0;
    for(const b of o.bushes)for(let k=0;k<6;k++){
      const r=9+rng()*5;d.position.set(b.x+10+rng()*(b.w-20),r*.7,b.y+10+rng()*(b.h-20));d.scale.set(r,r*.8,r);d.updateMatrix();bu.setMatrixAt(i++,d.matrix);
    }
    grp.add(bu);
  }
  // أعمدة إنارة
  const lp=[];const ins=m.rw/2;
  for(let i=1;i<m.cols;i++)for(let j=1;j<m.rows;j++)for(const sx of [-1,1])for(const sy of [-1,1]){
    const x=i*m.bw+sx*ins*.92,y=j*m.bh+sy*ins*.92;
    if(x<0||y<0||x>o.w||y>o.h||solidAt(x,y))continue;lp.push([x,y]);
  }
  if(lp.length){
    const d=new THREE.Object3D();
    const poles=new THREE.InstancedMesh(TH.geo.pole,new THREE.MeshLambertMaterial({color:'#5b5f66'}),lp.length);
    const heads=new THREE.InstancedMesh(new THREE.SphereGeometry(3.2,8,6).translate(0,54,0),new THREE.MeshBasicMaterial({color:'#fff1b0'}),lp.length);
    lp.forEach((p,i)=>{d.position.set(p[0],0,p[1]);d.updateMatrix();poles.setMatrixAt(i,d.matrix);heads.setMatrixAt(i,d.matrix);});
    grp.add(poles,heads);
  }
  o.group=grp;o.tex=tex;
}
function useWorld(o){
  if(!TH)return;
  if(TH.world&&TH.world!==o){scene.remove(TH.world.group);if(TH.world.tex)TH.world.tex.dispose();}
  if(!o.group)build3D(o);
  if(TH.world!==o)scene.add(o.group);
  TH.world=o;
  const sky=new THREE.Color(SKY[o.m.id]);scene.background=sky;scene.fog=new THREE.Fog(sky,420,1350);
}

/* --- الشخصيات المجسمة --- */
function makeChar(e){
  const g=TH.geo,grp=new THREE.Group(),body=new THREE.Group();grp.add(body);
  const skin=matC(e.skin),cl=matC(e.col),kind=e.kind;
  const torso=new THREE.Mesh(g.torso,cl);torso.position.y=21;body.add(torso);
  const legCol=(kind==='officer'||kind==='cop')?'#14203a':(kind==='thief'?'#1a1a1a':'#2f3542');
  const legL=new THREE.Mesh(g.leg,matC(legCol)),legR=new THREE.Mesh(g.leg,matC(legCol));
  legL.position.set(0,15,-4);legR.position.set(0,15,4);body.add(legL,legR);
  const armL=new THREE.Mesh(g.arm,cl),armR=new THREE.Mesh(g.arm,cl);
  armL.position.set(0,27.5,-10);armR.position.set(0,27.5,10);body.add(armL,armR);
  const head=new THREE.Mesh(g.head,skin);head.position.set(0,33.5,0);body.add(head);
  const u={body,legL,legR,armL,armR,rot:-e.face,fire:null,sack:null};
  if(kind==='thief'){
    const mk=new THREE.Mesh(g.mask,matC('#111111'));mk.position.set(-.4,33.5,0);body.add(mk);
    const ey=new THREE.Mesh(g.eyes,skin);ey.position.set(5.1,34,0);body.add(ey);
    const sk=new THREE.Mesh(g.sack,matC('#8d6e63'));sk.position.set(-6,22,0);sk.visible=false;body.add(sk);u.sack=sk;
  }else if(kind==='officer'||kind==='cop'){
    const capc=kind==='officer'?'#16264a':'#233b6e';
    const cp=new THREE.Mesh(g.cap,matC(capc));cp.position.set(0,38.6,0);body.add(cp);
    const vz=new THREE.Mesh(g.visor,matC('#0b1226'));vz.position.set(5.2,37.6,0);body.add(vz);
    const bd=new THREE.Mesh(g.badge,matC('#ffd54a'));bd.position.set(4.2,25,3.5);body.add(bd);
    const cb=new THREE.Mesh(g.badge,matC('#ffd54a'));cb.position.set(5.9,39.4,0);cb.scale.set(1,.8,1.4);body.add(cb);
  }else{
    const hr=new THREE.Mesh(g.hair,matC(e.hair));hr.position.set(-.3,34,0);body.add(hr);
    if(kind==='victim'){const bg=new THREE.Mesh(g.bag,matC('#8d5a2b'));bg.position.set(1,15,12.5);body.add(bg);}
    else if(e.t&&/ست|طالبة|كوبل/.test(e.t.n)){const lh=new THREE.Mesh(g.longhair,matC(e.hair));lh.position.set(-4.6,31,0);body.add(lh);}
  }
  const sh=new THREE.Mesh(g.shadow,TH.shadowMat);sh.position.y=.4;grp.add(sh);
  if(kind==='npc'){const s=(e.t&&e.t.n==='عيّل')?.74:.93+Math.random()*.15;grp.scale.set(s,s,s);}
  grp.userData=u;return grp;
}
function makeFire(){
  const f=new THREE.Group();
  for(let i=0;i<5;i++){const c=new THREE.Mesh(TH.geo.flame,TH.flameMats[i%2]);const a=i*1.26;c.position.set(Math.cos(a)*5,16+(i%3)*5,Math.sin(a)*8);f.add(c);}
  return f;
}
function setup3D(){
  const d=TH.dyn;while(d.children.length)d.remove(d.children[0]);
  TH.chars.clear();
  for(const e of G.people){const c=makeChar(e);d.add(c);TH.chars.set(e,c);}
  const mkB=(x,y,col,tall)=>{
    const gp=new THREE.Group();
    const pil=new THREE.Mesh(new THREE.CylinderGeometry(3.5,3.5,tall,10,1,true).translate(0,tall/2,0),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}));
    const ring=new THREE.Mesh(new THREE.RingGeometry(32,40,36).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.75,depthWrite:false,side:THREE.DoubleSide}));
    ring.position.y=1.2;gp.add(pil,ring);gp.position.set(x,0,y);d.add(gp);return gp;
  };
  G.bcHide=mkB(G.hide.x,G.hide.y,'#ff4444',260);
  G.bcCp=G.cps.map(cp=>mkB(cp.x,cp.y,'#4fc3f7',200));
  TH.smoke=[];
  const sg=new THREE.SphereGeometry(1,10,8);
  for(let i=0;i<8;i++){
    const gp=new THREE.Group(),mt=new THREE.MeshLambertMaterial({color:'#c4c4c4',transparent:true,opacity:.55,depthWrite:false});
    for(let k=0;k<6;k++)gp.add(new THREE.Mesh(sg,mt));
    gp.visible=false;gp.userData.mt=mt;d.add(gp);TH.smoke.push(gp);
  }
  TH.sel=new THREE.Mesh(new THREE.RingGeometry(14,18,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#ffd54a',transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));
  TH.sel.position.y=.9;d.add(TH.sel);
}

/* --- الكاميرا خلف الشخصية --- */
function updateCamera(){
  camPitch=clamp(camPitch,.1,.85);
  const fx=Math.cos(camYaw),fy=Math.sin(camYaw);
  const HD=CAM_D*Math.cos(camPitch),VHt=24+CAM_D*Math.sin(camPitch);
  let ok=1;
  for(let i=1;i<=14;i++){
    const t=i/14,px=cam.x-fx*HD*t,py=cam.y-fy*HD*t;
    if(solidAt(px,py)||px<6||py<6||px>W.w-6||py>W.h-6){ok=Math.max(.28,(i-1)/14-.06);break;}
  }
  camF=ok<camF?ok:camF+(ok-camF)*Math.min(1,DT*5);
  const cx=cam.x-fx*HD*camF,cz=cam.y-fy*HD*camF,cy=Math.max(10,12+(VHt-12)*(.4+.6*camF));
  camera.position.set(cx,cy,cz);
  camera.lookAt(cam.x+fx*34,36,cam.y+fy*34);
  camGame.x=cx;camGame.y=cz;
}

function iconOf(e){
  if(e.kind==='victim')return e.burn>0?'🔥':'';
  if(e.kind==='thief')return e.stun>0?'💫':e.revealed>0?'❗':'';
  if(e.kind==='officer'||e.kind==='cop')return e.lastSeen?'🚨':'';
  if(e.burn>0)return '🔥';if(e.st==='gawk')return '👀';return '';
}
const TAG={thief:'🦹',officer:'👮',victim:'🧍'};

function sync3D(tm){
  const g=G,ce=g[g.ctrl],HD=CAM_D*Math.cos(camPitch);
  for(const [e,grp] of TH.chars){
    const u=grp.userData;
    grp.position.set(e.x,0,e.y);
    let d=-e.face-u.rot;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
    u.rot+=d*Math.min(1,DT*14+.02);u.body.rotation.y=u.rot;
    let vis=e===ce?camF*HD>32:(Math.hypot(e.x-cam.x,e.y-cam.y)<1000);
    if(e.kind==='thief'&&e.stun>0&&Math.floor(tm*8)%2)vis=false;
    grp.visible=vis;if(!vis)continue;
    const mv=e.sp>2,sw=mv?Math.sin(e.anim*1.5)*(e.running?.95:.7):0;
    u.legL.rotation.z=sw;u.legR.rotation.z=-sw;
    if(e.burn>0){const f=Math.sin(tm*16);u.armL.rotation.z=2.7+f*.35;u.armR.rotation.z=2.7-f*.35;}
    else{u.armL.rotation.z=-sw*.9;u.armR.rotation.z=sw*.9;}
    u.body.position.y=mv?Math.abs(Math.sin(e.anim*1.5))*1.6:0;
    if(e.burn>0&&!u.fire){u.fire=makeFire();grp.add(u.fire);}
    if(u.fire){u.fire.visible=e.burn>0;if(e.burn>0)u.fire.children.forEach((c,i)=>c.scale.set(1+.2*Math.sin(tm*18+i),.8+.5*Math.abs(Math.sin(tm*13+i*2)),1+.2*Math.cos(tm*17+i)));}
    if(u.sack)u.sack.visible=e.carry>0;
  }
  const pl=1+.12*Math.sin(tm*4);
  g.bcHide.children[1].scale.set(pl,1,pl);g.bcHide.children[0].material.opacity=.2+.12*Math.sin(tm*3);
  g.bcCp.forEach((b,i)=>{
    b.visible=i>=g.victim.next;const cur=i===g.victim.next;
    b.children[0].material.opacity=cur?.3+.12*Math.sin(tm*4):.12;b.children[1].scale.set(cur?pl:1,1,cur?pl:1);
  });
  TH.smoke.forEach((gp,i)=>{
    const s=g.smokes[i];if(!s){gp.visible=false;return;}
    gp.visible=true;gp.position.set(s.x,0,s.y);gp.userData.mt.opacity=.55*Math.min(1,s.t/2.5);
    gp.children.forEach((c,k)=>{const a=k*1.05+tm*.5;c.position.set(Math.cos(a)*s.r*.45,14+k*7,Math.sin(a)*s.r*.45);c.scale.setScalar(s.r*.5);});
  });
  TH.sel.visible=camF*HD>32;TH.sel.position.set(ce.x,.9,ce.y);
}

/* --- طبقة 2D فوق الـ3D: أيقونات وأسهم وأرقام --- */
const _pv=new THREE.Vector3();
function proj(gx,h,gy){
  _pv.set(gx,h,gy).applyMatrix4(camera.matrixWorldInverse);
  const cx=_pv.x,cy=_pv.y,front=_pv.z<-2;
  _pv.applyMatrix4(camera.projectionMatrix);
  return{front,cx,cy,sx:(_pv.x*.5+.5)*VW,sy:(-_pv.y*.5+.5)*VH};
}
function badge(x,y,icon,col,r,label){
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();
  ctx.strokeStyle=col;ctx.lineWidth=2;ctx.stroke();
  ctx.font=Math.round(r*1.05)+'px sans-serif';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(icon,x,y+1);
  ctx.textBaseline='alphabetic';
  if(label){ctx.font='bold 11px Tahoma';ctx.fillStyle=col;ctx.fillText(label,x,y+r+13);}
}
function marker(gx,gy,h,icon,col,ce){
  const p=proj(gx,h,gy),lab=Math.round(Math.hypot(gx-ce.x,gy-ce.y)/10)+'م';
  const M=30,B=72,TOP=64;let x=p.sx,y=p.sy,off=false;
  if(!p.front||x<M||x>VW-M||y<TOP||y>VH-B){
    off=true;
    const ccx=VW/2,ccy=(TOP+VH-B)/2,hx=VW/2-M,hy=(VH-B-TOP)/2;
    let dx,dy;
    if(p.front){dx=x-ccx;dy=y-ccy;}else{dx=p.cx*5+(p.cx>=0?60:-60);dy=260;}
    const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
    const t=Math.min(hx/(Math.abs(dx)||1e-6),hy/(Math.abs(dy)||1e-6));
    x=ccx+dx*t;y=ccy+dy*t;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(dy,dx));ctx.fillStyle=col;
    ctx.beginPath();ctx.moveTo(30,0);ctx.lineTo(19,-8);ctx.lineTo(19,8);ctx.closePath();ctx.fill();ctx.restore();
  }
  badge(x,y,icon,col,off?15:13,lab);
}
function overlay(tm){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,VW,VH);
  const g=G,ce=g[g.ctrl],t=g.thief,HD=CAM_D*Math.cos(camPitch);
  ctx.textAlign='center';ctx.textBaseline='alphabetic';
  // فوق الرؤوس
  for(const e of g.people){
    if(e===ce)continue;
    const d=Math.hypot(e.x-ce.x,e.y-ce.y);if(d>650)continue;
    const tag=TAG[e.kind],ic=iconOf(e);if(!tag&&!ic)continue;
    if(e.kind==='thief'&&g.ctrl!=='thief'&&!(t.revealed>0||d<90||!isHidden(t)))continue;
    const p=proj(e.x,50,e.y);
    if(!p.front||p.sx<-20||p.sx>VW+20||p.sy<-20||p.sy>VH+20)continue;
    if(!los(camGame.x,camGame.y,e.x,e.y))continue;
    const sc=clamp(1.15-d/900,.6,1.1);
    if(tag){ctx.font=Math.round(18*sc)+'px sans-serif';ctx.fillText(tag,p.sx,p.sy);}
    if(ic){ctx.font=Math.round(22*sc)+'px sans-serif';ctx.fillText(ic,p.sx,p.sy-(tag?22*sc:0));}
  }
  // سهم اللاعب
  if(camF*HD>32){const p=proj(ce.x,52+Math.sin(tm*6)*2,ce.y);if(p.front){ctx.fillStyle='#ffd54a';ctx.beginPath();ctx.moveTo(p.sx,p.sy);ctx.lineTo(p.sx-8,p.sy-13);ctx.lineTo(p.sx+8,p.sy-13);ctx.closePath();ctx.fill();}}
  // أشرطة النشل والإيداع
  const bar=(e,off,fr,col)=>{const p=proj(e.x,58,e.y);if(!p.front)return;ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(p.sx-24,p.sy-off,48,7);ctx.fillStyle=col;ctx.fillRect(p.sx-24,p.sy-off,48*fr,7);};
  if(g.ctrl==='thief'&&t.stealP>0)bar(t,26,t.stealP/.7,'#7CFC00');
  if(t.dep>0)bar(t,38,t.dep/1.2,'#ffd54a');
  // نصوص عايمة
  ctx.font='bold 16px Tahoma';
  for(const f of g.floats){const p=proj(f.x,46+(f.h||0),f.y);if(!p.front)continue;ctx.globalAlpha=Math.min(1,f.t);ctx.fillStyle=f.col;ctx.fillText(f.txt,p.sx,p.sy);ctx.globalAlpha=1;}
  // أسهم الأهداف
  if(g.ctrl==='thief'){marker(g.hide.x,g.hide.y,60,'🏚️',t.carry>0?'#ff5252':'#ff9e9e',ce);}
  else if(g.ctrl==='officer'){if(t.revealed>0&&t.stun<=0)marker(t.x,t.y,50,'🦹','#ff5252',ce);}
  else{const cp=g.cps[g.victim.next];if(cp)marker(cp.x,cp.y,50,cp.atm?'🏧':'📍','#4fc3f7',ce);if(g.victim.burn>0)marker(g.officer.x,g.officer.y,50,'👮','#ffd54a',ce);}
  // فلاش أحمر لو الحرامي مكشوف
  if(g.ctrl==='thief'&&t.revealed>0){ctx.fillStyle='rgba(255,0,0,'+(.06+.04*Math.sin(tm*8))+')';ctx.fillRect(0,0,VW,VH);}
}
function drawMini(){
  const g=G,t=g.thief,ce=g[g.ctrl],mw=mini.width,mh=mini.height,k=mw/W.w;
  mctx.clearRect(0,0,mw,mh);mctx.drawImage(g.mini,0,0);
  const dot=(p,c,r)=>{mctx.fillStyle=c;mctx.beginPath();mctx.arc(p.x*k,p.y*k,r,0,7);mctx.fill();};
  dot(g.hide,'#ff5252',4);g.cps.forEach((cp,i)=>{if(i>=g.victim.next)dot(cp,'#4fc3f7',3);});
  for(const n of g.npcs)dot(n,'rgba(255,255,255,.5)',1.2);
  for(const c of g.cops)dot(c,'#3d7bff',2.6);
  dot(g.officer,'#3d7bff',3.6);dot(g.victim,'#4aa3df',3.6);
  if(g.ctrl==='thief'||t.revealed>0)dot(t,'#ff2b2b',3.6);
  mctx.save();mctx.translate(ce.x*k,ce.y*k);mctx.rotate(camYaw);
  mctx.fillStyle='rgba(255,213,74,.4)';mctx.beginPath();mctx.moveTo(0,0);mctx.lineTo(36,-15);mctx.lineTo(36,15);mctx.closePath();mctx.fill();
  mctx.restore();
  mctx.strokeStyle='#ffd54a';mctx.lineWidth=1.5;mctx.beginPath();mctx.arc(ce.x*k,ce.y*k,5,0,7);mctx.stroke();
}
function render(){
  if(!G||!TH||!TH.world)return;
  const tm=performance.now()/1000;
  updateCamera();sync3D(tm);
  renderer.render(scene,camera);
  overlay(tm);drawMini();
}

/* ---------- واجهة اللاعب (HUD) ---------- */
function updateHUD(force){
  if(!G)return;
  G.hudT-=1;if(G.hudT>0&&!force)return;G.hudT=8;
  const g=G,t=g.thief,o=g.officer,v=g.victim,tg=g.target;
  $('timer').textContent='⏱ '+fmt(g.time);
  const rc=(r,txt,k)=>`<div class="rc${g.ctrl===r?' on':''}" onclick="setCtrl('${r}')"><b>${ROLE[r].ic} ${ROLE[r].n}</b> <small>[${k}]</small><br>${txt}</div>`;
  $('roles').innerHTML=rc('thief',`معاه ${t.carry} ج${t.stun>0?' ⛓️':''}${t.revealed>0?' ❗':''}`,1)+rc('officer',`قبض ${g.arrests}/${tg.arrests}`,2)+rc('victim',`فلوس ${v.cash} ج${v.burn>0?' 🔥':''}`,3);
  const ok=b=>b?'✅':'⬜';
  $('missions').innerHTML=`<b>المهمات</b>
    <div>${ok(g.stash>=tg.stash)} 🦹 ودّع ${tg.stash} ج في المخبأ (${Math.min(g.stash,tg.stash)})</div>
    <div>${ok(g.arrests>=tg.arrests)} 👮 اقبض على الحرامي ${tg.arrests} مرة (${g.arrests})</div>
    <div>${ok(g.errands>=tg.errands)} 🧍 خلّص ${tg.errands} مشاوير (${g.errands})</div>`;
  const A=[];const r=g.ctrl;
  if(r==='thief'){const f=findStealTarget(t);A.push(`<div class="ab${f?' hot':''}">[E] نشل ${f?'✔':''}</div>`,`<div class="ab">[Q] دخان ${t.smokeCd>0?Math.ceil(t.smokeCd)+'ث':'جاهز'}</div>`);}
  else if(r==='officer'){const near=dist(o,t)<o.r+t.r+22&&t.stun<=0;A.push(`<div class="ab${near?' hot':''}">[E] اقبض ${near?'✔':''}</div>`,`<div class="ab">[Q] رصد ${o.pingCd>0?Math.ceil(o.pingCd)+'ث':'جاهز'}</div>`);}
  else A.push(`<div class="ab">[E] ${dist(v,o)<90?'بلّغ الضابط':'صرخة'} ${v.shoutCd>0?Math.ceil(v.shoutCd)+'ث':''}</div>`);
  const me=g[g.ctrl];A.push(`<div class="ab">⚡ ${Math.round(me.stamina)}%${me.tired?' (تعبان)':''}</div>`);
  $('abil').innerHTML=A.join('');
}

/* ---------- الشاشات ---------- */
function hideScreens(){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));}
function show(id){hideScreens();$(id).classList.add('on');}
function buildLevels(){
  const box=$('lvgrid');box.innerHTML='';
  MAPS.forEach((m,mi)=>{
    const row=document.createElement('div');row.className='maprow';row.innerHTML=`<div class="mn">${m.emoji} ${m.name}</div>`;
    for(let n=1;n<=3;n++){
      const idx=mi*3+n-1,st=SAVE.stars[idx]||0,locked=idx>SAVE.max;
      const b=document.createElement('button');b.className='lv'+(locked?' lock':'');b.disabled=locked;
      b.innerHTML=`مرحلة ${n}<br><small>${locked?'🔒':(st?'⭐'.repeat(st):'—')}</small>`;
      b.onclick=()=>openIntro(idx);row.appendChild(b);
    }
    box.appendChild(row);
  });
}
function openIntro(idx){
  pendingIdx=idx;const mi=Math.floor(idx/3),n=idx%3+1,m=MAPS[mi];
  const tg={stash:Math.max(100,Math.round([450,800,1300][n-1]*m.wealth/50)*50),arrests:[1,2,3][n-1],errands:[3,4,5][n-1]};
  $('inTitle').textContent=`${m.emoji} ${m.name} – مرحلة ${n}: ${LVL_NAMES[n-1]}`;
  $('inDesc').textContent=m.desc+' '+LVL_TXT[n-1];
  $('inMis').innerHTML=`<div>🦹 <b>الحرامي:</b> انشل وودّع <b>${tg.stash} ج</b> في المخبأ (${m.hideName})</div>
   <div>👮 <b>الضابط:</b> اقبض على الحرامي <b>${tg.arrests}</b> مرة</div>
   <div>🧍 <b>الضحية:</b> خلّص <b>${tg.errands}</b> مشاوير (الدواير الزرقا)</div>
   <div>⏱ الوقت: ${fmt([480,540,600][n-1])} — لازم الـ3 مهمات يخلصوا</div>`;
  show('intro');mode='intro';
}
function setPause(p){if(!G||G.over)return;if(p){mode='pause';show('pause');}else{mode='play';hideScreens();}}
function toMenu(){mode='menu';$('hud').style.display='none';show('menu');}
$('bContinue').onclick=()=>openIntro(Math.min(SAVE.max,MAPS.length*3-1));
$('bLevels').onclick=()=>{buildLevels();show('levels');mode='menu';};
$('bReset').onclick=()=>{if(confirm('تمسح كل التقدم؟')){SAVE={max:0,stars:{}};saveGame();}};
$('bBack1').onclick=toMenu;$('bBack2').onclick=toMenu;
function goFull(){
  try{const d=document.documentElement,f=d.requestFullscreen||d.webkitRequestFullscreen;if(f){const p=f.call(d);if(p&&p.catch)p.catch(()=>{});}}catch(e){}
  try{if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});}catch(e){}
}
$('bStart').onclick=()=>{if(IS_TOUCH)goFull();startLevel(pendingIdx);};
$('bQual').onclick=()=>{const o=['low','med','high'],cur=SAVE.q||(IS_TOUCH?'med':'high');SAVE.q=o[(o.indexOf(cur)+1)%3];saveGame();qualLabel();if(renderer){renderer.setPixelRatio(QPR());renderer.setSize(VW,VH,false);}};
$('bResume').onclick=()=>setPause(false);
$('bRetry1').onclick=()=>startLevel(G.idx);$('bRetry2').onclick=()=>startLevel(G.idx);
$('bMenu1').onclick=toMenu;$('bMenu2').onclick=toMenu;
$('bNext').onclick=()=>openIntro(Math.min(G.idx+1,MAPS.length*3-1));

/* ---------- الحلقة الرئيسية ---------- */
let last=0;
function frame(ts){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,Math.max(0,(ts-last)/1000||0));last=ts;
  if(G){
    if(mode==='play'){update(dt);updateHUD();}
    if(mode==='play'||mode==='pause'||mode==='result')render();
  }
  edge.clear();
}
if(initThree()){qualLabel();requestAnimationFrame(frame);}else show('nogl');

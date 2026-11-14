/* ---------- approval readiness check ---------- */
var RDY=[
 {k:'minEx',n:'Minimum number of exits for the venue',d:2},
 {k:'exW',n:'Minimum clear width of a venue exit, m (SASREA Reg 5(18)(b): 1.2)',d:1.2},
 {k:'two',n:'An enclosed structure holding more than this needs 2+ exits (SANS 10400-T 4.17.2: 25)',d:25},
 {k:'apart',n:'Two exits of one structure at least this far apart, m (SANS 10400-T 4.17.1: 5)',d:5},
 {k:'travel',n:'Longest travel to an exit, m (SANS 10400-T 4.16: 45)',d:45},
 {k:'asmN',n:'Assembly areas needed (SASREA Reg 5(12): 2)',d:2},
 {k:'asm',n:'Assembly point: minimum distance from any structure, m (planning figure)',d:20},
 {k:'fireA',n:'Floor area per fire extinguisher, m² (SANS 10400-T Table 11: 200)',d:200},
 {k:'fireMin',n:'Structures from this area (m²) need fire equipment',d:20},
 {k:'fireD',n:'Fire equipment counts if within this distance of the structure (m)',d:5},
 {k:'seatRun',n:'Most seats in one row between aisles (SASREA Reg 6(3)(g): 28)',d:28},
 {k:'aisle',n:'Narrowest aisle between seat blocks, m (SANS 10400-T 4.49.4: 1.1)',d:1.1},
 {k:'gap',n:'Minimum gap between tents / marquees, m (fire by-law figure, not SASREA or SANS 10400)',d:3},
 {k:'gapGz',n:'Minimum gap between two gazebos, m (fire by-law figure)',d:1.5},
 {k:'aidCap',n:'Structures holding at least this many people need first aid nearby',d:200},
 {k:'aidD',n:'First aid counts as nearby within (m)',d:30},
 {k:'sgn',n:'Exit sign must be within this distance of an exit door (m)',d:4}
];
function rv(k){var v=(S.meta.rdy||{})[k];if(v!=null&&isFinite(v)&&v>=0)return +v;if(k==='gap'){var RG=regionOf();if(RG)return RG.gap}for(var i=0;i<RDY.length;i++)if(RDY[i].k===k)return RDY[i].d;return 0}
function segD(p,a,b){var dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy))}
function inPoly(p,P){var c=false,i,j;for(i=0,j=P.length-1;i<P.length;j=i++)if((P[i].y>p.y)!==(P[j].y>p.y)&&p.x<(P[j].x-P[i].x)*(p.y-P[i].y)/(P[j].y-P[i].y)+P[i].x)c=!c;return c}
function segX(a,b,c,d){function o(p,q,r){return (q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x)}var d1=o(a,b,c),d2=o(a,b,d),d3=o(c,d,a),d4=o(c,d,b);return d1*d2<0&&d3*d4<0}
function polyGap(A,B){
 var i,j,m=Infinity;
 for(i=0;i<A.length;i++){if(inPoly(A[i],B))return 0;for(j=0;j<B.length;j++){var a2=A[(i+1)%A.length],b2=B[(j+1)%B.length];if(segX(A[i],a2,B[j],b2))return 0}}
 for(j=0;j<B.length;j++)if(inPoly(B[j],A))return 0;
 for(i=0;i<A.length;i++)for(j=0;j<B.length;j++){m=Math.min(m,segD(A[i],B[j],B[(j+1)%B.length]),segD(B[j],A[i],A[(i+1)%A.length]))}
 return m}
function ptPolyD(p,P){if(inPoly(p,P))return 0;var m=Infinity;for(var i=0;i<P.length;i++)m=Math.min(m,segD(p,P[i],P[(i+1)%P.length]));return m}
/* arena chairs grouped into unbroken runs along each row: seats in the run, its ends, and the row it sits in */
function seatRuns(){
 var G={},runs=[];
 S.objs.forEach(function(o){if(o.t!=='rect'||o.hd||o.ev||o.lay)return;var l=LIBM[o.k];if(!l||l.s!=='chairs')return;
  var rt=((o.rot%180)+180)%180;if(rt>179.5)rt=0;var r=rt*D2R,cs=Math.cos(r),sn=Math.sin(r),al=o.x*cs+o.y*sn,ry=-o.x*sn+o.y*cs,key=Math.round(rt)+'|'+Math.round(ry/.1);
  (G[key]=G[key]||[]).push({o:o,a0:al-o.w/2,a1:al+o.w/2,ry:ry,rt:Math.round(rt),n:seatN(o),dp:o.h})});
 Object.keys(G).forEach(function(k){var L=G[k].sort(function(p,q){return p.a0-q.a0}),cur=null;
  L.forEach(function(it){if(cur&&it.a0-cur.a1<.3){cur.a1=Math.max(cur.a1,it.a1);cur.n+=it.n;cur.ids.push(it.o.id)}else{cur={a0:it.a0,a1:it.a1,n:it.n,ids:[it.o.id],ry:it.ry,rt:it.rt,dp:it.dp};runs.push(cur)}})});
 return runs}
function rdyRun(){
 var F=[],objs=S.objs.filter(function(o){return !o.hd&&!o.ev&&!o.lay}),m=S.meta;
 function add(sev,cat,msg,ids,fix){F.push({sev:sev,cat:cat,msg:msg,ids:ids||[],fix:fix||''})}
 var C=crowdAll(),att=C.att,units=C.units;
 var exits=exitDoors(),signs=function(k){return objs.filter(function(o){return o.t==='sign'&&o.k===k})};
 var dist=function(a,b){return Math.hypot(a.x-b.x,a.y-b.y)};
 /* 1 plan basics */
 var unc=S.layers.filter(function(L){return L.vis!==false&&!L.cal});
 if(unc.length)add('warn','Plan basics','Background image'+(unc.length>1?'s are':' is')+' not calibrated ('+unc.map(function(L){return L.name||'image'}).join(', ')+'). Anything traced over it may not be to scale.',[],'Images tab → Calibrate.');
 if(!(att>0))add('fail','Plan basics','Expected attendance has not been entered. Capacity and exit checks cannot be judged without it.',[],'Sheet tab → Expected attendance.');
 if(!regionOf())add('fail','Municipality','No municipality is selected, so no local by-laws are applied.',[],'Sheet tab → Municipality.');
 if(!m.tstart||!m.tend)add('warn','Plan basics','Event start and end times are not entered.',[],'Sheet tab → Event times.');
 if(!objs.length){add('fail','Plan basics','The plan is empty.');return F}
 if(C.open&&C.open.occ>=C.open.area)add('warn','Capacity','The event area ('+cfmt(C.open.area)+' m²) is no bigger than the structures on it ('+cfmt(C.open.occ)+' m²), so no open ground is counted. Check the area figure or boundary.',[],'Crowd & capacity → enter the whole fenced area.');
 if(att>0&&!siteBoundary()&&!(+S.meta.siteArea>0))add('warn','Capacity','No event site area is set, so open ground is not counted in the capacity. Type the venue\'s total event area (m²) in Crowd & capacity (no need to draw existing fencing), or draw a boundary.',[],'Crowd & capacity → type the event area → Set.');
 /* 2 capacity */
 if(att>0&&C.total>0){if(C.over)add('fail','Capacity','Expected attendance ('+cfmt(att)+') is more than the planned capacity ('+cfmt(C.total)+').',[],'Add space, reduce the crowd, or change how each structure is used.');
  else add('pass','Capacity','Planned capacity '+cfmt(C.total)+' covers the expected '+cfmt(att)+'.')}
 else if(att>0&&!(C.total>0))add('warn','Capacity','Attendance is entered but no structures or areas give a capacity. Draw zones/tents or add a perimeter line.');
 /* 3 exits (venue) */
 var ne=exits.length,mn=rv('minEx');
 if(!ne)add('fail','Exits','No exits are placed. Add exit doors (Doors) at every way out.',[],'Library → Doors → Exit.');
 else{
  if(ne<mn)add('fail','Exits','Only '+ne+' exit'+(ne>1?'s':'')+' placed; the minimum set is '+mn+'.',exits.map(function(e){return e.id}));
  else add('pass','Exits',ne+' exits placed.');
  var narrow=exits.filter(function(e){return (e.w||0)+1e-6<rv('exW')});
  if(narrow.length)add('fail','Exits',narrow.length+' exit'+(narrow.length>1?'s are':' is')+' narrower than '+rv('exW')+' m ('+narrow.map(function(e){return (Math.round((e.w||0)*100)/100)+' m'}).join(', ')+').',narrow.map(function(e){return e.id}),'Widen the door or add another exit.');
  if(att>0&&C.evTime!==null&&C.evTime<=15&&C.evTime>C.T)add('warn','Exits','The crowd clears in about '+(C.evTime<10?C.evTime.toFixed(1):Math.round(C.evTime))+' min: inside the SASREA 15 minutes but over your own target of '+C.T+' min.',exits.map(function(e){return e.id}),'Add or widen exits, or change the target on the Sheet tab.');
 }
 /* 3b SASREA Regulations 2017, row by row */
 sasrea(C).forEach(function(r){var cat='SASREA '+r.reg,msg=r.what+'. Needed: '+r.need+'. On the plan: '+r.have+'.';
  if(r.ok===true)add('pass',cat,msg);else if(r.ok===false)add('fail',cat,msg,/gate|evacuat|safety/i.test(r.what)?exits.map(function(e){return e.id}):[],'See Crowd & capacity for the figures.');else add('warn',cat,msg+' Cannot be judged from the drawing alone.')});
 if(att>0&&att<2000&&!(+m.certCap>=2000))add('info','SASREA','Expected attendance is under 2,000. The Act defines a venue as holding at least 2,000 (s 1), so SASREA may not strictly apply; the checks are still good practice and the local authority and by-laws decide.');
 if(C.total>C.sans&&C.sans>0)add('warn','Capacity','The plan counts '+cfmt(C.total)+' people but the SANS 10400-A design population (Reg A21: fixed seats, or 1 person per m²) is '+cfmt(C.sans)+'. Denser standing needs the local authority\'s agreement or a rational design.',[],'Use "Standing (1 m² each)" or get the higher figure certified.');
 if(C.merged&&C.merged.length)add('info','Open structures',C.merged.length+' open-sided tent'+(C.merged.length>1?'s are':' is')+' counted as part of the open ground, not as closed rooms.');
 /* 4 per structure */
 var tents=objs.filter(function(o){if(o.t!=='rect')return false;var l=LIBM[o.k];return l&&l.c==='Tents'&&l.s!=='stall'});
 var asm=signs('assembly'),fire=objs.filter(function(o){return o.t==='sign'&&(o.k==='fire_ext'||o.k==='hose_reel')}),aid=objs.filter(function(o){return (o.t==='sign'&&o.k==='first_aid')||(o.t==='rect'&&o.k==='faid')});
 var panic=false;
 units.forEach(function(u){
  var o=u.o,P=selOutline(o).pts,id=[o.id],nm=u.name+' ('+cfmt(u.gross)+' m²)';
  var near=function(arr,d){return arr.filter(function(q){return ptPolyD({x:q.x,y:q.y},P)<=d})};
  if(u.pop>0&&!u.opn){
   var cat='Structure: '+nm,xs=u.exs||[],eid=xs.map(function(e){return e.id}),nx=Math.max(u.pop>rv('two')?2:1,sansExitsFor(u.pop));
   if(u.nex===0)add('fail',cat,'"'+nm+'" is enclosed and holds '+cfmt(u.pop)+' people but has no exit at it (SANS 10400-T 4.16).',id,'Place exit doors on its edge, or tick "Open-sided" if its sides are open.');
   else{
    if(u.nex<nx)add('fail',cat,'"'+nm+'" holds '+cfmt(u.pop)+' people and has '+u.nex+' exit'+(u.nex===1?'':'s')+'; it needs '+nx+' (SANS 10400-T 4.17.2: more than 25 people two exits, more than 240 three; 4.21.2: no exit serves more than 190 and the widest is left out).',id.concat(eid),'Add exits, spread around the structure.');
    if(u.esc.cap<u.pop)add('fail',cat,'The exits of "'+nm+'" can serve '+cfmt(u.esc.cap)+' people under SANS 10400-T Table 10 (120 at 1.1 m up to 190 at 1.8 m each, widest exit left out), but the floor holds '+cfmt(u.pop)+'. Its capacity is cut to '+cfmt(u.cap)+'.',id.concat(eid),'Add exits or widen them towards 1.8 m.');
    var mw=u.pop>25?1.1:.75,nr=xs.filter(function(e){return (e.w||0)+1e-6<mw});
    if(nr.length)add('fail',cat,nr.length+' exit'+(nr.length>1?'s':'')+' of "'+nm+'" '+(nr.length>1?'are':'is')+' under '+mw+' m clear (SANS 10400-T '+(u.pop>25?'Table 10':'4.17.1')+').',nr.map(function(e){return e.id}),'Widen the door.');
    var close=false,i2,j2;for(i2=0;i2<xs.length;i2++)for(j2=i2+1;j2<xs.length;j2++)if(dist(xs[i2],xs[j2])+1e-6<rv('apart'))close=true;
    if(close&&u.nex>=2)add('fail',cat,'Two exits of "'+nm+'" are less than '+rv('apart')+' m apart (SANS 10400-T 4.17.1).',eid,'Move one to another side.');
    var far=0;P.forEach(function(p){var best=Infinity;xs.forEach(function(e){best=Math.min(best,dist(p,e))});far=Math.max(far,best)});
    if(far>rv('travel'))add('fail',cat,'Farthest point of "'+nm+'" is about '+Math.round(far)+' m from its nearest exit (SANS 10400-T 4.16 limit '+rv('travel')+' m; straight line, the walked route is longer).',id,'Add an exit nearer to that end.');
    if(!F.some(function(f){return f.cat===cat&&f.sev==='fail'}))add('pass',cat,'"'+nm+'": '+u.nex+' exits serve '+cfmt(u.esc.cap)+' people for '+cfmt(u.pop)+' on the floor (SANS 10400-T 4.17, 4.21).')}
   if(u.pop>60&&!panic){panic=true;add('info','Exit doors','Enclosed structures holding more than 60 people need panic bars on any lockable exit door, doors opening outwards, lit exit signs and emergency lighting (SANS 10400-T 4.16.10, 4.17.3, 4.29.4, 4.30).')}
  }
  if(u.gross>=rv('fireMin')){var nf=near(fire,rv('fireD')).length,rq=Math.max(1,Math.ceil(u.gross/rv('fireA')));
   if(nf<rq)add('fail','Structure: '+nm,'"'+nm+'" has '+nf+' fire extinguisher'+(nf===1?'':'s')+' at it; '+rq+' needed ('+cfmt(u.gross)+' m² at 1 per '+rv('fireA')+' m², SANS 10400-T 4.37 Table 11).',id,'Signs → Fire → extinguisher.')}
  if(u.pop>=rv('aidCap')&&!near(aid,rv('aidD')).length)add('warn','Structure: '+nm,'"'+nm+'" holds '+cfmt(u.pop)+' people but there is no first aid point within '+rv('aidD')+' m.',id,'Place a first aid post or sign near it.');
 });
 var nopn=units.filter(function(u){return u.opn}).length;if(nopn)add('info','Open structures',nopn+' open zone'+(nopn>1?'s or structures are':' or structure is')+' not checked for exits: people can leave in any direction, so the venue exits serve them.');
 if(m.mode==='indoor'){var big=units.filter(function(u){return !u.opn&&u.gross>250});if(big.length&&!objs.some(function(o){return o.t==='sign'&&o.k==='hose_reel'}))add('warn','Fire equipment','Indoor floor over 250 m² with no hose reel shown. SANS 10400-T 4.34 asks for one per 500 m².',big.map(function(u){return u.o.id}),'Signs → Fire → hose reel, at the venue\'s real positions.')}
 /* 4b seating rows */
 var runs=seatRuns();
 if(runs.length){var sr=rv('seatRun'),long=runs.filter(function(r){return r.n>sr}),ai=rv('aisle'),nar2=[],tight=[];
  long.slice(0,6).forEach(function(r){add('fail','Seating','A row of '+r.n+' seats has no aisle break. The most between two aisles is '+sr+', or 14 with an aisle at one end only (SASREA Reg 6(3)(g)).',r.ids,'Split the row with an aisle of at least '+ai+' m.')});
  if(long.length>6)add('fail','Seating',(long.length-6)+' more rows are longer than '+sr+' seats.');
  runs.forEach(function(a){runs.forEach(function(b){if(a===b||a.rt!==b.rt)return;
   if(Math.abs(a.ry-b.ry)<.06&&b.a0>a.a1){var g=b.a0-a.a1;if(g>=.3&&g+1e-6<ai&&nar2.length<200)nar2.push(a.ids.concat(b.ids))}
   var dr=b.ry-a.ry;if(dr>.06&&dr<1.6&&b.a0<a.a1-.2&&b.a1>a.a0+.2){var cl=dr-a.dp,pass=Math.ceil(Math.max(a.n,b.n)/2),nd=pass<=14?.3:pass<=24?.4:.5;if(cl+1e-6<nd)tight.push([a.ids.concat(b.ids),cl,nd])}})});
  if(nar2.length)add('fail','Seating',nar2.length+' gap'+(nar2.length>1?'s':'')+' between seat blocks '+(nar2.length>1?'are':'is')+' narrower than '+ai+' m, too tight to count as an aisle (SANS 10400-T 4.49.4).',nar2[0],'Open the aisle to '+ai+' m or close the gap.');
  if(tight.length){tight.sort(function(p,q){return p[1]-q[1]});add('fail','Seating',tight.length+' pair'+(tight.length>1?'s':'')+' of rows '+(tight.length>1?'are':'is')+' too close: '+(Math.round(tight[0][1]*100))+' cm clear between rows where '+(tight[0][2]*100)+' cm is needed (SANS 10400-T 4.49.3(c); SASREA Reg 6(3)(g) asks 400 mm).',tight[0][0],'Use a row spacing of 0.95 m.')}
  if(!long.length&&!nar2.length&&!tight.length)add('pass','Seating',runs.length+' seat rows: none longer than '+sr+' seats, aisles at least '+ai+' m, rows far enough apart.')}
 if(units.length&&units.every(function(u){return u.gross<rv('fireMin')}))add('info','Fire equipment','All structures are under '+rv('fireMin')+' m², so none needs its own fire equipment under these settings.');
 if(!fire.length&&objs.length>3&&!F.some(function(f){return f.cat.indexOf('Structure')===0&&/fire extinguisher/.test(f.msg)}))add('fail','Fire equipment','No fire extinguishers or hose reels are placed anywhere on the plan.',[],'Signs → Fire.');
 /* 5 first aid, venue */
 if(!aid.length)add(att>0?'fail':'warn','First aid','No first aid post or sign is on the plan.',[],'Library → First aid post.');
 else add('pass','First aid',aid.length+' first aid point'+(aid.length>1?'s':'')+' placed.');
 /* 6 assembly */
 if(!asm.length)add('fail','Assembly point','No assembly point is placed.',[],'Signs → Safe → Assembly point.');
 else{
  if(asm.length<rv('asmN'))add('fail','Assembly point','Only '+asm.length+' assembly point placed; SASREA Reg 5(12) asks for at least '+rv('asmN')+', accessible, level, lit and signed.',asm.map(function(a){return a.id}),'Add a second one on another side of the site.');
  var allP=tents.map(function(o){return {o:o,P:selOutline(o).pts}}).concat(units.filter(function(u){return u.o.t!=='rect'}).map(function(u){return {o:u.o,P:selOutline(u.o).pts}}));
  var bad=[];asm.forEach(function(a){var inside=null,mind=Infinity;tents.forEach(function(t){var P=selOutline(t).pts,d=ptPolyD({x:a.x,y:a.y},P);if(d<mind)mind=d;if(d===0)inside=t});
   if(inside)add('fail','Assembly point','An assembly point is inside "'+((LIBM[inside.k]||{}).n||'a structure')+'". It must be in the open, clear of buildings and tents.',[a.id],'Move it outside.');
   else if(mind<rv('asm'))bad.push(a)});
  if(bad.length&&bad.length===asm.length)add('warn','Assembly point','The nearest assembly point is only '+Math.round(Math.min.apply(null,bad.map(function(a){var b=Infinity;tents.forEach(function(t){b=Math.min(b,ptPolyD({x:a.x,y:a.y},selOutline(t).pts))});return b})))+' m from a structure (set minimum '+rv('asm')+' m). A collapse or fire could reach it.',bad.map(function(a){return a.id}),'Move it farther from structures.');
  else if(!F.some(function(f){return f.cat==='Assembly point'&&f.sev!=='pass'}))add('pass','Assembly point',asm.length+' assembly point'+(asm.length>1?'s':'')+' placed, clear of structures.')}
 /* 7 exit signs */
 var xs=objs.filter(function(o){return o.t==='sign'&&(o.k==='exit_run'||o.k==='exit_run_r'||o.k==='exit_box'||o.k==='exit_sign')});
 var nosign=exits.filter(function(e){return !xs.some(function(s){return dist(s,e)<=rv('sgn')})});
 if(exits.length&&nosign.length)add('warn','Exit signage',nosign.length+' exit'+(nosign.length>1?'s have':' has')+' no exit sign within '+rv('sgn')+' m.',nosign.map(function(e){return e.id}),'Signs → Safe → Emergency exit sign.');
 else if(exits.length)add('pass','Exit signage','Every exit has an exit sign (SASREA Reg 5(9), 5(14); SANS 10400-T 4.29).');
 /* 8 tent spacing */
 var tp=tents.map(function(t){return {o:t,P:selOutline(t).pts}}),gp=rv('gap'),sp=0,bs=[],isGz=function(o){return (LIBM[o.k]||{}).s==='gazebo'};
 for(var i=0;i<tp.length;i++)for(var j=i+1;j<tp.length;j++){
  var bi=boundsOf(tp[i].o),bj=boundsOf(tp[j].o);
  var pg=(isGz(tp[i].o)&&isGz(tp[j].o))?rv('gapGz'):gp;
  if(bi.x0-pg>bj.x1||bj.x0-pg>bi.x1||bi.y0-pg>bj.y1||bj.y0-pg>bi.y1)continue;
  var g=polyGap(tp[i].P,tp[j].P);if(g<pg-1e-6){sp++;bs.push([tp[i].o,tp[j].o,g,pg])}}
 bs.sort(function(a,b){return a[2]-b[2]});
 bs.slice(0,12).forEach(function(b){var n1=(LIBM[b[0].k]||{}).n||'structure',n2=(LIBM[b[1].k]||{}).n||'structure';add('fail','Tent spacing',n1+' and '+n2+' are '+(b[2]<0.05?'touching or overlapping':(Math.round(b[2]*10)/10)+' m apart')+' (minimum '+b[3]+' m).',[b[0].id,b[1].id],'Move them apart or confirm with the fire officer that this is allowed.')});
 if(bs.length>12)add('fail','Tent spacing',(bs.length-12)+' more pairs are closer than '+gp+' m.');
 if(tp.length>1&&!sp)add('pass','Tent spacing','All '+tp.length+' tents / marquees are at least '+gp+' m apart.');
 /* 8b the municipality's own by-laws */
 regionFindings(add,C,objs);
 /* 9 evacuation routes */
 if(!S.objs.some(function(o){return o.ev}))add('info','Evacuation plan','No evacuation routes generated yet. Use the Evacuation view → Generate to add them to the plan.');
 return F}
function rdyIds(F,f){return f.ids}
function rdyModal(){
 var F=rdyRun(),nf=F.filter(function(f){return f.sev==='fail'}).length,nw=F.filter(function(f){return f.sev==='warn'}).length,np=F.filter(function(f){return f.sev==='pass'}).length;
 var ok=nf===0,col=nf?'#c62828':nw?'#b45309':'#12804a';
 var h='<h3>Approval readiness check</h3><p class="note"><b>'+esc(S.meta.event||'')+'</b> · '+esc(S.meta.venue||'')+'</p>';
 h+='<div style="padding:10px 12px;border-radius:10px;border:2px solid '+col+';margin:8px 0"><b style="color:'+col+'">'+(nf?nf+' problem'+(nf>1?'s':'')+' to fix before submitting':nw?'No blocking problems, '+nw+' to review':'No problems found')+'</b><br><small>'+nf+' to fix · '+nw+' to review · '+np+' passed</small></div>';
 var order={fail:0,warn:1,info:2,pass:3},lab={fail:'FIX',warn:'REVIEW',info:'NOTE',pass:'OK'},cc={fail:'#c62828',warn:'#b45309',info:'#5b6b78',pass:'#12804a'};
 F.slice().sort(function(a,b){return order[a.sev]-order[b.sev]}).forEach(function(f,i){
  var idx=F.indexOf(f);
  h+='<div style="display:flex;gap:8px;padding:7px 0;border-top:1px solid #e3e8ec;align-items:flex-start"><span style="flex:none;min-width:58px;font-weight:700;font-size:11px;color:'+cc[f.sev]+'">'+lab[f.sev]+'</span><div style="flex:1;font-size:13px"><small style="color:#5b6b78">'+esc(f.cat)+'</small><br>'+esc(f.msg)+(f.fix&&f.sev!=='pass'?'<br><small style="color:#5b6b78">How to fix: '+esc(f.fix)+'</small>':'')+'</div>'+(f.ids&&f.ids.length?'<button class="btn sm" data-rshow="'+idx+'">Show</button>':'')+'</div>'});
 h+='<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:600">Settings used by this check (editable)</summary><div class="row2" style="margin-top:6px">'+RDY.map(function(x){return '<label class="fld">'+esc(x.n)+'<input type="number" step="any" min="0" data-rset="'+x.k+'" value="'+rv(x.k)+'"></label>'}).join('')+'</div><p class="note"><a href="#" id="rdy_reset">Reset to defaults</a></p></details>';
 h+='<p class="note">Each check names the rule it comes from: the SASREA Regulations of 3 March 2017, SANS 10400-A (population) and SANS 10400-T (fire protection and escape). Tent spacing comes from the selected municipality\'s fire by-law where it gives one; the assembly-point distance is a planning figure. This is a planning check, not a legal opinion: the local authority, the fire department and the ESSPC decide. Distances are straight lines, so real walking routes are longer. The aisle width check is separate (Objects tab).</p>';
 h+='<div class="mrow" style="justify-content:flex-start"><button class="btn" id="rdy_dl">Download report</button></div>';
 box(h);var mb=$('#modal .mbox');if(mb){mb.style.maxWidth='720px';mb.style.maxHeight='86vh';mb.style.overflow='auto'}
 $$('[data-rshow]',$('#modal')).forEach(function(b){b.onclick=function(){var f=F[+b.dataset.rshow],os=S.objs.filter(function(o){return f.ids.indexOf(o.id)>=0});if(!os.length)return;
  $('#modal').classList.remove('on');$('#modal').innerHTML='';setSel(f.ids);var bb=null;os.forEach(function(o){var q=boundsOf(o);if(!bb)bb={x0:q.x0,y0:q.y0,x1:q.x1,y1:q.y1};else{bb.x0=Math.min(bb.x0,q.x0);bb.y0=Math.min(bb.y0,q.y0);bb.x1=Math.max(bb.x1,q.x1);bb.y1=Math.max(bb.y1,q.y1)}});
  bb.x0-=8;bb.y0-=8;bb.x1+=8;bb.y1+=8;fitTo(bb,.3);renderSelbar();draw();toast(f.msg,6000)}});
 $$('[data-rset]',$('#modal')).forEach(function(i){i.onchange=function(){var v=parseFloat(i.value);S.meta.rdy=S.meta.rdy||{};if(isFinite(v)&&v>=0)S.meta.rdy[i.dataset.rset]=v;else delete S.meta.rdy[i.dataset.rset];saveLocal();rdyModal()}});
 var rr=$('#rdy_reset');if(rr)rr.onclick=function(e){e.preventDefault();S.meta.rdy={};saveLocal();rdyModal()};
 $('#rdy_dl').onclick=function(){var s='<!doctype html><meta charset="utf-8"><title>Approval readiness</title><body style="font-family:Arial,sans-serif;max-width:800px;margin:20px auto"><h2>Approval readiness check</h2><p>'+esc(S.meta.event||'')+' · '+esc(S.meta.venue||'')+' · '+esc(S.meta.date||'')+' · '+esc(S.meta.ref||'')+' Rev '+esc(S.meta.rev||'')+'</p><p><b>'+nf+' to fix · '+nw+' to review · '+np+' passed</b></p><table border="1" cellpadding="5" style="border-collapse:collapse;width:100%;font-size:13px">'+F.slice().sort(function(a,b){return order[a.sev]-order[b.sev]}).map(function(f){return '<tr><td>'+lab[f.sev]+'</td><td>'+esc(f.cat)+'</td><td>'+esc(f.msg)+'</td></tr>'}).join('')+'</table><p style="font-size:11px;color:#555">Planning check, not a legal opinion. Settings: '+RDY.map(function(x){return esc(x.n)+' = '+rv(x.k)}).join('; ')+'</p></body>';
  download('Readiness_'+(S.meta.ref||'plan')+'.html',new Blob([s],{type:'text/html'}))}
}
function sitePanel(o){return '<h4>Event site</h4>'+pchk('site','Event site boundary (the whole event area: open ground inside it is counted in the crowd capacity)',o.site)+'<p class="note">Draw one Shape around the whole event, tick this, and the space not taken up by structures counts as standing room.</p>'}
function crowdPanel(o){
 var u=crowdUnit(o),C=crowdAll(),h='<h4>Crowd capacity</h4>'+pchk('nc','Leave out of the crowd calculation',o.nc);
 if(!o.nc){h+=psel('use','Used as',DENS.map(function(x){return [x.k,x.n+' · '+dOf(x.k)+' m² each']}),o.use||'sgen')+'<div class="row2">'+pf('dens','Own density (m² each, 0 = preset)',o.dens||0,'number','step="any" min="0"')+pf('pax','Fixed headcount (0 = calculate)',o.pax||0,'number','step="1" min="0"')+'</div>';
  h+='<div class="note">Area <b>'+cfmt(u.gross)+' m²</b>'+(u.hasLay?' · usable after its internal layout <b>'+cfmt(u.net)+' m²</b>':'')+(u.seats?' · table seats <b>'+u.seats+'</b>':'')+'<br>Capacity: <b>'+cfmt(u.cap)+' people</b>'+(u.how==='seats'?' (table seats)':u.how==='fixed'?' (fixed)':' ('+u.d+' m² each)')+''+(u.lim?' <span style="color:#c62828">limited by its exits; the floor would hold '+cfmt(u.pop)+'</span>':'')+(u.opn?'<br>Open-sided: counted as event space, no exits required here':'<br>Enclosed: <b>'+u.nex+' exit'+(u.nex===1?'':'s')+'</b> serving <b>'+cfmt(u.esc.cap)+'</b> people (SANS 10400-T Table 10); '+cfmt(u.pop)+' people need '+sansExitsFor(u.pop))+'</div>'+pchk('opn','Open-sided (sides open: counts as event space, not a closed room, and needs no exits of its own)',u.opn)}
 return h}
function lineLen(o){var s=0,P=o.pts,pp=o.closed?P.concat([P[0]]):P,gs=o.gaps||[];for(var i=0;i<pp.length-1;i++){if(gs.indexOf(i)>=0)continue;s+=Math.hypot(pp[i+1].x-pp[i].x,pp[i+1].y-pp[i].y)}return s}
function lineLenAll(o){var s=0,P=o.pts,pp=o.closed?P.concat([P[0]]):P;for(var i=0;i<pp.length-1;i++)s+=Math.hypot(pp[i+1].x-pp[i].x,pp[i+1].y-pp[i].y);return s}
function drawText(c,o){var sz=o.size||14,ls=String(o.text||'').split('\n'),n=ls.length;c.save();c.translate(o.x,o.y);c.rotate((o.rot||0)*D2R);ls.forEach(function(t,i){txt(c,t,0,px((i-(n-1)/2)*sz*1.2),sz,{bold:o.b!==false,halo:o.hl!==false,col:o.col})});c.restore()}
function textBox(o){var sz=o.size||14,ls=String(o.text||'').split('\n'),w=0;ls.forEach(function(t){w=Math.max(w,tw(ctx,t,sz,o.b!==false))});return {w:w,h:ls.length*sz*1.2}}
function drawObj(c,o,ic){
 c.save();
 if(o.t==='rect'){c.translate(o.x,o.y);c.rotate(o.rot*D2R);drawItem(c,o,ic)}
 else if(o.t==='area'){drawArea(c,o,ic)}
 else if(o.t==='door'){drawDoor(c,o,ic)}
 else if(o.t==='sign'){c.translate(o.x,o.y);c.rotate(o.rot*D2R);drawSign(c,o.k,R.exp?Math.max(o.s,px(19)):o.s)}
 else if(o.t==='line'){drawLineObj(c,o,ic)}
 else if(o.t==='text'){drawText(c,o)}
 else if(o.t==='poly'){drawPoly(c,o,ic)}
 else if(o.t==='dim'){dimLine(c,o.a,o.b,o.off||0,o.label||null)}
 c.restore();
}
var PASS=['area','line','rect','door','sign','text','dim'];
var PRI={area:0,poly:0,line:1,rect:2,door:3,sign:4,text:5,dim:6};
function layoutOf(id){return (S.meta.layouts||[]).filter(function(l){return l.id===id})[0]}


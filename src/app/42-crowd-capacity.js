/* ---------- crowd & capacity ---------- */
var DENS=[
 {k:'sdense',n:'Standing, dense (above SANS 10400-A: needs approval)',d:0.5},
 {k:'sgen',n:'Standing (SANS 10400-A: 1 m² each)',d:1},
 {k:'seat',n:'Seated at tables (counts table seats)',d:1.5},
 {k:'rows',n:'Seated in rows (counts the chairs drawn)',d:0.6},
 {k:'exh',n:'Exhibition floor (open area, net of stands)',d:2},
 {k:'open',n:'Open ground (SANS 10400-A: 1 m² each)',d:1}
];
function dOf(k){var v=(S.meta.dens||{})[k];if(v>0)return v;for(var i=0;i<DENS.length;i++)if(DENS[i].k===k)return DENS[i].d;return 1}
function isUnit(o){
 if(!o||o.hd||o.ev||o.site)return false;
 if(o.lay){var ly=layoutOf(o.lay);if(!ly||ly.src!==o.id)return false}
 if(o.t==='area'||o.t==='poly')return true;
 if(o.t==='rect'){var l=LIBM[o.k];return !!l&&l.c==='Tents'&&l.s!=='stall'}
 return false}
function unitGross(o){return o.t==='poly'?Math.abs(polyArea(o.pts)):(o.t==='area'?areaSqm(o):o.w*o.h)}
/* open-sided = people can walk out in any direction, so it is event space, not a room. Tents follow the library (gazebo, Bedouin: open;
   marquee, dome: closed) unless ticked; a drawn zone is open outdoors and a room indoors; "all tents open" on the Sheet tab overrides the library. */
function isOpenStruct(o){if(!o)return false;if(o.opn===true||o.opn===false)return o.opn;if(o.t==='area'||o.t==='poly')return S.meta.mode!=='indoor';if(S.meta.allOpen)return true;var l=LIBM[o.k];return !!(l&&l.opn)}
/* ---- SANS 10400-T:2011 (fire protection), clause 4.21 Table 10: people one escape route may serve, from its clear width.
   Under 750 mm is not an exit; 750 mm serves a room of up to 25 (4.17.1, 4.20.1); 1.1 m serves 120, +10 people per extra 100 mm, to 190 at 1.8 m (4.21.2(a): never more than 190 per route). */
function sansRoute(w){w=+w||0;if(w+1e-9<.75)return 0;if(w+1e-9<1.1)return 25;return Math.min(190,120+10*Math.floor((w-1.1)/.1+1e-6))}
/* how many people a room's exits can serve: one exit serves at most 25 (4.17.2); with two or more, the widest is left out (4.21.2(b)) */
function sansEscape(ws){var p=ws.map(sansRoute).filter(function(v){return v>0}).sort(function(a,b){return b-a}),n=p.length,i,sm=0;if(!n)return {n:0,cap:0};if(n===1)return {n:1,cap:Math.min(25,p[0])};for(i=1;i<n;i++)sm+=p[i];return {n:n,cap:sm}}
/* exits a room needs for its population: more than 25 → two, more than 240 → three (4.17.2); and enough 190-person routes with one left out (4.21.2) */
function sansExitsFor(P){if(!(P>25))return 1;return Math.max(P>240?3:2,Math.ceil(P/190)+1)}
/* SANS 10400 sanitary fixtures for the public at peak demand (the "Table 7" SASREA Reg 5(4) points to), half the crowd male and half female */
function sansToilets(pop){
 var n=Math.ceil(pop/2),B=[50,100,150,250,500,1000,1500],MW=[1,1,1,2,3,3,4],UR=[1,2,3,4,7,12,15],MB=[1,1,1,2,3,4,5],FW=[2,3,5,7,12,16,20],FB=[1,2,3,4,6,7,8],i=0;
 if(!(n>0))return {mwc:0,ur:0,fwc:0,whb:0,pans:0};
 if(n<=1500){while(n>B[i])i++;return {mwc:MW[i],ur:UR[i],fwc:FW[i],whb:MB[i]+FB[i],pans:MW[i]+UR[i]+FW[i]}}
 var x=n-1500,r={mwc:4+Math.ceil(x/500),ur:15+Math.ceil(x/300),fwc:20+Math.ceil(x/150),whb:5+8+2*Math.ceil(x/500)};r.pans=r.mwc+r.ur+r.fwc;return r}
function siteBoundary(){
 var best=null,o,P;
 S.objs.forEach(function(q){if(q.site&&!q.hd&&!q.ev&&(q.t==='poly'||q.t==='area'||(q.t==='line'&&q.closed))&&!best)best=q});
 if(best){o=best;P=selOutline(o).pts;var ar=o.t==='area'?areaSqm(o):Math.abs(polyArea(o.pts));return {o:o,P:P,area:ar,src:'site',name:o.label||'Event site'}}
 var pa=0,per=null;S.objs.forEach(function(q){if(q.t==='line'&&q.closed&&q.pts&&q.pts.length>2&&q.style!=='evac'&&!q.hd&&!q.ev&&!q.lay){var a=Math.abs(polyArea(q.pts));if(a>pa){pa=a;per=q}}});
 if(per)return {o:per,P:per.pts,area:pa,src:'line',name:'Closed perimeter line'};
 return null}
function exitDoors(){var en=S.meta.evEntr!==false;return S.objs.filter(function(d){return d.t==='door'&&!d.hd&&!d.ev&&(d.k==='exit'||d.k==='eexit'||(d.k==='entrance'&&en))})}
/* ---- exact floor space: area of a region covered by the UNION of item footprints (overlaps counted once) ---- */
function fpPoly(o){if(o.t==='poly')return o.pts;if(o.sh==='ellipse'&&(o.t==='area'||o.t==='rect')){var P=[],i,a;for(i=0;i<36;i++){a=i/36*2*Math.PI;P.push(toWorld(o,Math.cos(a)*o.w/2,Math.sin(a)*o.h/2))}return P}return corners(o)}
function rowSpans(P,y){var xs=[],i,j,n=P.length,a,b;for(i=0,j=n-1;i<n;j=i++){a=P[i];b=P[j];if((a.y>y)!==(b.y>y))xs.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y))}xs.sort(function(p,q){return p-q});var s=[];for(i=0;i+1<xs.length;i+=2)s.push([xs[i],xs[i+1]]);return s}
function mergeSpans(L){L.sort(function(p,q){return p[0]-q[0]});var o=[],i;for(i=0;i<L.length;i++){if(o.length&&L[i][0]<=o[o.length-1][1])o[o.length-1][1]=Math.max(o[o.length-1][1],L[i][1]);else o.push([L[i][0],L[i][1]])}return o}
function spanOverlap(A,B){var i=0,j=0,s=0,lo,hi;while(i<A.length&&j<B.length){lo=Math.max(A[i][0],B[j][0]);hi=Math.min(A[i][1],B[j][1]);if(hi>lo)s+=hi-lo;if(A[i][1]<B[j][1])i++;else j++}return s}
function pBox(P){var x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;P.forEach(function(p){if(p.x<x0)x0=p.x;if(p.y<y0)y0=p.y;if(p.x>x1)x1=p.x;if(p.y>y1)y1=p.y});return {x0:x0,y0:y0,x1:x1,y1:y1}}
/* region: polygon (or null = everywhere); obs: list of polygons. Returns m² of the region covered by at least one obstacle. */
function coveredArea(region,obs){
 if(!obs.length)return 0;var rb,bx=obs.map(pBox);
 if(region)rb=pBox(region);else{rb={x0:1e18,y0:1e18,x1:-1e18,y1:-1e18};bx.forEach(function(b){rb.x0=Math.min(rb.x0,b.x0);rb.y0=Math.min(rb.y0,b.y0);rb.x1=Math.max(rb.x1,b.x1);rb.y1=Math.max(rb.y1,b.y1)})}
 var h=rb.y1-rb.y0;if(!(h>0))return 0;var rows=Math.min(1500,Math.max(240,Math.ceil(h/.2))),st=h/rows,sum=0,r,y,reg,sp,k;
 for(r=0;r<rows;r++){y=rb.y0+(r+.5)*st;reg=region?rowSpans(region,y):[[rb.x0-1,rb.x1+1]];if(!reg.length)continue;sp=[];
  for(k=0;k<obs.length;k++){if(y<bx[k].y0||y>bx[k].y1)continue;rowSpans(obs[k],y).forEach(function(s){sp.push(s)})}
  if(sp.length)sum+=spanOverlap(reg,mergeSpans(sp))*st}
 return sum}
/* does this object take up floor space that people could otherwise stand on? */
function blocksFloor(q){
 if(!q||q.t!=='rect'||q.hd||q.ev||q.site||q.k==='cover'||/^netting/.test(q.k||'')||(q.k||'').indexOf('deck')===0)return false;
 var l=LIBM[q.k]||{};if(l.s==='truss'||l.ps)return false;return !isUnit(q)}
function crowdUnit(o){
 var ly=(S.meta.layouts||[]).filter(function(l){return l.src===o.id})[0],reg=fpPoly(o),rb=pBox(reg),
  items=S.objs.filter(function(q){if(q.id===o.id||!blocksFloor(q)||(q.lay&&(!ly||q.lay!==ly.id)))return false;var c=pBox(corners(q));return !(c.x1<rb.x0||c.x0>rb.x1||c.y1<rb.y0||c.y0>rb.y1)});
 var gross=unitGross(o),seats=0,fp=Math.min(gross,coveredArea(reg,items.map(corners)));items.forEach(function(q){var l=LIBM[q.k];if(l&&l.seats)seats+=(l.s==='chairs'?seatN(q):l.seats)});
 var net=Math.max(0,gross-fp),use=o.use||'sgen',d=o.dens>0?+o.dens:dOf(use),cap,how;
 if(o.pax>0){cap=Math.round(o.pax);how='fixed'}
 else if((use==='seat'||use==='rows')&&seats>0){cap=seats;how='seats'}
 else{cap=Math.floor(net/d);how='area'}
 var b=boundsOf(o),ex=exitDoors().filter(function(e){return e.x>=b.x0-1.5&&e.x<=b.x1+1.5&&e.y>=b.y0-1.5&&e.y<=b.y1+1.5}),ew=0;ex.forEach(function(e){ew+=e.w||0});
 var nm=o.label||(LIBM[o.k]&&LIBM[o.k].n)||(o.t==='poly'?'Zone':'Area');
 /* SANS 10400-A Reg A21 Table 2 (classes A1, A2, A4, A5): the number of fixed seats, or 1 person per m² where there are none */
 var sans=(how==='seats')?seats:Math.floor(net),opn=isOpenStruct(o),pop=cap,esc=sansEscape(ex.map(function(e){return e.w||0})),lim=false;
 /* an enclosed structure never holds more than its exits can serve (SANS 10400-T 4.21); with no exits drawn yet the floor figure stands and the check flags it */
 if(!opn&&ex.length&&esc.cap<cap){cap=esc.cap;lim=true}
 return {o:o,name:nm,gross:gross,fp:fp,nItems:items.length,net:net,seats:seats,hasLay:!!ly,use:use,d:d,cap:cap,pop:pop,sans:sans,esc:esc,lim:lim,exs:ex,how:how,ew:ew,nex:ex.length,opn:opn}
}
/* an open-sided tent with no use of its own is simply part of the event ground: people stand under it at the open-ground figure */
function mergesOpen(u){var o=u.o;return u.opn&&o.t==='rect'&&!o.use&&!(o.dens>0)&&!(o.pax>0)}
function crowdAll(){
 var m=S.meta,merged=[],us=S.objs.filter(function(o){return isUnit(o)&&!o.nc}).map(crowdUnit),att=(+m.attend||0)+(+m.staff||0),flow=+m.flow||82,T=+m.evT||8,ex=exitDoors(),exW=0;
 ex.forEach(function(e){exW+=e.w||0});
 var site=siteBoundary(),open=null,warn=[];
 if(site){
  var SP=site.P,pa=site.area,occ=0,cin=function(b){var cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2;return inPoly({x:cx,y:cy},SP)};
  merged=us.filter(function(u){return mergesOpen(u)&&cin(boundsOf(u.o))});us=us.filter(function(u){return merged.indexOf(u)<0});
  var us2=us.filter(function(u){return cin(boundsOf(u.o))}),obs=us2.map(function(u){return fpPoly(u.o)});
  S.objs.forEach(function(q){if(q.lay||!blocksFloor(q)||!inPoly({x:q.x,y:q.y},SP))return;obs.push(corners(q))});
  occ=coveredArea(SP,obs);
  var dd=dOf('open'),oa=Math.max(0,pa-occ);open={area:pa,free:oa,occ:occ,d:dd,cap:Math.floor(oa/dd),src:site.src,name:site.name}}
 else if(+m.siteArea>0){
  /* no drawn boundary (venue has its own fencing): use the typed-in site area, less every structure's floor space */
  merged=us.filter(mergesOpen);us=us.filter(function(u){return merged.indexOf(u)<0});
  var obs2=us.map(function(u){return fpPoly(u.o)});S.objs.forEach(function(q){if(q.lay||!blocksFloor(q))return;obs2.push(corners(q))});var occ2=coveredArea(null,obs2);
  var d2=dOf('open'),pa2=+m.siteArea,oa2=Math.max(0,pa2-occ2);open={area:pa2,free:oa2,occ:occ2,d:d2,cap:Math.floor(oa2/d2),src:'typed',name:'Event site (area entered)'}}
 else if(att>0||us.length)warn.push('Open ground is NOT counted: no event site area is set. Type the venue\'s total event area (m²) in Crowd & capacity or the Sheet tab, or draw a boundary. You do not have to draw existing fencing.');
 if(open&&open.occ>=open.area)warn.push('The event area ('+cfmt(open.area)+' m²) is no bigger than the floor space of the structures on it ('+cfmt(open.occ)+' m²), so NO open ground is counted. The area is probably too small: enter the whole fenced event area, not just part of it.');
 us.forEach(function(u){var b=boundsOf(u.o),cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2;us.forEach(function(v){if(v===u||u.gross>=v.gross)return;var c=boundsOf(v.o);if(cx>=c.x0&&cx<=c.x1&&cy>=c.y0&&cy<=c.y1)warn.push('"'+u.name+'" sits inside "'+v.name+'": both are counted. Tick "Leave out of the crowd calculation" on one of them if that is double counting.')})});
 var tot=us.reduce(function(a,u){return a+u.cap},0)+(open?open.cap:0),calc=tot,cert=+m.certCap||0;
 var sans=us.reduce(function(a,u){return a+Math.min(u.sans,u.lim?u.cap:u.sans)},0)+(open?Math.floor(open.free):0);
 if(cert>0&&tot>cert)tot=cert;
 return {calc:calc,cert:cert,capped:cert>0&&calc>cert,units:us,merged:merged,sans:sans,exits:ex,open:open,total:tot,att:att,flow:flow,T:T,exW:exW,nEx:ex.length,evTime:(att>0&&exW>0)?att/(exW*flow):null,reqW:att>0?att/(flow*T):0,over:att>0&&tot>0&&att>tot,warn:warn}
}
/* ---- SASREA: Safety at Sports and Recreational Events Act 2 of 2010, and its Regulations of 3 March 2017 (Government Gazette 40661).
   Regulation numbers are the gazetted ones. Earlier builds quoted a 2009 draft (Reg 4(1)(a)(iv), 3(12), 12(t), 13), which never came into force.
   ok: true = met, false = short, null = cannot be judged from a drawing (shown as "check"). */
function cntKeys(ks){var n=0;S.objs.forEach(function(o){if(!o.hd&&!o.ev&&ks[o.k])n+=ks[o.k]});return n}
function sasrea(C){
 var att=C.att,m=S.meta,R=[],k=att/1000,flow=C.flow||82;
 if(!(att>0))return R;
 var need=Math.ceil(k*10-1e-9)/10,t=C.exW>0?att/(C.exW*flow):null,ts=t===null?'no exits placed':(t<10?t.toFixed(1):Math.round(t))+' min';
 R.push({reg:'Reg 5(18)(d)',what:'Egress gates: 1 m of width per 1,000 people',need:need.toFixed(1)+' m',have:(Math.round(C.exW*10)/10)+' m',ok:C.exW+1e-6>=need});
 R.push({reg:'Reg 5(3)(a)',what:'Completely evacuated within 15 minutes',need:'15 min',have:ts,ok:t!==null&&t<=15});
 R.push({reg:'Reg 5(3)(b)',what:'Everyone in a place of safety within 10 minutes',need:'10 min',have:ts,ok:t===null?false:(t<=10?true:null)});
 var ex=C.exits||[],nar=ex.filter(function(e){return (e.w||0)+1e-6<1.2}),mn=ex.length?Math.min.apply(null,ex.map(function(e){return e.w||0})):0;
 R.push({reg:'Reg 5(18)(b), 5(2)',what:'Every emergency gate and walkway at least 1.2 m wide',need:'1.2 m',have:ex.length?'narrowest '+(Math.round(mn*100)/100)+' m':'no exits placed',ok:ex.length>0&&!nar.length});
 var asm=S.objs.filter(function(o){return o.t==='sign'&&o.k==='assembly'&&!o.hd&&!o.ev}).length;
 R.push({reg:'Reg 5(12)',what:'At least two emergency assembly areas, signed and lit',need:'2',have:asm+' placed',ok:asm>=2});
 var ent=S.objs.filter(function(d){return d.t==='door'&&!d.hd&&!d.ev&&d.k==='entrance'}).length,en=Math.max(1,Math.ceil(k));
 R.push({reg:'Reg 5(18)(e)',what:'Entry lanes: 1 turnstile per 1,000, each passing 1,000 an hour (medium and high risk)',need:en+'',have:ent+' entrance'+(ent===1?'':'s')+' placed',ok:ent>=en?true:null});
 var T7=sansToilets(att),tc=cntKeys({toilet:1,toilet_wb:1,trailer_abl:6,trailer_acc:1}),ty=+m.toilets||0,th=ty>0?ty:tc;
 R.push({reg:'Reg 5(4), SANS 10400 Table 7',what:'Toilets at peak demand: '+T7.fwc+' female WCs, '+T7.mwc+' male WCs, '+T7.ur+' urinals, '+T7.whb+' basins',need:T7.pans+'',have:th+(ty>0?' (entered)':' (drawn)'),ok:th>=T7.pans});
 var fa=cntKeys({faid:1})+S.objs.filter(function(o){return o.t==='sign'&&o.k==='first_aid'&&!o.hd&&!o.ev}).length,amb=cntKeys({vehicle:1});
 R.push({reg:'Reg 5(16)',what:'Medical post(s), number and place agreed in writing with the local authority',need:'1 or more',have:fa+' placed',ok:fa>=1});
 R.push({reg:'Reg 5(17)(l)',what:'Marked parking for police, fire and ambulance with a direct, clear route',need:'1 or more',have:amb+' emergency vehicle bay'+(amb===1?'':'s')+' placed',ok:amb>=1?true:null});
 var acc=cntKeys({trailer_acc:1})+S.objs.filter(function(o){return o.t==='sign'&&o.k==='disabled'&&!o.hd&&!o.ev}).length;
 R.push({reg:'Reg 5(11)',what:'Wheelchair viewing and accessible toilets',need:'provided',have:acc?acc+' marked':'none marked',ok:acc?true:null});
 if(att>1000){var cg=Math.ceil(att/2000),als=Math.max(1,Math.ceil(att/5000));
  R.push({reg:'Guide only (2009 draft reg 13, not in force)',what:'Medical staffing often asked for: 1 care giver per 2,000, 1 advanced life support vehicle per 5,000',need:cg+' + '+als,have:'confirm in the medical plan',ok:null})}
 return R}
function cfmt(n){return Math.round(n).toLocaleString('en-ZA')}
/* every seat drawn on the visible plan: arena chairs, table seats, benches */
function seatsDrawn(){var n=0;S.objs.forEach(function(o){if(o.t!=='rect'||!vo(o))return;var l=LIBM[o.k];if(l&&l.seats&&l.s!=='urinal')n+=(l.s==='chairs'?seatN(o):l.seats)});return n}
function crowdLines(){
 var m=S.meta,L=[],RED='#c62828';
 if(m.only){var ly=layoutOf(m.only),host=ly&&S.objs.filter(function(o){return o.id===ly.src})[0];if(!host||!isUnit(host))return L;
  var u=crowdUnit(host);L.push(['Floor area',cfmt(u.gross)+' m²']);L.push(['Usable (net of layout)',cfmt(u.net)+' m²']);if(u.seats)L.push(['Seats in layout',cfmt(u.seats)]);
  L.push(['Capacity of this structure',cfmt(u.cap)+' people']);L.push(['Basis',u.how==='seats'?'table seating':u.how==='fixed'?'fixed headcount':u.d+' m² per person']);
  if(u.nex)L.push(['Exit width',(Math.round(u.ew*10)/10)+' m ('+u.nex+')']);return L}
 var C=crowdAll();if(!C.units.length&&!C.open&&!C.att)return L;
 if(C.att>0)L.push([(+m.staff>0?'Attendance + staff':'Expected attendance'),cfmt(C.att)]);
 var ts=seatsDrawn();if(ts>0)L.push(['Seats drawn on plan',cfmt(ts)]);
 L.push(['Safe capacity',cfmt(C.total)+(C.att>0?(C.over?'  OVER':'  OK'):''),C.over?RED:null]);
 C.units.slice(0,6).forEach(function(u){L.push(['   '+u.name,cfmt(u.cap)])});
 if(C.units.length>6)L.push(['   + '+(C.units.length-6)+' more structures','']);
 if(C.open)L.push(['   Open ground'+(C.merged&&C.merged.length?' + open tents':''),cfmt(C.open.cap)]);
 else if(C.att>0)L.push(['   Open ground','not counted: no site area set','#c62828']);
 if(C.capped)L.push(['   Calculated '+cfmt(C.calc)+', limited to venue certificate','']);
 if(C.exW>0){L.push(['Exits ('+C.nEx+')',(Math.round(C.exW*10)/10)+' m wide']);
  if(C.att>0){var ok=C.evTime<=15;L.push(['Evacuation time',(C.evTime<10?C.evTime.toFixed(1):Math.round(C.evTime))+' min (limit 15)',ok?null:RED])}}
 else if(C.att>0)L.push(['Exits','none placed',RED]);
 if(C.att>0){var r0=sasrea(C)[0];L.push(['SASREA exit width',r0.have+' / '+r0.need,r0.ok?null:RED])}
 L.push(['Basis','SANS 10400 · SASREA 2017']);
 return L}
function crowdModal(){
 var m=S.meta,C=crowdAll(),h='<h3>Crowd &amp; capacity</h3><p class="note"><b>'+esc(m.event||'')+'</b><br>'+esc(m.venue||'')+' · '+esc(m.date||'')+((m.tstart||m.tend)?' · '+esc(m.tstart||'')+(m.tend?' – '+esc(m.tend):''):'')+'</p>';
 h+='<table style="width:100%;border-collapse:collapse;font-size:12.5px"><tr style="text-align:left;color:#5b6b78"><th>Structure</th><th>Area m²</th><th>Taken by items m²</th><th>Usable m²</th><th>Basis</th><th>Capacity</th><th>Exits (SANS 10400-T)</th></tr>';
 C.units.forEach(function(u){var nx=sansExitsFor(u.pop),bad=!u.opn&&(u.nex<nx||u.esc.cap<u.pop);
  h+='<tr style="border-top:1px solid #d6dde2"><td>'+esc(u.name)+(u.hasLay?' <small>(internal layout)</small>':'')+'</td><td>'+cfmt(u.gross)+'</td><td>'+(u.fp>0?cfmt(u.fp)+' <small>('+u.nItems+')</small>':'–')+'</td><td>'+cfmt(u.net)+'</td><td>'+(u.how==='seats'?cfmt(u.seats)+' seats':u.how==='fixed'?'fixed':u.d+' m²/p')+'</td><td><b>'+cfmt(u.cap)+'</b>'+(u.lim?' <small style="color:#c62828">(floor '+cfmt(u.pop)+', limited by exits)</small>':'')+'</td><td style="color:'+(bad?'#c62828':'inherit')+'">'+(u.opn?'open sides <small>(no exits needed)</small>':u.nex+' exit'+(u.nex===1?'':'s')+', serve '+cfmt(u.esc.cap)+' <small>(needs '+nx+')</small>')+'</td></tr>'});
 if(C.merged&&C.merged.length)h+='<tr style="border-top:1px solid #d6dde2"><td>Open-sided tents ('+C.merged.length+') <small>counted as part of the open ground</small></td><td>'+cfmt(C.merged.reduce(function(a,u){return a+u.gross},0))+'</td><td></td><td></td><td></td><td><small>in open ground</small></td><td>open sides</td></tr>';
 if(C.open)h+='<tr style="border-top:1px solid #d6dde2"><td>Open ground '+(C.open.src==='typed'?'<small>(site area entered, less structures)</small>':'inside the perimeter <small>(estimate)</small>')+'</td><td>'+cfmt(C.open.area)+'</td><td>'+cfmt(C.open.occ)+'</td><td>'+cfmt(C.open.free)+'</td><td>'+C.open.d+' m²/p</td><td><b>'+cfmt(C.open.cap)+'</b></td><td></td></tr>';
 h+='<tr style="border-top:2px solid #12202b"><td><b>Whole venue</b>'+(C.capped?' <small>(calculated '+cfmt(C.calc)+', limited to the venue\'s certified '+cfmt(C.cert)+')</small>':'')+'</td><td></td><td></td><td></td><td></td><td><b>'+cfmt(C.total)+'</b></td><td></td></tr></table>';
 h+='<p style="margin:10px 0 4px"><b>Expected attendance'+(+m.staff>0?' + staff':'')+':</b> '+(C.att>0?cfmt(C.att):'<i>not entered (Sheet tab)</i>')+(C.att>0&&C.total>0?' — <b style="color:'+(C.over?'#c62828':'#12804a')+'">'+(C.over?'more than the planned capacity':'within the planned capacity')+'</b>':'')+'</p>';
 h+='<p style="margin:4px 0"><b>Exits:</b> '+C.nEx+' placed, '+(Math.round(C.exW*10)/10)+' m clear width in total. At '+C.flow+' people per minute per metre, '+(C.att>0&&C.exW>0?'the expected crowd clears in about <b style="color:'+(C.evTime>15?'#c62828':C.evTime>C.T?'#b45309':'#12804a')+'">'+(C.evTime<10?C.evTime.toFixed(1):Math.round(C.evTime))+' min</b> (SASREA limit 15 min; your own target '+C.T+' min). ':'')+(C.att>0?'Width needed for your target: <b>'+(Math.round(C.reqW*10)/10)+' m</b>.':'')+'</p>';
 var SR=sasrea(C);
 if(SR.length){h+='<h4 style="margin:14px 0 4px">SASREA regulation checks <small style="font-weight:400">(for '+cfmt(C.att)+' people)</small></h4><table style="width:100%;border-collapse:collapse;font-size:12.5px"><tr style="text-align:left;color:#5b6b78"><th>Requirement</th><th>Needed</th><th>On the plan</th><th></th></tr>';
  SR.forEach(function(r){h+='<tr style="border-top:1px solid #d6dde2"><td>'+esc(r.what)+' <small style="color:#5b6b78">'+esc(r.reg)+'</small></td><td>'+esc(r.need)+'</td><td>'+esc(r.have)+'</td><td style="font-weight:700;color:'+(r.ok===null?'#5b6b78':r.ok?'#12804a':'#c62828')+'">'+(r.ok===null?'check':r.ok?'OK':'SHORT')+'</td></tr>'});
  h+='</table><p class="note">Regulation numbers are from the SASREA Regulations gazetted on 3 March 2017 (GG 40661). They are written for stadiums and venues holding 2,000 or more and are applied here to the event crowd, so the local authority, SAPS / ESSPC and the approved risk category have the final say. SASREA sets no m² per person: the safe capacity is what the local authority certifies (Reg 4(1)(m)), and tickets may not exceed it (Act s 19(3)), so enter the certificate figure below.</p>'}
 h+='<p style="margin:8px 0 4px"><b>SANS 10400-A design population</b> (Reg A21, Table 2: fixed seats, or 1 person per m² of clear floor): <b>'+cfmt(C.sans)+'</b>'+(C.total>C.sans?' — <span style="color:#b45309">your densities plan for more than this; denser standing needs the local authority\'s agreement or a rational design</span>':'')+'</p>';
 C.warn.forEach(function(w){h+='<p class="note" style="color:#b45309">⚠ '+esc(w)+'</p>'});
 h+='<p style="margin:10px 0 4px"><b>Venue certified capacity</b> (from its fitness certificate; the plan never counts above this): <input id="cm_cert" type="number" min="0" step="1" value="'+(+m.certCap>0?m.certCap:'')+'" style="width:110px;padding:6px"> <button class="btn sm pri" data-act="sitearea">Set</button></p><p style="margin:10px 0 4px"><b>Venue with existing fencing?</b> Type the total event area instead of drawing it'+(siteBoundary()?' (used only when no boundary is drawn)':'')+':</p><div class="btns" style="align-items:center"><input id="cm_sitearea" type="number" min="0" step="1" placeholder="total area, m²" value="'+(+m.siteArea>0?m.siteArea:'')+'" style="width:140px;padding:6px"> m² <button class="btn sm pri" data-act="sitearea">Set</button>'+(siteBoundary()?'':' <button class="btn sm" data-act="drawsite">Or draw it</button>')+'</div>';
 h+='<p class="note">Floor figures follow SANS 10400-A (1 m² per person standing, or the seats drawn). Enclosed structures are capped by what their exits can serve under SANS 10400-T Table 10 (120 people at 1.1 m to 190 at 1.8 m per exit, the widest exit left out). Open-sided tents and shade netting are open ground. The exit flow rate (82 people per minute per metre, level ground) is a planning figure from the UK Green Guide, since neither SASREA nor SANS 10400 gives one. Capacity reacts to each structure\'s internal layout: furniture is taken off the usable floor, and table seats are counted when a structure is set to "seated at tables".</p>';
 box(h);$('#modal').onclick=function(e){var t=e.target.closest('[data-act]');if(t&&t.dataset.act)act(t.dataset.act)};var mb=$('#modal .mbox');if(mb){mb.style.maxWidth='760px';mb.style.maxHeight='86vh';mb.style.overflow='auto'}
}

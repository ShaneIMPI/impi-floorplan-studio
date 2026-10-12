/* ---------- perimeter lines with gaps, plus boom gates, sliding gates and stairs ---------- */
IC.perim='M4 7h6M14 7h6M4 7v10M20 7v10M4 17h6M14 17h6';IC.gap='M4 12h4M16 12h4M8 7v10M16 7v10';

/* A line can carry gaps: a list of segment numbers (segment i joins point i to point i+1) that are not fence. */
function lineRuns(o){
 var P=o.pts,n=P.length,closed=!!o.closed,segN=closed?n:n-1,gs={},i,runs=[],cur=null,gaps=[],any=false;
 (o.gaps||[]).forEach(function(g){if(g>=0&&g<segN){gs[g]=1;any=true}});
 if(!any)return {runs:[closed?P.concat([P[0]]):P],gaps:[],full:true};
 for(i=0;i<segN;i++){var a=P[i],b=P[(i+1)%n];
  if(gs[i]){if(cur){runs.push(cur);cur=null}gaps.push({i:i,a:a,b:b,len:Math.hypot(b.x-a.x,b.y-a.y)})}
  else{if(!cur)cur=[a];cur.push(b)}}
 if(cur)runs.push(cur);
 if(closed&&runs.length>1&&!gs[segN-1]&&!gs[0]){var last=runs.pop();runs[0]=last.concat(runs[0].slice(1))}
 return {runs:runs,gaps:gaps,full:false}}
function gapLen(o){var t=0;lineRuns(o).gaps.forEach(function(g){t+=g.len});return t}
/* keep the gap list correct when points are added to or removed from a line */
function gapArr(o){var n=o.pts.length,s0=o.closed?n:n-1,a=[],i;for(i=0;i<s0;i++)a.push(0);(o.gaps||[]).forEach(function(g){if(g>=0&&g<s0)a[g]=1});return a}
function gapSet(o,a){var g=[];a.forEach(function(v,i){if(v)g.push(i)});if(g.length)o.gaps=g;else delete o.gaps}
function gapsInsert(ga,mi){ga.splice(mi+1,0,ga[mi])}
function gapsRemove(o,ga,r){var n=o.pts.length,m;
 if(o.closed){if(r===0){m=ga[n-1]|ga[0];ga=ga.slice(1,n-1).concat([m])}else{m=ga[r-1]|ga[r];ga.splice(r-1,2,m)}}
 else{if(r===0)ga.shift();else if(r===n-1)ga.pop();else{m=ga[r-1]|ga[r];ga.splice(r-1,2,m)}}
 return ga}
function gapBase(o){var k=0;for(var i=0;i<S.objs.length;i++){var q=S.objs[i];if(q===o||q.id===o.id)break;if(q.t==='line'&&q.gaps&&q.gaps.length&&!q.hd)k+=lineRuns(q).gaps.length}return k}

/* the line wrapper: draws each run of fence, then the gap markers and any section lengths */
function drawLineObj(c,o,ic){
 if(o.gaps&&o.gaps.length&&o.pts&&o.pts.length>1){lineRuns(o).runs.forEach(function(r){drawLineObj0(c,Object.assign({},o,{pts:r,closed:false,gaps:null}),ic)})}
 else drawLineObj0(c,o,ic);
 if(!ic&&o.pts&&o.pts.length>1&&(o.segl||(o.gaps&&o.gaps.length)))lineExtras(c,o)}
function lineExtras(c,o){
 var rn=lineRuns(o),base=o.id?gapBase(o):0;
 function ang(dx,dy){var a=Math.atan2(dy,dx);if(a>Math.PI/2)a-=Math.PI;if(a<-Math.PI/2)a+=Math.PI;return a}
 c.save();
 rn.gaps.forEach(function(g,k){if(g.len<1e-6)return;
  var ux=(g.b.x-g.a.x)/g.len,uy=(g.b.y-g.a.y)/g.len,nx=-uy,ny=ux,t=Math.max(px(6),.35);
  c.strokeStyle='#9a3412';c.lineWidth=px(1.4);c.setLineDash([]);c.beginPath();
  [g.a,g.b].forEach(function(p){c.moveTo(p.x-nx*t,p.y-ny*t);c.lineTo(p.x+nx*t,p.y+ny*t)});c.stroke();
  c.setLineDash([px(3),px(3)]);c.strokeStyle='rgba(154,52,18,.55)';c.beginPath();c.moveTo(g.a.x,g.a.y);c.lineTo(g.b.x,g.b.y);c.stroke();c.setLineDash([]);
  if(g.len*R.z/R.u>28){var mx=(g.a.x+g.b.x)/2+nx*px(11),my=(g.a.y+g.b.y)/2+ny*px(11);txt(c,'G'+(base+k+1)+'  '+fm(g.len),mx,my,10,{col:'#9a3412',bold:true,rot:ang(ux,uy)})}});
 if(o.segl){rn.runs.forEach(function(r){for(var i=0;i<r.length-1;i++){var a=r[i],b=r[i+1],L=Math.hypot(b.x-a.x,b.y-a.y);if(L<1e-6||L*R.z/R.u<34)continue;
  var ux=(b.x-a.x)/L,uy=(b.y-a.y)/L;txt(c,fm(L),(a.x+b.x)/2-uy*px(10),(a.y+b.y)/2+ux*px(10),9,{col:'#33444f',rot:ang(ux,uy)})}})}
 c.restore()}

/* ---------- perimeter tool ---------- */
function togglePerim(){
 if(S.perim&&S.tool==='line'){S.perim=false;S.gapNext=false;setTool('select');syncPrec();toast('Perimeter off');return}
 S.traceSnap=true;syncTrace();S.lineStyle='fence';setTool('line');S.perim=true;S.gapNext=false;$('#lineSel').value='fence';syncPrec();draw();
 toast('Perimeter: tap along the existing fence. Where the fence stops, press Gap, then tap where it starts again. Tap the first point to close the loop, or Finish.',9000)}
function toggleGap(){
 if(S.tool!=='line'){togglePerim()}
 S.gapNext=!S.gapNext;syncPrec();draw();toast(S.gapNext?'Gap: tap where the fence starts again. The stretch in between is left open and measured.':'Gap cancelled',4500)}
function tmpGaps(t,P){var g=(t.gaps||[]).slice();if(S.gapNext&&t.cur&&P.length>=2)g.push(P.length-2);return g}

/* ---------- boom gate, sliding gate, stairs ---------- */
function siteItem(c,o,L,s,w,h,lw){
 var hx=w/2,hy=h/2,i;
 c.lineWidth=lw;c.strokeStyle=INK;c.lineJoin='round';
 if(s==='boom'){
  var hw=Math.min(.55,w*.2);c.fillStyle='#cfd6dc';c.fillRect(-hx,-hy,hw,h);c.strokeRect(-hx,-hy,hw,h);
  var al=w-hw-.25,ah=Math.min(.16,h*.3),n=Math.max(2,Math.round(al/.4)),sw=al/n;
  for(i=0;i<n;i++){c.fillStyle=i%2?'#ffffff':'#d32f2f';c.fillRect(-hx+hw+i*sw,-ah/2,sw,ah)}
  c.lineWidth=lw*.8;c.strokeRect(-hx+hw,-ah/2,al,ah);
  c.fillStyle='#cfd6dc';c.lineWidth=lw;c.fillRect(hx-.22,-hy*.55,.22,h*.55);c.strokeRect(hx-.22,-hy*.55,.22,h*.55);
  c.fillStyle='#22313d';c.beginPath();c.arc(-hx+hw/2,0,Math.min(.1,h*.15),0,TAU);c.fill();
 }else if(s==='sgate'){
  /* closed leaf over the left half, the open position shown dashed on the right, rail beneath */
  var lf=w/2,th=Math.min(.14,h*.4);
  c.fillStyle='#fff';c.fillRect(-hx,-th/2,lf,th);c.strokeRect(-hx,-th/2,lf,th);
  c.lineWidth=lw*.6;var bars=Math.max(2,Math.round(lf/.18));c.beginPath();for(i=1;i<bars;i++){var bxp=-hx+lf*i/bars;c.moveTo(bxp,-th/2);c.lineTo(bxp,th/2)}c.stroke();
  c.lineWidth=lw;c.fillStyle='#8a97a1';c.fillRect(-hx-.06,-hy,.12,h);c.fillRect(hx-.06,-hy,.12,h);c.fillRect(-.06,-hy,.12,h);
  c.save();c.setLineDash([lw*3,lw*2]);c.strokeStyle='#5b6b78';c.lineWidth=lw*.8;c.strokeRect(0.1,-th/2,lf-.1,th);c.setLineDash([]);c.restore();
  var ay=hy*.75;c.strokeStyle='#e8590c';c.lineWidth=lw;c.beginPath();c.moveTo(-hx+lf*.5,ay);c.lineTo(hx-lf*.25,ay);c.stroke();
  var ah2=Math.min(.22,lf*.1);c.fillStyle='#e8590c';c.beginPath();c.moveTo(hx-lf*.25,ay);c.lineTo(hx-lf*.25-ah2,ay-ah2*.6);c.lineTo(hx-lf*.25-ah2,ay+ah2*.6);c.closePath();c.fill();
 }else if(s==='stairs'){
  c.fillStyle='#f3f4f6';c.fillRect(-hx,-hy,w,h);c.strokeRect(-hx,-hy,w,h);
  var nt=Math.max(3,Math.round(h/.28)),st=h/nt;c.lineWidth=lw*.55;c.beginPath();for(i=1;i<nt;i++){c.moveTo(-hx,-hy+st*i);c.lineTo(hx,-hy+st*i)}c.stroke();
  c.lineWidth=lw;c.strokeStyle='#5b6b78';c.beginPath();c.moveTo(-hx+.05,-hy);c.lineTo(-hx+.05,hy);c.moveTo(hx-.05,-hy);c.lineTo(hx-.05,hy);c.stroke();
  var ar=Math.min(w*.18,h*.12,.4);c.strokeStyle='#e8590c';c.fillStyle='#e8590c';c.lineWidth=lw*1.4;c.beginPath();c.moveTo(0,hy-h*.12);c.lineTo(0,-hy+h*.16);c.stroke();
  c.beginPath();c.moveTo(0,-hy+h*.1);c.lineTo(-ar,-hy+h*.1+ar*1.2);c.lineTo(ar,-hy+h*.1+ar*1.2);c.closePath();c.fill()}}

/* ---------- trace assist: snap to the lines of an imported plan ---------- */
var TRACE_TOOLS={line:1,poly:1,dim:1,area:1,calib:1,gorigin:1};
function layerMask(L){
 if(L._m&&L._m.src===L.img)return L._m;
 var w=L.img.width,h=L.img.height,cn=document.createElement('canvas');cn.width=w;cn.height=h;var c=cn.getContext('2d',{willReadFrequently:true});c.fillStyle='#fff';c.fillRect(0,0,w,h);c.drawImage(L.img,0,0);
 var d;try{d=c.getImageData(0,0,w,h).data}catch(e){L._m={src:L.img,bad:true};return L._m}
 var m=new Uint8Array(w*h);for(var i=0,j=0;i<m.length;i++,j+=4){m[i]=(.299*d[j]+.587*d[j+1]+.114*d[j+2])<135?1:0}
 L._m={src:L.img,w:w,h:h,m:m};return L._m}
function underlaySnap(p){
 var best=null,bs=1e18;
 S.layers.forEach(function(L){
  if(!L.vis||L.kind!=='plan'||L.op<.04)return;var M=layerMask(L);if(M.bad)return;
  var rr=rotv(p.x-L.x,p.y-L.y,-L.rot*D2R),ix=rr.x/L.mpp-.5,iy=rr.y/L.mpp-.5,r=Math.max(2,Math.min(36,Math.round(14/S.view.z/L.mpp))),W=M.w,H=M.h,D=M.m;
  var Lr=Math.max(5,Math.min(14,Math.round(.6/L.mpp))),DIRS=[[1,0],[0,1],[1,1],[1,-1]];
  function dk(x,y){return x>=0&&y>=0&&x<W&&y<H&&D[y*W+x]===1}
  function run(x,y,dx,dy){var n=1,k,cx=x,cy=y,gap=0;for(k=0;k<Lr;k++){cx+=dx;cy+=dy;if(dk(cx,cy)){n++;gap=0}else if(++gap>1)break}cx=x;cy=y;gap=0;for(k=0;k<Lr;k++){cx-=dx;cy-=dy;if(dk(cx,cy)){n++;gap=0}else if(++gap>1)break}return n}
  function junction(x,y){var c=0;for(var q=0;q<4;q++)if(run(x,y,DIRS[q][0],DIRS[q][1])>=Lr)c++;return c>=2}
  var x0=Math.round(ix),y0=Math.round(iy),found=null,fs=1e18,xx,yy;
  for(yy=y0-r;yy<=y0+r;yy++)for(xx=x0-r;xx<=x0+r;xx++){if(!dk(xx,yy))continue;var dd=Math.hypot(xx-ix,yy-iy);if(dd>r)continue;if(dd*.45>=fs)continue;var j=junction(xx,yy),sc=j?dd*.45:dd;if(sc<fs){fs=sc;found={x:xx,y:yy,j:j}}}
  if(!found)return;
  var kk=found.j?3:2,sx=0,sy=0,n=0;for(yy=found.y-kk;yy<=found.y+kk;yy++)for(xx=found.x-kk;xx<=found.x+kk;xx++)if(dk(xx,yy)){sx+=xx;sy+=yy;n++}
  var cx2=sx/n+.5,cy2=sy/n+.5,wv=rotv(cx2*L.mpp,cy2*L.mpp,L.rot*D2R),wp={x:L.x+wv.x,y:L.y+wv.y},dist=Math.hypot(wp.x-p.x,wp.y-p.y)*S.view.z*(found.j?.45:1);
  if(dist<bs){bs=dist;best={x:wp.x,y:wp.y,j:found.j}}});
 return best}
function parseDist(s){s=String(s||'').trim().toLowerCase().replace(/,/g,'.').replace(/\\s+/g,'');var m=s.match(/^([\\d.]+)(mm|cm|m|km)?$/);if(!m)return NaN;var n=parseFloat(m[1]),u=m[2]||'m';return u==='mm'?n/1000:u==='cm'?n/100:u==='km'?n*1000:n}
function syncTrace(){$$('#tools [data-act=trace]').forEach(function(x){x.classList.toggle('on',S.traceSnap!==false)})}
function setGridOrigin(q){var lo=S.meta.only?layoutOf(S.meta.only):null;if(lo){lo.gx=q.x;lo.gy=q.y}else{S.meta.gx=Math.round(q.x*1000)/1000;S.meta.gy=Math.round(q.y*1000)/1000}
 setTool('select');saveLocal();renderPanel();draw();toast('Stand grid now starts at that corner. Stands snap to the module from there.',5000)}
async function choosePdfPage(pdf,name){
 return new Promise(function(res){
  var m=$('#modal'),n=pdf.numPages;
  m.innerHTML='<div class="mbox" style="width:min(900px,100%)" role="dialog" aria-label="Choose a page"><h3>Which page do you want to use?</h3><p class="note" style="margin:0 0 8px">'+esc(name)+' has '+n+' pages. Pick one; you can add other pages afterwards from the Images tab.</p><div id="pgGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px"></div><div class="mrow"><button class="btn" id="mc">Cancel</button></div></div>';
  m.classList.add('on');var g=$('#pgGrid'),closed=false;
  function close(v){closed=true;m.classList.remove('on');m.innerHTML='';res(v)}
  $('#mc').onclick=function(){close(null)};
  for(var i=1;i<=n;i++){(function(i){var b=document.createElement('button');b.className='btn';b.style.cssText='display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;height:auto';b.innerHTML='<canvas width="190" height="134" style="width:100%;background:#fff;border:1px solid var(--ln);border-radius:4px"></canvas><span>Page '+i+'</span>';b.onclick=function(){close(i)};g.appendChild(b)})(i)}
  (async function(){var cs=g.querySelectorAll('canvas');for(var i=1;i<=n&&!closed;i++){try{var pg=await pdf.getPage(i),v0=pg.getViewport({scale:1}),sc=380/Math.max(v0.width,v0.height),vp=pg.getViewport({scale:sc}),cn=cs[i-1];cn.width=Math.round(vp.width);cn.height=Math.round(vp.height);var cx=cn.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cn.width,cn.height);await pg.render({canvasContext:cx,viewport:vp}).promise}catch(e){}}})();
  m.onkeydown=function(e){if(e.key==='Escape')close(null)}})}


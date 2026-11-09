/* ---------- view helpers ---------- */
function objBounds(){
 var b=null;function add(p){if(!b)b={x0:p.x,y0:p.y,x1:p.x,y1:p.y};else{b.x0=Math.min(b.x0,p.x);b.y0=Math.min(b.y0,p.y);b.x1=Math.max(b.x1,p.x);b.y1=Math.max(b.y1,p.y)}}
 S.objs.forEach(function(o){if(!vo(o))return;if(o.t==='dim'){add(o.a);add(o.b)}else if(o.t==='line'||o.t==='poly'){o.pts.forEach(add)}else if(o.t==='text'){add(o)}else{corners(o).forEach(add)}});
 return b;
}

/* Bounds the sheet's Auto-fit should use: the drawn plan plus a client / venue plan underlay (never aerial tiles), with tiny stray
   items far away from everything else (an old measure, a sign dropped off to the side) left out so they cannot shrink the plan. */
function objBox(o){var P=[];if(o.t==='dim'){P=[o.a,o.b]}else if(o.t==='line'||o.t==='poly'){P=o.pts}else if(o.t==='text'){P=[o]}else{P=corners(o)}
 if(!P||!P.length)return null;var x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;P.forEach(function(p){if(p.x<x0)x0=p.x;if(p.y<y0)y0=p.y;if(p.x>x1)x1=p.x;if(p.y>y1)y1=p.y});return {x0:x0,y0:y0,x1:x1,y1:y1,o:o}}
function planBounds(){
 var E=[],i,j;S.objs.forEach(function(o){if(!vo(o))return;var b=objBox(o);if(b){b.w=b.x1-b.x0;b.h=b.y1-b.y0;b.wt=b.w*b.h+(b.w+b.h)*2+.01;E.push(b)}});
 var left=0,res=null;
 if(E.length){
  var ax0=1e18,ay0=1e18,ax1=-1e18,ay1=-1e18;E.forEach(function(b){ax0=Math.min(ax0,b.x0);ay0=Math.min(ay0,b.y0);ax1=Math.max(ax1,b.x1);ay1=Math.max(ay1,b.y1)});
  var G=Math.max(10,.15*Math.hypot(ax1-ax0,ay1-ay0)),cl=E.map(function(b,k){return k}),find=function(a){while(cl[a]!==a){cl[a]=cl[cl[a]];a=cl[a]}return a};
  for(i=0;i<E.length;i++)for(j=i+1;j<E.length;j++){var A=E[i],B=E[j];if(A.x0-G<=B.x1&&B.x0-G<=A.x1&&A.y0-G<=B.y1&&B.y0-G<=A.y1){var ra=find(i),rb=find(j);if(ra!==rb)cl[ra]=rb}}
  var gr={};E.forEach(function(b,k){var r=find(k);(gr[r]=gr[r]||[]).push(b)});
  var keys=Object.keys(gr),W=keys.map(function(k){return gr[k].reduce(function(a,b){return a+b.wt},0)}),mx=Math.max.apply(null,W),kept=[];
  keys.forEach(function(k,n){if(W[n]>=mx*.05)kept=kept.concat(gr[k]);else left+=gr[k].length});
  kept.forEach(function(b){if(!res)res={x0:b.x0,y0:b.y0,x1:b.x1,y1:b.y1};else{res.x0=Math.min(res.x0,b.x0);res.y0=Math.min(res.y0,b.y0);res.x1=Math.max(res.x1,b.x1);res.y1=Math.max(res.y1,b.y1)}})}
 if(S.meta.bg&&!S.meta.only)S.layers.forEach(function(L){if(!L.vis||L.kind==='sat'||!L.img)return;var w=L.img.width*L.mpp,h=L.img.height*L.mpp;[[0,0],[w,0],[w,h],[0,h]].forEach(function(q){var r=rotv(q[0],q[1],L.rot*D2R),x=L.x+r.x,y=L.y+r.y;if(!res)res={x0:x,y0:y,x1:x,y1:y};else{res.x0=Math.min(res.x0,x);res.y0=Math.min(res.y0,y);res.x1=Math.max(res.x1,x);res.y1=Math.max(res.y1,y)}})});
 if(res)res.left=left;return res}
function layerBounds(){
 var b=null;S.layers.forEach(function(L){if(!L.vis)return;var w=L.img.width*L.mpp,h=L.img.height*L.mpp;[[0,0],[w,0],[w,h],[0,h]].forEach(function(q){var r=rotv(q[0],q[1],L.rot*D2R),p={x:L.x+r.x,y:L.y+r.y};if(!b)b={x0:p.x,y0:p.y,x1:p.x,y1:p.y};else{b.x0=Math.min(b.x0,p.x);b.y0=Math.min(b.y0,p.y);b.x1=Math.max(b.x1,p.x);b.y1=Math.max(b.y1,p.y)}})});return b;
}
function viewBounds(){var W=cv.clientWidth,H=cv.clientHeight,a=s2w({x:0,y:0}),b=s2w({x:W,y:H});return {x0:a.x,y0:a.y,x1:b.x,y1:b.y}}
function fitTo(b,pad){
 var W=cv.clientWidth,H=cv.clientHeight;if(!b||W<10)return;var bw=Math.max(b.x1-b.x0,1),bh=Math.max(b.y1-b.y0,1);
 var z=Math.min((W*(1-pad))/bw,(H*(1-pad))/bh);z=Math.max(.0005,Math.min(20000,z));S.view.z=z;S.view.x=W/2-((b.x0+b.x1)/2)*z;S.view.y=H/2-((b.y0+b.y1)/2)*z;draw();
}
function fitAll(){var b=objBounds()||layerBounds();if(!b){S.view.z=10;S.view.x=cv.clientWidth/2;S.view.y=cv.clientHeight/2;draw();return}fitTo(b,.12)}
function resize(){var W=cv.clientWidth,H=cv.clientHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);draw()}
new ResizeObserver(resize).observe($('#stage'));


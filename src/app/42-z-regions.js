/* ---------- municipality: each metro has its own events and fire by-laws ----------
   Read in November 2026. gap = clear distance between tents (m); lead = days the application must be in before the event;
   wd = those are working days; rules = shown in the readiness check, each with its section. Where a by-law could not be read the note says so. */
var REGIONS=[
 {k:'tshwane',n:'City of Tshwane (Pretoria)',law:'Fire Brigade Service By-laws, 2016 (LAN 396 of 9 March 2016)',gap:4.5,lead:30,leadRef:'s 42(6): certificate of fitness applied for at least 30 calendar days before a public gathering',
  rules:[
   ['s 32(2)(a),(b)','Tents at least 4.5 m from each other (stakes and guy ropes included), from a boundary and from anything combustible'],
   ['s 32(2)(c),(d)','A tent holding more than 25 people, or used after dark, must meet SANS 10400-T (exits, seating, aisles, extinguishers); density per Reg A21'],
   ['s 32(2)(e)-(h)','No cooking in a tent the public uses; no open fire in a tent or within 5 m of it; no smoking, with a No Smoking sign at each entrance'],
   ['s 42(1),(7)','No public gathering without a certificate of fitness; a temporary population certificate lasts at most 30 days'],
   ['s 35(1)(d)','Fire lanes at least 4 m wide and 4 m high, kept clear'],
   ['s 29, s 28(1)','Escape routes unobstructed and signed; emergency lighting after dark; escape doors unlocked']]},
 {k:'joburg',n:'City of Johannesburg',law:'Emergency Services By-laws, 2004',gap:3,lead:30,leadRef:'s 20(2): certificate of fitness applied for at least 30 days before a public gathering; the JOC also asks 30 days\' notice',
  rules:[
   ['s 10(1)(f)','Tents and temporary structures for a public gathering need a rational design under the National Building Regulations. The by-law gives no fixed spacing, so the 3 m here is a planning figure'],
   ['s 19(1), s 22(d),(e)','No public gathering in a building or temporary structure without a certificate of fitness, which states the maximum occupancy and the number and size of emergency exits'],
   ['s 13','Escape doors open in the direction of escape and need no key to get out; escape routes unobstructed'],
   ['s 14(1)(d)','Emergency vehicle entrances at least 4 m wide and 4.2 m high'],
   ['s 46(4),(5), s 32(2)','LP gas at a public exhibition and fireworks displays each need written permission applied for 14 days ahead'],
   ['JOC requirements','Floor, site and gas plans, structure approvals, medical, security, evacuation and traffic plans; 8 hard copies']]},
 {k:'ekurhuleni',n:'City of Ekurhuleni',law:'SASREA committee process and event application form (Emergency Services By-law not readable online)',gap:3,lead:21,leadRef:'City notice: applications to the SASREA committee at least 21 days before the event (14 in exceptional cases)',toil100:true,
  rules:[
   ['Event application form','Toilets: one per 100 people'],
   ['Event application form','Tents or marquees over 100 m², stages over 1 m high and grandstands need building consent'],
   ['Event application form','Traffic management plan 90 days ahead where a road closes or more than 100 vehicles are expected'],
   ['Not verified','The Emergency Services By-law text could not be read, so tent spacing stays at the 3 m planning figure. Confirm with Disaster and Emergency Management Services (011 999 8833)']]},
 {k:'capetown',n:'City of Cape Town',law:'Events By-law, 2009 (amended 2016) and Community Fire Safety By-law, 2002',gap:4.5,lead:0,leadRef:'Events By-law Schedule 1',ct:true,
  rules:[
   ['Events By-law s 2(2), s 4(1)','A permit is needed for any event of 200 or more people, or any with amplified sound or temporary structures'],
   ['Events By-law s 5(4B)','Over 2,000 people: SAPS approval and a risk categorisation'],
   ['Fire Safety By-law s 16(2)(aA),(b)','Tents at least 4.5 m from each other (stakes and guy ropes included) and from anything combustible'],
   ['Fire Safety By-law s 16(2)(e)-(h)','No cooking in a tent the public uses; no open fire in a tent or within 5 m of it; no smoking, with signs at each entrance'],
   ['Fire Safety By-law s 21(1),(4)','Population certificate for any public assembly of more than 50 people including staff; a temporary one lasts at most 30 days'],
   ['Fire Safety By-law s 12(1)(d)','Fire lanes at least 4 m wide and 4 m high']]},
 {k:'other',n:'Other municipality (national rules only)',law:'No local by-law loaded',gap:3,lead:0,leadRef:'',rules:[['','Only SASREA and SANS 10400 are applied. Get the local fire and events by-laws from the municipality']]}
];
function regionOf(){var k=S.meta.region;for(var i=0;i<REGIONS.length;i++)if(REGIONS[i].k===k)return REGIONS[i];return null}
/* Cape Town Events By-law Schedule 1: size band → working days the application must be in before the event */
function ctBand(att){return att>10000?['Very large (10,001+)',60]:att>5000?['Large (5,001 to 10,000)',25]:att>2000?['Medium (2,001 to 5,000)',20]:['Small (200 to 2,000)',15]}
function daysTo(dateStr,wd){var d=new Date(dateStr+'T00:00:00'),t=new Date();t.setHours(0,0,0,0);if(isNaN(d))return null;if(!wd)return Math.round((d-t)/864e5);var n=0,s=d<t?-1:1,c=new Date(t);while((s>0&&c<d)||(s<0&&c>d)){c.setDate(c.getDate()+s);var g=c.getDay();if(g!==0&&g!==6)n+=s}return n}
function regionFindings(add,C,objs){
 var R=regionOf(),m=S.meta;
 if(!R)return;
 var cat='By-laws: '+R.n;add('info',cat,'Applied: '+R.law+'.');
 R.rules.forEach(function(r){add('info',cat,(r[0]?r[0]+': ':'')+r[1]+'.')});
 var need=R.lead,ref=R.leadRef,wd=false;
 if(R.ct&&C.att>0){var b=ctBand(C.att);need=b[1];wd=true;ref='Events By-law Schedule 1: '+b[0]+' events apply at least '+b[1]+' working days ahead'}
 if(need>0&&m.date){var left=daysTo(m.date,wd);
  if(left!==null&&left>=0){if(left<need)add('warn',cat,'The event is in '+left+(wd?' working':'')+' day'+(left===1?'':'s')+'. '+ref+'. If the application is not in yet, it is late.');else add('pass',cat,left+(wd?' working':'')+' days to the event; '+ref+'.')}}
 if(R.ct&&C.att>0&&C.att<200)add('info',cat,'Under 200 people: the Events By-law applies only if there is amplified sound or a temporary structure (s 2(2)(a)).');
 if(R.toil100&&C.att>0){var tc=cntKeys({toilet:1,toilet_wb:1,trailer_abl:6,trailer_acc:1}),th=+m.toilets>0?+m.toilets:tc,tn=Math.ceil(C.att/100);
  add(th>=tn?'pass':'fail',cat,'Toilets at one per 100 people (event application form): '+tn+' needed, '+th+' on the plan.',[],'Sheet tab → Toilets provided, or draw them.')}
 if(R.gap>3){var closed=objs.filter(function(o){if(o.t!=='rect')return false;var l=LIBM[o.k];return l&&l.c==='Tents'&&l.s!=='stall'&&!isOpenStruct(o)}),ns=objs.filter(function(o){return o.t==='sign'&&o.k==='no_smoking'});
  var miss=closed.filter(function(t){return !ns.some(function(s){return Math.hypot(s.x-t.x,s.y-t.y)<=Math.max(t.w,t.h)/2+4})});
  if(closed.length){if(miss.length)add('warn',cat,miss.length+' enclosed tent'+(miss.length>1?'s have':' has')+' no No Smoking sign at the entrance.',miss.map(function(t){return t.id}),'Signs → No smoking, at each tent entrance.');else add('pass',cat,'Every enclosed tent has a No Smoking sign.')}}
}
function regionModal(force){
 var cur=S.meta.region,h='<h3>Which municipality is this event in?</h3><p class="note">Every metro has its own events and fire by-laws. Pick one so the right tent spacing, application deadlines and local rules are checked. You can change it on the Sheet tab.</p><div style="display:flex;flex-direction:column;gap:8px;margin:10px 0">';
 REGIONS.forEach(function(r){h+='<button class="btn'+(cur===r.k?' pri':'')+'" data-reg="'+r.k+'" style="text-align:left;padding:10px 12px"><b>'+esc(r.n)+'</b><br><small style="font-weight:400">'+esc(r.law)+'</small></button>'});
 h+='</div>';box(h);var mc=$('#mc');if(mc&&!cur)mc.style.display='none';
 $$('[data-reg]',$('#modal')).forEach(function(b){b.onclick=function(){setRegion(b.dataset.reg);$('#modal').classList.remove('on');$('#modal').innerHTML=''}})}
function setRegion(k){S.meta.region=k;var R=regionOf();saveLocal();renderPanel();draw();if(R)toast(R.n+' by-laws applied'+(R.gap>3?': tents '+R.gap+' m apart':''),4500)}
/* ask once a plan is open and no municipality has been chosen */
function regionAsk(){if(S.meta.region||window.__T)return;var m=$('#modal');if(m&&m.classList.contains('on')){setTimeout(regionAsk,3000);return}regionModal()}

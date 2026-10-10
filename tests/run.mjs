// FloorPlan Studio regression tests.  Run from the project root:   npm --prefix tests install && npm --prefix tests test
// Builds the app with a test hook, serves it locally, drives it in headless Chromium and checks the things that must never break.
// Optional: DWG_FIXTURE=/path/to/file.dwg  also tests DWG import on a real file.
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const failures = [];
async function test(name, fn) {
  try { await fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; failures.push(name); console.log('  FAIL ' + name + '\n         ' + (e && e.message || e)); }
}
function ok(c, msg) { if (!c) throw new Error(msg || 'assertion failed'); }
function near(a, b, tol, msg) { if (!(Math.abs(a - b) <= tol)) throw new Error((msg || 'value') + ': expected ' + b + ' ±' + tol + ', got ' + a); }

/* ---- 1. build + static checks (no browser) ---- */
console.log('Build and files');
const b = spawnSync('node', ['build.mjs', '--test'], { cwd: root, encoding: 'utf8' });
await test('app builds from src/app', () => ok(b.status === 0, b.stderr || b.stdout));
const c = spawnSync('node', ['build.mjs', '--check'], { cwd: root, encoding: 'utf8' });
await test('private/app.html is up to date with src/app', () => ok(c.status === 0, c.stderr));
await test('server code has no syntax errors', () => {
  for (const f of readdirSync(join(root, 'api'))) {
    const r = spawnSync('node', ['--check', join(root, 'api', f)], { encoding: 'utf8' });
    ok(r.status === 0, f + ': ' + r.stderr);
  }
});
await test('vercel.json and package.json are valid JSON', () => {
  JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')); JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
});
await test('vendor files are present', () => {
  for (const f of ['dxf-parser.js', 'libredwg/dist/libredwg-web.js', 'libredwg/wasm/libredwg-web.js', 'libredwg/wasm/libredwg-web.wasm', 'leaflet.js'])
    ok(existsSync(join(root, 'public/vendor', f)) && statSync(join(root, 'public/vendor', f)).size > 1000, 'missing public/vendor/' + f);
});
await test('app is served only through the sign-in gate', () => {
  ok(!existsSync(join(root, 'public', 'app.html')), 'app.html must not be in public/');
});

/* ---- 2. local server ---- */
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.wasm': 'application/wasm', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = null;
  if (u === '/test.html') f = join(root, '.test-build', 'test.html');
  else if (u.startsWith('/vendor/') || u === '/impi-logo.png') f = join(root, 'public', u);
  else if (u.startsWith('/api/')) { res.writeHead(404); return res.end(); } // no cloud in tests: the app must work offline
  if (f && existsSync(f)) { res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); return res.end(readFileSync(f)); }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, r));
const base = 'http://localhost:' + server.address().port;

const launch = { headless: true };
if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
else if (existsSync('/opt/pw-browsers/chromium')) launch.executablePath = '/opt/pw-browsers/chromium';
const browser = await chromium.launch(launch);

async function fresh() {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', e => page.errs.push(String(e)));
  await page.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
  await page.goto(base + '/test.html');
  try{await page.waitForFunction(() => window.__T,null,{timeout:8000})}catch(e){throw new Error('app did not start. Script errors: '+page.errs.join(' | '))}
  await page.evaluate(() => { const w = document.getElementById('welcome'); if (w) w.style.display = 'none'; });
  page.close2 = () => ctx.close();
  return page;
}
const ADD = `window.add=(arm,x,y,ex)=>{const T=__T,o=T.makeAt(arm,{x,y});Object.assign(o,ex||{});return T.addObj(o)};`;
/* a plan that should pass every readiness rule */
const GOOD = `()=>{${ADD}const T=__T;add('item:marq10',0,0);add('item:marq10',14,0);
 [[-5,0,-90],[5,0,90],[9,0,-90],[19,0,90]].forEach(a=>add('door:exit',a[0],a[1],{rot:a[2]}));
 [[0,0],[14,0]].forEach(a=>{add('sign:fire_ext',a[0]+3,a[1]+3);add('sign:exit_box',a[0]+5,a[1]);add('sign:exit_box',a[0]-5,a[1])});
 add('sign:first_aid',7,8);add('sign:assembly',7,60);
 T.addObj({t:'poly',pts:[{x:-15,y:-15},{x:35,y:-15},{x:35,y:70},{x:-15,y:70}],site:1,label:'Event site'});
 const m=T.S.meta;m.attend=150;m.tstart='10:00';m.tend='18:00';}`;
/* a plan with deliberate problems */
const BAD = `()=>{${ADD}const T=__T;add('item:marq10',0,0);add('item:marq10',11,0);add('item:marq1020',40,0);
 add('door:exit',0,5);add('door:exit',45,0,{w:0.9});T.S.meta.attend=800;}`;

console.log('\nApp in the browser');
let page = await fresh();
await test('loads with no script errors', async () => { ok(page.errs.length === 0, page.errs.join(' | ')); ok(await page.evaluate(() => __T.S.objs.length === 0)); });

await test('undo and redo', async () => {
  const r = await page.evaluate(`(()=>{${ADD}const T=__T;add('item:marq10',0,0);const a=T.S.objs.length;T.undo();const b=T.S.objs.length;T.redo();return [a,b,T.S.objs.length]})()`);
  ok(r[0] === 1 && r[1] === 0 && r[2] === 1, JSON.stringify(r));
});

await test('crowd capacity maths', async () => {
  const r = await page.evaluate(`(()=>{const T=__T;T.S.meta.attend=300;const C=T.crowdAll();return {cap:C.total,over:C.over}})()`);
  ok(r.cap === 100, 'a 10x10 marquee at 1 m2/person should hold 100, got ' + r.cap);
  ok(r.over === true, 'attendance 300 should be flagged over 100');
});
await page.close2();

page = await fresh();
await test('readiness check: a deliberately bad plan is flagged', async () => {
  await page.evaluate(`(${BAD})()`);
  const f = await page.evaluate(() => __T.rdyRun().filter(x => x.sev === 'fail').map(x => x.cat + '|' + x.msg));
  const has = s => f.some(x => x.includes(s));
  ok(has('Tent spacing'), 'tent spacing not flagged');
  ok(has('Assembly point'), 'missing assembly point not flagged');
  ok(has('Fire equipment') || has('fire extinguisher'), 'missing fire equipment not flagged');
  ok(has('narrower than'), 'narrow exit not flagged');
  ok(has('more than the planned capacity'), 'over capacity not flagged');
  ok(has('First aid'), 'missing first aid not flagged');
});
await page.close2();

page = await fresh();
await test('readiness check: a correct plan has no problems', async () => {
  await page.evaluate(`(${GOOD})()`);
  const f = await page.evaluate(() => __T.rdyRun().filter(x => x.sev === 'fail' || x.sev === 'warn').map(x => x.msg));
  ok(f.length === 0, f.join(' | '));
});

await test('evacuation routes generate', async () => {
  const n = await page.evaluate(() => { try { __T.genEvac(); } catch (e) { return 'ERR ' + e.message; } return __T.S.objs.filter(o => o.ev).length; });
  ok(typeof n === 'number' && n > 0, 'no evacuation routes were generated: ' + n);
});

{ const pg2 = await fresh(); const _p = page; page = pg2; await test('dog-leg exit: square corners, festival size, door at the end', async () => {
  const r = await page.evaluate(() => {
    const T = __T; T.S.objs = [{ t: 'line', id: 'w1', pts: [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }, { x: 0, y: 20 }], closed: true, style: 'fence' }]; T.S.dogId = 'w1';
    T.dogTap({ x: 15, y: 0.05 });
    document.getElementById('dl_p').value = 'f'; document.getElementById('dl_p').onchange(); document.getElementById('dl_c').value = 'q'; document.getElementById('mo').click();
    const lines = T.S.objs.filter(o => o.t === 'line'), door = T.S.objs.find(o => o.t === 'door');
    let diag = 0; lines.forEach(l => { for (let i = 0; i < l.pts.length - 1; i++) { const dx = Math.abs(l.pts[i + 1].x - l.pts[i].x), dy = Math.abs(l.pts[i + 1].y - l.pts[i].y); if (dx > 1e-6 && dy > 1e-6) diag++; } });
    return { n: lines.length, diag, door: door && door.k, w: door && door.w };
  });
  ok(r.n === 3, 'expected the wall plus two passage walls, got ' + r.n);
  ok(r.diag === 0, r.diag + ' diagonal segments (square corners expected)');
  ok(r.door === 'eexit' && r.w === 3, 'door ' + JSON.stringify(r));
});
  await pg2.close2(); page = _p; }
{ const pg3 = await fresh(); const _q = page; page = pg3; await test('truss: draws, is not counted as floor space, exports on its own layer', async () => {
  const r = await page.evaluate(() => { const T = __T, add = (a, x, y) => T.addObj(T.makeAt(a, { x, y }));
    add('item:marq10', 0, 0); const before = T.crowdAll().total;
    add('item:truss66', 0, 0); T.addObj({ t: 'line', style: 'truss', pts: [{ x: 20, y: 0 }, { x: 26, y: 0 }], closed: false });
    return { before, after: T.crowdAll().total, dxf: T.buildDxf(T.S.objs, 1000, 4).txt.includes('FPS-TRUSS'), errs: 0 }; });
  ok(r.before === r.after, 'truss changed the capacity: ' + JSON.stringify(r)); ok(r.dxf, 'FPS-TRUSS layer missing from the DXF');
  ok(page.errs.length === 0, page.errs.join(' | '));
});
  await pg3.close2(); page = _q; }
{ const pg4 = await fresh(); const _r = page; page = pg4;
await test('crowd: open ground counts inside an event site boundary, with a warning until one is set', async () => {
  const r = await page.evaluate(() => { const T = __T, add = (a, x, y) => T.addObj(T.makeAt(a, { x, y }));
    add('item:marq10', 10, 10); T.S.meta.attend = 3500; const a = T.crowdAll();
    T.addObj({ t: 'poly', pts: [{ x: -10, y: -10 }, { x: 80, y: -10 }, { x: 80, y: 70 }, { x: -10, y: 70 }], site: 1, label: 'Event site' }); const b = T.crowdAll();
    return { warn: a.warn.length, before: a.total, after: b.total, open: b.open && b.open.free, units: b.units.length }; });
  ok(r.warn === 1 && r.before === 100, 'no-boundary case: ' + JSON.stringify(r));
  ok(r.after > 7000 && r.units === 1, 'site boundary not counted: ' + JSON.stringify(r));
});
await test('crowd: typed event area counts open ground with no boundary drawn (existing fencing)', async () => {
  const r = await page.evaluate(() => { const T = __T; T.S.objs = []; T.addObj(T.makeAt('item:marq10', { x: 10, y: 10 })); T.S.meta.attend = 3500; T.S.meta.siteArea = 0;
    const a = T.crowdAll(); T.S.meta.siteArea = 5000; const b = T.crowdAll(); const f = T.rdyRun().filter(x => /No event site area/.test(x.msg)).length;
    return { aw: a.warn.length, ao: !!a.open, bo: b.open && b.open.cap, bsrc: b.open && b.open.src, bw: b.warn.length, f }; });
  ok(r.aw === 1 && !r.ao, 'no area: ' + JSON.stringify(r));
  ok(r.bo > 4000 && r.bsrc === 'typed' && r.bw === 0 && r.f === 0, 'typed area: ' + JSON.stringify(r));
});
await test('crowd: total never exceeds the venue certified capacity', async () => {
  const r = await page.evaluate(() => { const T = __T; T.S.objs = []; T.S.meta.siteArea = 9000; T.S.meta.attend = 7000; T.S.meta.certCap = 0; const a = T.crowdAll(); T.S.meta.certCap = 6000; const b = T.crowdAll(); T.S.meta.certCap = 0; T.S.meta.siteArea = 0; return { a: a.total, b: b.total, c: b.capped, o: b.over }; });
  ok(r.a === 9000 && r.b === 6000 && r.c && r.o, JSON.stringify(r));
});
await test('crowd window: the Set button and the Sheet-tab fields really change the crowd figure', async () => {
  await page.evaluate(() => { const T = __T; T.S.objs = []; T.S.meta.siteArea = 0; T.S.meta.certCap = 0; T.S.meta.attend = 7000; T.addObj(T.makeAt('item:marq10', { x: 10, y: 10 })); });
  await page.click('#tabs button[data-tab="sheet"]');
  await page.fill('#m_sitearea', '9000'); await page.press('#m_sitearea', 'Tab');
  const a = await page.evaluate(() => __T.crowdAll().total); ok(a === 9000, 'Sheet-tab area gave ' + a);
  await page.click('[data-act="crowd"]'); await page.fill('#cm_sitearea', '12000'); await page.fill('#cm_cert', '5500'); await page.click('#modal [data-act="sitearea"]');
  const b = await page.evaluate(() => ({ t: __T.crowdAll().total, m: __T.S.meta.siteArea, txt: document.getElementById('modal').innerText }));
  ok(b.t === 5500 && b.m === 12000 && /certified 5,500/.test(b.txt), 'modal Set gave ' + JSON.stringify([b.t, b.m]));
  await page.click('#modal #mc'); await page.evaluate(() => { __T.S.meta.siteArea = 0; __T.S.meta.certCap = 0; });
});
await test('crowd: an event area smaller than the structures is flagged, not silently zero', async () => {
  const r = await page.evaluate(() => { const T = __T; T.S.objs = []; T.addObj(T.makeAt('item:marq10', { x: 10, y: 10 })); T.S.meta.attend = 500; T.S.meta.siteArea = 50; const c = T.crowdAll(); const f = T.rdyRun().some(x => /no bigger than the structures/.test(x.msg)); T.S.meta.siteArea = 0; return { w: c.warn.some(x => /no bigger than the floor space/.test(x)), f }; });
  ok(r.w && r.f, JSON.stringify(r));
});
await test('open-sided structures (Bedouin, gazebo) are not failed for exits; closed marquees are', async () => {
  const r = await page.evaluate(() => { const T = __T, add = (a, x, y) => T.addObj(T.makeAt(a, { x, y }));
    T.S.objs = []; add('item:bedouin', 0, 0); add('item:marq10', 30, 0); T.S.meta.attend = 100;
    return T.rdyRun().filter(f => f.sev === 'fail' && /has no exit at it|only one exit/.test(f.msg)).map(f => f.msg); });
  ok(r.length >= 1 && r.every(m => m.includes('Marquee')), JSON.stringify(r));
});
await pg4.close2(); page = _r; }
let dxfTxt = '';
await test('DXF export is well formed', async () => {
  dxfTxt = await page.evaluate(() => __T.buildDxf(__T.S.objs.filter(o => !o.ev), 1000, 4).txt);
  ok(/\n\s*0\nEOF\s*$/.test(dxfTxt), 'no EOF marker');
  ok(/AC1015/.test(dxfTxt), 'not R2000');
  for (const l of ['FPS-TENTS', 'FPS-DOORS', 'FPS-SIGNS']) ok(dxfTxt.includes(l), 'missing layer ' + l);
  const ents = (dxfTxt.match(/\n  0\n(LINE|LWPOLYLINE|CIRCLE|TEXT|MTEXT|INSERT)\n/g) || []).length;
  ok(ents > 20, 'too few entities: ' + ents);
});

await test('DXF export re-imports to the same size (round trip)', async () => {
  const w = await page.evaluate(async (txt) => {
    const T = __T; await T.loadDxfLib();
    const C = window.DxfParser.default || window.DxfParser, dxf = new C().parseSync(txt);
    const fl = T.dxfFlatten(dxf), sel = {}; Object.keys(fl.layers).forEach(k => sel[k] = true);
    const e = T.dxfExtents(fl, sel); return { w: (e.x1 - e.x0) * 0.001, h: (e.y1 - e.y0) * 0.001 };
  }, dxfTxt);
  ok(w.w > 48 && w.w < 52, 'width ' + w.w + ' m (the event site boundary spans 50 m)');
});
await page.close2();

/* a small hand-made DXF: a 20 m x 10 m rectangle drawn in millimetres */
const RECT_MM = ['0','SECTION','2','HEADER','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','ENTITIES',
  '0','LWPOLYLINE','5','1F','8','WALLS','100','AcDbEntity','100','AcDbPolyline','90','4','70','1',
  '10','0','20','0','10','20000','20','0','10','20000','20','10000','10','0','20','10000','0','ENDSEC','0','EOF'].join('\n') + '\n';

page = await fresh();
await test('DXF import is to scale (mm file, 20 x 10 m)', async () => {
  const r = await page.evaluate(async (txt) => {
    const T = __T; await T.loadDxfLib();
    const C = window.DxfParser.default || window.DxfParser, dxf = new C().parseSync(txt);
    const fl = T.dxfFlatten(dxf), sel = { WALLS: true }, e = T.dxfExtents(fl, sel);
    T.doImportDxf({ name: 'rect' }, fl, sel, 0.001, 'u');
    return { w: (e.x1 - e.x0) * 0.001, h: (e.y1 - e.y0) * 0.001, layers: T.S.layers.length, cal: T.S.layers[0] && T.S.layers[0].cal };
  }, RECT_MM);
  near(r.w, 20, 0.05, 'width'); near(r.h, 10, 0.05, 'height'); ok(r.layers === 1 && r.cal, 'underlay not created/calibrated');
});

await test('saved work survives a reload (objects and background)', async () => {
  await page.evaluate(`(()=>{${ADD}add('item:marq10',3,3);add('sign:assembly',30,30);__T.saveLocal()})()`);
  await page.waitForTimeout(1800);
  await page.reload();
  await page.waitForFunction(() => window.__T);
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => ({ o: __T.S.objs.length, l: __T.S.layers.length }));
  ok(r.o === 2, 'objects after reload: ' + r.o);
  ok(r.l === 1, 'background layers after reload: ' + r.l);
});
await page.close2();

if (process.env.DWG_FIXTURE && existsSync(process.env.DWG_FIXTURE)) {
  page = await fresh();
  await test('DWG import converts and reads (' + process.env.DWG_FIXTURE.split('/').pop() + ')', async () => {
    const bytes = [...readFileSync(process.env.DWG_FIXTURE)];
    const r = await page.evaluate(async (arr) => {
      const T = __T; await T.loadDxfLib();
      const f = new File([new Uint8Array(arr)], 'x.dwg');
      const txt = await T.dwgToDxf(f);
      const C = window.DxfParser.default || window.DxfParser, dxf = new C().parseSync(txt), fl = T.dxfFlatten(dxf);
      return { segs: fl.segs.length, layers: Object.keys(fl.layers).length };
    }, bytes);
    ok(r.segs > 100 && r.layers > 1, JSON.stringify(r));
  });
  await page.close2();
} else console.log('  skip DWG import (set DWG_FIXTURE=/path/to/file.dwg to include it)');

await browser.close(); server.close();
console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('Failed: ' + failures.join('; ')); process.exit(1); }

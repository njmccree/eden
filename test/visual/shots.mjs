// Headless visual QA: boot the built game in Chromium, walk the archive into
// every chapter, screenshot each scene, and fail on console errors, page
// errors, or a blank canvas. Shots land in test/visual/out/ for human review.
// Requires playwright (resolved via NODE_PATH — see run.sh). Network-free:
// the cdnjs three.js request is served from vendor/three-r128.min.js.
import {createRequire} from 'node:module';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(HERE, 'out');
const HTML = readFileSync(join(ROOT, 'dist', 'eden.html'), 'utf8');
const THREE_SRC = readFileSync(join(HERE, 'vendor', 'three-r128.min.js'), 'utf8');
const EXPECT_BUILD = (HTML.match(/EDEN_BUILD\s*=\s*'([^']+)'/) || [])[1];
if (!EXPECT_BUILD) { console.error('FAIL could not read EDEN_BUILD from dist/eden.html'); process.exit(1); }

// Archive rows (order matches ARCH_ROWS in 07-chapters-2-5.js): forged history
// drops us at each chapter's entry scene. settle = ms for cutscene/camera to
// establish before the shot; ready = optional DOM state to wait for first.
const CHAPTERS = [
  {row: 0, name: 'ch1-site-select', settle: 4000},
  {row: 1, name: 'interlude-coast', settle: 5000},
  {row: 2, name: 'ch2-arrival',     settle: 5000},
  {row: 3, name: 'ch3-call',        settle: 5000},
  {row: 4, name: 'ch4-long-night',  settle: 4000, ready: '#dialog', dialogTo: '#n5hud'},
  {row: 5, name: 'ch5-colony',      settle: 4000, ready: '#dialog', dialogTo: '#ch4'},
];

const errors = [];
let shotCount = 0;

function serve() {
  return new Promise(resolve => {
    const srv = createServer((req, res) => {
      res.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
      res.end(HTML);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function hookPage(page, label) {
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[${label}] console.error: ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`[${label}] pageerror: ${err.message}`));
  page.on('requestfailed', req => {
    // Only external requests matter; everything should be local or routed.
    errors.push(`[${label}] requestfailed: ${req.url()} (${req.failure()?.errorText})`);
  });
}

// Decode a PNG screenshot inside the page (browser as image decoder) and
// return luminance stats — catches an all-black or all-flat canvas.
async function pixelStats(page, png) {
  return page.evaluate(async b64 => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let sum = 0, sum2 = 0, n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      sum += y; sum2 += y * y;
    }
    const mean = sum / n;
    return {mean, std: Math.sqrt(Math.max(0, sum2 / n - mean * mean))};
  }, png.toString('base64'));
}

async function shot(page, name, {minStd = 6} = {}) {
  const png = await page.screenshot();
  writeFileSync(join(OUT, name + '.png'), png);
  shotCount++;
  const {mean, std} = await pixelStats(page, png);
  const flat = std < minStd;
  console.log(`${flat ? 'FAIL' : 'ok  '} shot ${name} (luma mean ${mean.toFixed(1)}, std ${std.toFixed(1)})`);
  if (flat) errors.push(`shot ${name}: image is flat/blank (luma std ${std.toFixed(1)} < ${minStd})`);
}

async function bootToMenu(page, base, label) {
  hookPage(page, label);
  await page.route('**/three.min.js', r =>
    r.fulfill({contentType: 'application/javascript', body: THREE_SRC}));
  await page.goto(base, {waitUntil: 'load'});
  await page.waitForSelector('#boot.ready', {timeout: 30000});
  await page.click('#boot');
  await page.waitForSelector('#menu:not(.gone)', {timeout: 10000});
  await page.waitForTimeout(800); // menu fade-in
}

const srv = await serve();
const base = `http://127.0.0.1:${srv.address().port}/`;
mkdirSync(OUT, {recursive: true});

const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required'],
});

try {
  // Pass 1: boot screen, version tag, title menu, archive list.
  {
    const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2});
    hookPage(page, 'boot');
    await page.route('**/three.min.js', r =>
      r.fulfill({contentType: 'application/javascript', body: THREE_SRC}));
    await page.goto(base, {waitUntil: 'load'});
    await page.waitForSelector('#boot.ready', {timeout: 30000});
    await shot(page, '01-boot-ready', {minStd: 2}); // boot screen is intentionally near-empty
    await page.click('#boot');
    await page.waitForSelector('#menu:not(.gone)', {timeout: 10000});
    await page.waitForTimeout(800);
    const vtag = (await page.textContent('#vTag')).trim();
    const vok = vtag === `SURVEY BUILD ${EXPECT_BUILD}`;
    console.log(`${vok ? 'ok  ' : 'FAIL'} version tag "${vtag}" (dist has ${EXPECT_BUILD})`);
    if (!vok) errors.push(`version tag mismatch: "${vtag}" vs EDEN_BUILD ${EXPECT_BUILD}`);
    await shot(page, '02-title-menu');
    await page.evaluate(() => { orbitRoot.userData.world.rotation.y = 4.2; }); // face Africa/Europe
    await page.waitForTimeout(400);
    await shot(page, '02b-title-earth-east'); // antimeridian-crossing rings once inverted this hemisphere
    await page.evaluate(() => { orbitRoot.userData.world.rotation.y = 0; });
    await page.click('#archBtn');
    await page.waitForSelector('#archive', {state: 'visible'});
    const rows = await page.locator('.archRow').count();
    console.log(`${rows === 7 ? 'ok  ' : 'FAIL'} archive rows: ${rows}`);
    if (rows !== 7) errors.push(`expected 7 archive rows, got ${rows}`);
    await shot(page, '03-crew-archive');
    await page.close();
  }

  // Pass 2: terrain-focused scenes the archive can't reach directly — jump via
  // the game's own globals (forgeHistory/go are top-level script functions).
  {
    const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2});
    await bootToMenu(page, base, 'ch2-descent');
    // Direct jumps skip the COAST cutscene that normally hides the orbit scene.
    await page.evaluate(() => { forgeHistory(3); $('menu').classList.add('gone'); orbitRoot.visible = false; go('GAME2'); });
    await page.waitForTimeout(2500);
    await shot(page, '09-ch2-descent');
    await page.close();
  }
  {
    const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2});
    await bootToMenu(page, base, 'ch3-traverse');
    await page.evaluate(() => { forgeHistory(4); $('menu').classList.add('gone'); orbitRoot.visible = false; go('GAME3'); });
    await page.waitForTimeout(3000);
    await shot(page, '10-ch3-traverse-start');
    await page.evaluate(() => { R3.x = -160; }); // teleport into the shadowed bowl
    await page.waitForTimeout(1500);
    await shot(page, '11-ch3-traverse-bowl', {minStd: 3}); // PSR is meant to be dark
    await page.close();
  }

  {
    // Ch.6 epilogue (CH6_ARRIVE): rival lander descent + coalition base reveal.
    // Direct jump with deterministic flags — archive row 7 opens CH6_CALL (the
    // chapter start), whose cutscene lives in the sibling unit. Coordinator:
    // post-merge, also enable a row-6 CHAPTERS entry
    //   {row: 6, name: 'ch6-line-on-map', settle: 5000}
    // to shoot the CH6_CALL entry via the archive.
    const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2});
    await bootToMenu(page, base, 'ch6-arrive');
    await page.evaluate(() => {
      forgeHistory(7); $('menu').classList.add('gone'); orbitRoot.visible = false;
      Object.assign(gameState.flags, {rival: 'China', ch6War: false, coalition: true, claimPct: 72});
      go('CH6_ARRIVE');
    });
    await page.waitForTimeout(6000);
    await shot(page, '14-ch6-arrive-descent'); // rival lander mid-descent over the plain
    await page.waitForTimeout(8000);
    await shot(page, '15-ch6-rival-base');     // touchdown + coalition cluster revealed
    await page.close();
  }

  {
    const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2});
    await bootToMenu(page, base, 'ch1-launch');
    await page.evaluate(() => {
      forgeHistory(1);
      $('menu').classList.add('gone');
      siteChosen = SITES[0]; gameState.site = SITES[0];
      buildSite(siteChosen);
      orbitRoot.visible = false; siteRoot.visible = true;
      scene.background = new THREE.Color(siteChosen.sky.top);
      go('LAUNCH');
    });
    await page.waitForTimeout(2500);
    await shot(page, '12-ch1-launch-count'); // go/no-go polls + broadcast PiP on the pad
    await page.evaluate(() => {
      launch.anomalyDone = true; // deterministic: skip the random helium event
      document.querySelectorAll('#polls button').forEach(b => b.click());
    });
    await page.waitForTimeout(1400);
    await page.evaluate(() => { ignition(); });
    await page.waitForTimeout(800);
    await page.evaluate(() => { launch.t = 28; }); // jump mid-ascent
    await page.waitForTimeout(5500);
    await shot(page, '13-ch1-ascent'); // PiP long-lens tracking, reporter caption
    await page.close();
  }

  // Pass 3: fresh page per chapter so forged state never bleeds between shots.
  for (const ch of CHAPTERS) {
    const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2});
    await bootToMenu(page, base, ch.name);
    await page.click('#archBtn');
    await page.waitForSelector('#archive', {state: 'visible'});
    await page.locator('.archRow').nth(ch.row).click();
    if (ch.ready) await page.waitForSelector(ch.ready, {state: 'visible', timeout: 15000});
    await page.waitForTimeout(ch.settle);
    await shot(page, `${String(ch.row + 4).padStart(2, '0')}-${ch.name}`);
    if (ch.dialogTo) {
      // Click through the entry dialog (each line: 1st click finishes typing,
      // 2nd advances) until the chapter panel appears, then shoot that too.
      for (let i = 0; i < 12 && !(await page.locator(ch.dialogTo).isVisible()); i++) {
        await page.click('#dialog');
        await page.waitForTimeout(400);
      }
      await page.waitForSelector(ch.dialogTo, {state: 'visible', timeout: 5000});
      await page.waitForTimeout(1500);
      await shot(page, `${String(ch.row + 4).padStart(2, '0')}-${ch.name}-panel`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  srv.close();
}

console.log(`\n${shotCount} screenshots -> ${OUT}`);
if (errors.length) {
  console.error(`\nFAIL visual QA: ${errors.length} problem(s)`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('-- visual: all passed');

import { test, expect } from '@playwright/test';

// Visual-verification only: build a dense road network covering every topology
// (straight run, corner/bend, T-junction, cross intersection, dead-end stub) and
// capture close-up + mid screenshots so the rasterization-seam fix can be eyeballed.
test('road topologies render without green seams', async ({ page }, testInfo) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('#setup-overlay')).toBeVisible();
  await page.fill('#input-city-name', 'Seam Check City');
  await page.click('#start-game-btn');
  await expect(page.locator('#setup-overlay')).toBeHidden();
  await page.waitForFunction(() => Boolean(window.__THREEDEECITY_GAME__?.sceneManager));

  // Lay a road network on flat land: horizontal run, vertical run (=> cross),
  // a T off the intersection, and a dead-end stub. Force type=road regardless of
  // existing terrain so every tile is a real road ribbon.
  const placed = await page.evaluate(() => {
    const game = window.__THREEDEECITY_GAME__;
    const W = game.city.size.width, H = game.city.size.height;
    const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
    const cells = [];
    const add = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return; cells.push([x, y]); };
    // horizontal straight run through center
    for (let x = cx - 6; x <= cx + 6; x++) add(x, cy);
    // vertical straight run through center -> cross at (cx,cy)
    for (let y = cy - 6; y <= cy + 6; y++) add(cx, y);
    // T-junction stub off the horizontal run to the right, then turning up
    for (let x = cx + 2; x <= cx + 5; x++) add(x, cy - 3);
    add(cx + 5, cy - 4); add(cx + 5, cy - 5); // corner/bend at the end of that arm
    // dead-end stub off the vertical run
    for (let y = cy + 2; y <= cy + 5; y++) add(cx - 3, y);
    let okCount = 0;
    game.activeToolId = 'tool-road';
    for (const [x, y] of cells) {
      const r = window.__THREEDEECITY_VALIDATE__?.(x, y, 'tool-road');
      if (r?.ok) { game.applyTool(x, y); okCount++; }
    }
    return { total: cells.length, ok: okCount };
  });

  // Drive a couple of render frames so the loop rebuilds meshes + traffic tint.
  await page.evaluate(() => {
    const game = window.__THREEDEECITY_GAME__;
    for (let i = 0; i < 6; i++) game.sceneManager.update(game.city, {});
  });

  // Close-up on the intersection cluster, then a wider framing.
  for (const [name, d] of [['seam-close', 14], ['seam-mid', 30]]) {
    await page.evaluate(({ d }) => {
      const game = window.__THREEDEECITY_GAME__;
      const camera = game.sceneManager.camera;
      const controls = game.sceneManager.controls;
      controls.target.set(0, 0, 0);
      camera.position.set(d * 0.72, d * 0.65, d * 0.72);
      camera.lookAt(0, 0, 0);
      game.sceneManager.update(game.city, {});
    }, { d });
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
  }

  console.log('Road placement:', JSON.stringify(placed), 'errors:', JSON.stringify(errors));
});

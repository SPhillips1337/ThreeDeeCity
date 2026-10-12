import { test, expect } from '@playwright/test';

// TRUE diagonal road: each step moves +1x AND +1y, so consecutive tiles touch
// only at a corner (no shared edge). This is the topology that leaves grass
// diamonds. Build one on guaranteed-land and screenshot the middle.
test('true-diagonal (corner-touching) road: capture for green-diamond inspection', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#setup-overlay')).toBeVisible();
  await page.fill('#input-city-name', 'TrueDiagProbe');
  await page.click('#start-game-btn');
  await expect(page.locator('#setup-overlay')).toBeHidden();
  await page.waitForFunction(() => Boolean(window.__THREEDEECITY_GAME__?.sceneManager));

  const report = await page.evaluate(() => {
    const game = window.__THREEDEECITY_GAME__;
    const W = game.city.size.width, H = game.city.size.height;
    let ox = -1, oy = -1;
    outer:
    for (let y = 4; y < H - 8; y++) {
      for (let x = 4; x < W - 8; x++) {
        let land = true;
        for (let d = 0; d < 8 && land; d++) if (game.city.grid[x + d][y + d].type === 'water') land = false;
        if (land) { ox = x; oy = y; break outer; }
      }
    }
    if (ox < 0) return { found: false };

    // True diagonal: (ox+i, oy+i). Consecutive tiles share only a corner.
    const path = [];
    for (let i = 0; i < 8; i++) path.push([ox + i, oy + i]);
    for (const [px, py] of path) {
      const r = window.__THREEDEECITY_VALIDATE__?.(px, py, 'tool-road');
      if (r?.ok) { game.activeToolId = 'tool-road'; game.applyTool(px, py); }
    }
    // Verify adjacency: are consecutive tiles edge- or corner-touching?
    const isRoad = (a, b) => game.city.grid[a]?.[b]?.type === 'road';
    const adj = path.slice(0, -1).map(([x, y], i) => {
      const [nx, ny] = path[i + 1];
      const edge = isRoad(nx, y) || isRoad(x, ny); // shares a full edge with the NEXT tile's row/col neighbor
      return { step: i, dx: nx - x, dy: ny - y, cornerOnly: !edge };
    });
    return { found: true, origin: [ox, oy], path, adj };
  });

  console.log('TRUEDiag REPORT:', JSON.stringify(report));
  expect(report.found).toBe(true);

  await page.evaluate((origin) => {
    const game = window.__THREEDEECITY_GAME__;
    const cam = game.sceneManager.camera;
    const V3 = cam.position.constructor;
    const t = new V3(origin[0] + 4 - 16, 0, origin[1] + 4 - 16);
    cam.position.set(t.x + 2.5, 4, t.z + 2.5);
    if (game.sceneManager.controls) { game.sceneManager.controls.target.copy(t); game.sceneManager.controls.update(); }
    else cam.lookAt(t);
  }, report.origin);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/true-diagonal.png' });
});

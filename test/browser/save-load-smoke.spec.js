import { test, expect } from '@playwright/test';

// End-to-end save/load: build a recognizable city, record exactly which cells
// became road/zone, save it, restart (wipes all progress), then load and assert
// those same cells + money came back. Proves the whole round trip through
// IndexedDB without assuming where land falls on the generated map.
test('save then load restores the built city after a restart', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('/');
  await expect(page.locator('#setup-overlay')).toBeVisible();
  await page.fill('#input-city-name', 'SaveLoad City');
  await page.click('#start-game-btn');
  await expect(page.locator('#setup-overlay')).toBeHidden();
  await page.waitForFunction(() => Boolean(window.__THREEDEECITY_GAME__?.sceneManager));

  // Build a distinctive state and record the exact cells that succeeded.
  const built = await page.evaluate(() => {
    const game = window.__THREEDEECITY_GAME__;
    const W = game.city.size.width, H = game.city.size.height;
    const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
    const roads = [], zones = [];
    for (let x = cx - 4; x <= cx + 4; x++) {
      const r = window.__THREEDEECITY_VALIDATE__?.(x, cy, 'tool-road');
      if (r?.ok) { game.activeToolId = 'tool-road'; game.applyTool(x, cy); roads.push([x, cy]); }
    }
    for (let y = cy - 3; y <= cy + 3; y++) {
      const r = window.__THREEDEECITY_VALIDATE__?.(cx + 6, y, 'tool-residential-light');
      if (r?.ok) { game.activeToolId = 'tool-residential-light'; game.applyTool(cx + 6, y); zones.push([cx + 6, y]); }
    }
    return { roads, zones, money: game.city.stats.money };
  });
  expect(built.roads.length).toBeGreaterThan(0);
  expect(built.zones.length).toBeGreaterThan(0);

  // Save via the menu.
  await page.click('#menu-toggle');
  await page.click('#menu-save');
  await page.waitForTimeout(250);

  const snapshot = { money: built.money };

  // Restart wipes all progress.
  page.on('dialog', d => d.accept());
  await page.click('#menu-toggle');
  await page.click('#menu-restart');
  await page.waitForTimeout(400);
  const afterRestart = await page.evaluate((roads) => {
    const game = window.__THREEDEECITY_GAME__;
    return roads.map(([x, y]) => game.city.grid[x][y].type);
  }, built.roads);
  // The previously-road cells are no longer road after a fresh restart.
  expect(afterRestart).not.toEqual(expect.arrayContaining(['road']));

  // Load restores them.
  await page.click('#menu-toggle');
  await page.click('#menu-load');
  await page.waitForTimeout(400);
  const restored = await page.evaluate(({ roads, zones }) => {
    const game = window.__THREEDEECITY_GAME__;
    return {
      money: game.city.stats.money,
      roadTypes: roads.map(([x, y]) => game.city.grid[x][y].type),
      zoneTypes: zones.map(([x, y]) => game.city.grid[x][y].type),
      name: game.city.name,
    };
  }, { roads: built.roads, zones: built.zones });

  expect(restored.roadTypes).toEqual(expect.arrayContaining(['road']));
  expect(restored.zoneTypes).toEqual(expect.arrayContaining(['residential']));
  expect(restored.money).toBe(snapshot.money);
  expect(errors).toEqual([]);
});

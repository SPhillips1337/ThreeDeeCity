import { test, expect } from '@playwright/test';

test('found city, render canvas and place a road without console errors', async ({ page }, testInfo) => {
  const messages = [];
  page.on('console', message => {
    if (message.type() === 'error') messages.push(message.text());
  });
  page.on('pageerror', error => messages.push(error.message));

  await page.goto('/');
  await expect(page.locator('#setup-overlay')).toBeVisible();
  await page.fill('#input-city-name', 'Smoke Seed City');
  await page.click('#start-game-btn');
  await expect(page.locator('#setup-overlay')).toBeHidden();
  await expect(page.locator('#game-canvas')).toBeVisible();

  await page.waitForFunction(() => Boolean(window.__THREEDEECITY_GAME__?.sceneManager));
  const canvasState = await page.locator('#game-canvas').evaluate(canvas => ({
    width: canvas.width,
    height: canvas.height,
    hasWebGL: Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl')),
  }));
  expect(canvasState.hasWebGL).toBe(true);
  expect(canvasState.width).toBeGreaterThan(0);
  expect(canvasState.height).toBeGreaterThan(0);
  const sceneState = await page.evaluate(() => ({
    sceneChildren: window.__THREEDEECITY_GAME__.sceneManager.scene.children.length,
    diagnostics: window.__THREEDEECITY_GAME__.sceneManager.renderDiagnostics,
  }));
  expect(sceneState.sceneChildren).toBeGreaterThan(0);
  expect(sceneState.diagnostics).toEqual(expect.objectContaining({
    drawCalls: expect.any(Number),
    triangles: expect.any(Number),
  }));

  await page.click('#tool-road');
  const placed = await page.evaluate(() => {
    const game = window.__THREEDEECITY_GAME__;
    for (let x = 0; x < game.city.size.width; x++) {
      for (let y = 0; y < game.city.size.height; y++) {
        const result = window.__THREEDEECITY_VALIDATE__?.(x, y, 'tool-road');
        if (result?.ok) {
          game.activeToolId = 'tool-road';
          game.applyTool(x, y);
          return { x, y, type: game.city.grid[x][y].type };
        }
      }
    }
    return null;
  });
  expect(placed?.type).toBe('road');

  for (const [name, distance] of [['near', 18], ['design', 36], ['far', 70]]) {
    await page.evaluate(({ distance }) => {
      const game = window.__THREEDEECITY_GAME__;
      const camera = game.sceneManager.camera;
      const controls = game.sceneManager.controls;
      controls.target.set(0, 0, 0);
      camera.position.set(distance * 0.72, distance * 0.65, distance * 0.72);
      camera.lookAt(0, 0, 0);
      game.sceneManager.update(game.city, {});
    }, { distance });
    await page.screenshot({ path: testInfo.outputPath(`${name}-fixed-seed.png`) });
  }

  expect(messages).toEqual([]);
});

// Run after npm run build; PLAYWRIGHT_MODULE may select a bundled Playwright.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dist = path.resolve(__dirname, '../dist');
const output = process.env.RESPONSIVE_OUTPUT || path.resolve(__dirname, '../../.local-backups/responsive-qa');
const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
const val = (name) => parts.find((part) => part.type === name).value;
const today = `${val('year')}-${val('month')}-${val('day')}`;
const title = 'Proyecto de operaciones y seguimiento de resultados del equipo';
const user = { id: 999, username: 'synthetic', email: 'synthetic@example.invalid', first_name: 'Usuario', last_name: 'de pruebas', is_staff: true, sprite: 'gato', avatar: null, notify_on_pomodoro: false };
const boards = [1, 2].map((id) => ({ id, name: title + id, color: '#6366f1', bg_type: 'color', bg_value: '#111827', music_url: '', music_name: 'ninguna', columns: [], cards: ['pending', 'progress', 'done'].map((status, i) => ({ id: id * 10 + i, board: id, title: title + ' actividad detallada', desc: 'https://example.invalid/'.repeat(12), status, date: today, time: '09:30', pomos: 1, order: i, done_at: status === 'done' ? today : '', created_at: today + 'T12:00:00Z', routine: null, is_recurring: false })) }));
const ratio = { completed: 8, total: 10, percent: 80 };
const summary = { recurring: ratio, punctuality: ratio, completed: 12, recovered: 2, overdue: { total: 4, one_two: 1, three_seven: 1, over_seven: 2 }, daily: Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${24 + i}`, completed: i % 4 })), coverage: { baseline_commitments: 3, unknown_completions: 0 } };
const metric = { ...summary, focus_minutes: 125, today, boards: boards.map((b) => ({ ...summary, id: b.id, name: b.name, color: b.color })) };
const errors = [], checks = [], requests = [];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const target = path.resolve(dist, '.' + (req.url === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!target.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(target, (error, data) => { if (error) { res.writeHead(404).end(); return; } res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' }).end(data); });
});
async function noOverflow(page, name) {
  const info = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, contentOverflow: (() => { const main = document.querySelector('.shell-content'); return main ? main.scrollWidth - main.clientWidth : 0; })(), bad: [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.right > innerWidth + 2 && getComputedStyle(el).position !== 'absolute'; }).slice(0, 8).map((el) => String(el.className)) }));
  assert.ok(info.scroll <= info.width + 1, `${name}: ${JSON.stringify(info)}`);
  assert.ok(info.contentOverflow <= 1, `${name}: content overflow ${JSON.stringify(info)}`);
  checks.push(name);
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [width, height] of [[320, 740], [360, 740], [390, 740], [768, 1000], [820, 1000], [1024, 1000], [1280, 1000], [1440, 1000], [844, 390], [1024, 600]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: width <= 1024 });
      await context.addInitScript(({ user }) => localStorage.setItem('kamban-auth', JSON.stringify({ state: { auth: 'in', user, accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh' }, version: 0 })), { user });
      await context.route('**/api/**', async (route) => {
        const url = new URL(route.request().url()); requests.push(url.pathname + url.search);
        let payload = [];
        if (url.pathname.endsWith('/metrics/')) payload = metric;
        else if (url.pathname.endsWith('/auth/me/')) payload = user;
        else if (url.pathname.endsWith('/users/')) payload = [user];
        else if (url.pathname.endsWith('/boards/')) payload = boards;
        else if (/\/boards\/\d+\/$/.test(url.pathname)) payload = boards.find((b) => b.id === Number(url.pathname.split('/').at(-2)));
        else if (url.pathname.endsWith('/routines/')) payload = [{ id: 1, title, description: 'Prueba', board: 1, date_from: today, date_to: today, days: { mon: { on: true, mode: 'fixed', time: '09:00' } }, count: 1, created_at: today + 'T12:00:00Z' }];
        else if (url.pathname.endsWith('/log/')) payload = [{ id: 1, card: 10, board: 1, title, board_name: title, color: '#6366f1', minutes: 25, at: today + 'T12:00:00Z' }];
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      });
      await context.route(/https:\/\/fonts\./, (route) => route.abort());
      const page = await context.newPage(); page.on('pageerror', (error) => errors.push(error.message));
      for (const [name, hash, selector] of [['dashboard', '/', '.dashboard-stats'], ['boards', '/boards', '.boards-grid'], ['board', '/boards/1', '.columns-view'], ['consolidated', '/consolidated', '.consolidated-columns'], ['routines', '/routines', '.routines-form'], ['history', '/history', '.history-table'], ['log', '/log', '.log-list'], ['users', '/users', '.users-table']]) {
        await page.goto(`${base}/#${hash}`); await page.locator(selector).waitFor(); await page.evaluate(() => document.fonts.ready);
        await noOverflow(page, `${width}/${name}`);
        const footer = await page.locator('.shell-action-bar').boundingBox();
        const content = await page.locator('.shell-content').boundingBox();
        assert.ok(content.y + content.height <= footer.y + 1, `${width}/${name}: quick actions cover content`);
        if (['dashboard', 'routines', 'history'].includes(name) && [390, 820, 1440].includes(width)) await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
        if (name === 'dashboard') {
          await page.getByRole('button', { name: 'Rango', exact: true }).click();
          await page.getByLabel('Desde', { exact: true }).fill(today.slice(0, 7) + '-01');
          await Promise.all([page.waitForResponse((res) => res.url().includes('/metrics/') && res.url().includes('board=1')), page.getByRole('combobox', { name: 'Tablero', exact: true }).selectOption('1')]);
          await noOverflow(page, `${width}/dashboard-filters`);
        }
        if (name === 'board') {
          await page.getByText('Calendario', { exact: true }).click(); await noOverflow(page, `${width}/calendar`);
          await page.getByText('Columnas', { exact: true }).click();
          if (width <= 1024) await page.locator('.activity-card').first().tap();
          else await page.locator('.activity-card').first().click();
          await page.locator('.activity-panel').waitFor();
          await noOverflow(page, `${width}/activity-panel`);
          const rect = await page.locator('.activity-panel').boundingBox(); assert.ok(rect.x >= -1 && rect.x + rect.width <= width + 1);
          await page.locator('.activity-panel').getByRole('button', { name: 'Cerrar', exact: true }).click();
          await page.getByRole('button', { name: 'Nueva actividad', exact: true }).click(); await page.locator('.modal-sheet').waitFor();
          await noOverflow(page, `${width}/new-activity`);
          await page.keyboard.press('Escape');
          await page.locator('.modal-sheet').waitFor({ state: 'detached' });
        }
      }
      await page.goto(`${base}/#/`); await page.locator('.dashboard-stats').waitFor();
      if (width <= 1280) {
        await page.getByRole('button', { name: 'Abrir menú', exact: true }).click(); await noOverflow(page, `${width}/navigation`);
        await page.getByRole('button', { name: /Pomodoro/ }).click(); await page.locator('.pomodoro-panel').waitFor();
        await noOverflow(page, `${width}/pomodoro`);
        await page.locator('.pomodoro-panel').getByRole('button', { name: 'Cerrar', exact: true }).click(); await page.keyboard.press('Escape');
      }
      if (width <= 1100) {
        await page.getByRole('button', { name: 'Mostrar tableros', exact: true }).click(); await noOverflow(page, `${width}/sidebar`);
        await page.getByRole('button', { name: 'Menú de cuenta', exact: true }).click();
        const accountVisible = await page.locator('.navbar-user-menu').evaluate((menu) => {
          const item = menu.querySelector('.navbar-user-item');
          const box = item.getBoundingClientRect();
          return menu.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
        });
        assert.equal(accountVisible, true, `${width}: sidebar covers account menu`);
        await page.getByRole('button', { name: 'Perfil', exact: true }).click();
        await page.getByRole('dialog').waitFor(); await noOverflow(page, `${width}/profile`);
        await page.keyboard.press('Escape');
      }
      await context.close(); process.stdout.write(`Validated ${width}x${height}\n`);
    }
    assert.deepEqual(errors, []); assert.ok(requests.some((url) => url.includes('board=1')));
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ checks, errors }, null, 2));
    process.stdout.write(`${checks.length} responsive and interaction checks passed.\n`);
  } finally { await browser.close(); server.close(); }
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });

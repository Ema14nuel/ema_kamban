// Execute real stores and API code with synthetic storage and mocked fetch only.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const listeners = new Map();
const storage = new Map();
global.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
global.window = { localStorage: global.localStorage, addEventListener: (name, fn) => listeners.set(name, fn) };
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.VITE_API_URL', "'https://synthetic.invalid/api'");
  module._compile(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023,
  } }).outputText, filename);
};
const { useAuthStore: auth } = require('../src/store/authStore.ts');
const { useBoardStore: boards } = require('../src/store/boardStore.ts');
const { useRoutineStore: routines } = require('../src/store/routineStore.ts');
const { useLogStore: log } = require('../src/store/logStore.ts');
const { useAdminUsersStore: users } = require('../src/store/adminUsersStore.ts');
const { usePomodoroStore: pomodoro } = require('../src/store/pomodoroStore.ts');
const { useUiStore: ui } = require('../src/store/uiStore.ts');
const { resetSessionData } = require('../src/lib/session.ts');
const { api } = require('../src/lib/api.ts');
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const user = (id) => ({ id, email: `synthetic${id}@example.invalid`, username: `synthetic${id}`, first_name: '', last_name: '', is_staff: false, sprite: 'gato', avatar: null, notify_on_pomodoro: false });
function session(id = 1) {
  resetSessionData();
  auth.setState({ auth: 'in', user: user(id), accessToken: `access-${id}`, refreshToken: `refresh-${id}` });
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('logout clears downloaded content, UI selections, tasks and deferred writes', async () => {
  session();
  const requests = [];
  global.fetch = async (url) => { requests.push(url); return response(null, 204); };
  boards.setState({ boards: [{ id: '1', name: 'Synthetic private', columns: [] }], loaded: true });
  routines.setState({ routines: [{ id: '1' }] });
  log.setState({ log: [{ title: 'Synthetic private' }] });
  users.setState({ users: [user(1)] });
  ui.setState({ focus: { boardId: '1', cardId: '2' }, panel: 'focus', immersive: true });
  pomodoro.getState().addTask('1', '2');
  await boards.getState().patchCard('1', '2', { title: 'Pending private edit' });
  auth.getState().logout();
  await delay(650);
  assert.deepEqual(boards.getState().boards, []);
  assert.deepEqual(routines.getState().routines, []);
  assert.deepEqual(log.getState().log, []);
  assert.deepEqual(users.getState().users, []);
  assert.deepEqual(pomodoro.getState().tasks, []);
  assert.equal(ui.getState().focus, null);
  assert.equal(ui.getState().immersive, false);
  assert.equal(requests.length, 1);
  assert.ok(requests[0].endsWith('/auth/logout/'));
});

test('late board response cannot populate a different account', async () => {
  session();
  let release;
  global.fetch = () => new Promise((resolve) => { release = resolve; });
  const pending = boards.getState().fetchBoards();
  session(2);
  release(response([{ id: 1, name: 'Previous private', cards: [], columns: [] }]));
  await pending;
  assert.deepEqual(boards.getState().boards, []);
  assert.equal(auth.getState().user.id, 2);
});

test('late 401 never logs out the next account', async () => {
  session();
  let release;
  global.fetch = () => new Promise((resolve) => { release = resolve; });
  const pending = api.get('/boards/');
  session(2);
  release(response(null, 401));
  await assert.rejects(pending, /sesión cambió/);
  assert.equal(auth.getState().user.id, 2);
});

test('concurrent renewal is shared and stores the rotated refresh', async () => {
  session();
  let release;
  let count = 0;
  global.fetch = () => { count += 1; return new Promise((resolve) => { release = resolve; }); };
  const one = auth.getState().refreshAccessToken();
  const two = auth.getState().refreshAccessToken();
  assert.equal(count, 1);
  release(response({ access: 'new-access', refresh: 'rotated-refresh' }));
  assert.deepEqual(await Promise.all([one, two]), [true, true]);
  assert.equal(auth.getState().refreshToken, 'rotated-refresh');
});

test('late renewal cannot resurrect a previous session', async () => {
  session();
  let release;
  global.fetch = () => new Promise((resolve) => { release = resolve; });
  const pending = auth.getState().refreshAccessToken();
  session(2);
  release(response({ access: 'old-access', refresh: 'old-refresh' }));
  assert.equal(await pending, false);
  assert.equal(auth.getState().accessToken, 'access-2');
});

test('401 refresh and one retry preserve the current identity', async () => {
  session();
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, bearer: options.headers instanceof Headers ? options.headers.get('Authorization') : null });
    if (url.endsWith('/auth/refresh/')) return response({ access: 'renewed', refresh: 'rotated' });
    return calls.length === 1 ? response(null, 401) : response({ success: true });
  };
  assert.deepEqual(await api.get('/boards/'), { success: true });
  assert.equal(calls.length, 3);
  assert.equal(calls[2].bearer, 'Bearer renewed');
});

test('pomodoro refuses tasks belonging to another account', () => {
  session(2);
  pomodoro.setState({ ownerId: 1, tasks: [{ boardId: '1', cardId: '2' }], activeKey: '2', running: true, endsAt: 1 });
  pomodoro.getState().tick();
  assert.deepEqual(pomodoro.getState().tasks, []);
  assert.equal(pomodoro.getState().running, false);
});

test('cross-tab identity change clears cached data and rehydrates identity', () => {
  session(1);
  boards.setState({ boards: [{ name: 'Previous private' }] });
  storage.set('kamban-auth', JSON.stringify({ state: { auth: 'in', user: user(2), accessToken: 'access-2', refreshToken: 'refresh-2' }, version: 0 }));
  listeners.get('storage')({ key: 'kamban-auth' });
  assert.deepEqual(boards.getState().boards, []);
  assert.equal(auth.getState().user.id, 2);
});


test('same-account token updates across tabs preserve downloaded data', () => {
  session(2);
  boards.setState({ boards: [{ name: 'Current synthetic' }] });
  storage.set('kamban-auth', JSON.stringify({ state: { auth: 'in', user: user(2), accessToken: 'rotated-access', refreshToken: 'rotated-refresh' }, version: 0 }));
  listeners.get('storage')({ key: 'kamban-auth' });
  assert.equal(boards.getState().boards.length, 1);
  assert.equal(auth.getState().accessToken, 'rotated-access');
});

test('profile updates renew an expired token and preserve the profile flow', async () => {
  session(1);
  let attempts = 0;
  global.fetch = async (url) => {
    if (url.endsWith('/auth/refresh/')) return response({ access: 'renewed', refresh: 'rotated' });
    attempts += 1;
    return attempts === 1 ? response(null, 401) : response({ ...user(1), sprite: 'perro' });
  };
  await auth.getState().updateProfile({ sprite: 'perro' });
  assert.equal(auth.getState().user.sprite, 'perro');
  assert.equal(attempts, 2);
});

test('a late login result cannot overwrite a newer login', async () => {
  let releaseOld;
  global.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    if (body.email === 'old@example.invalid') return new Promise((resolve) => { releaseOld = resolve; });
    return response({ access: 'access-2', refresh: 'refresh-2', user: user(2) });
  };
  const old = auth.getState().login('old@example.invalid', 'synthetic');
  await delay(0);
  assert.equal(await auth.getState().login('new@example.invalid', 'synthetic'), true);
  releaseOld(response({ access: 'old', refresh: 'old', user: user(1) }));
  assert.equal(await old, false);
  assert.equal(auth.getState().user.id, 2);
});

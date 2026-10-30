const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
  }).outputText, filename);
};
const { isCardVisibleToday, overdueDays } = require('../src/lib/schedule.ts');
const { todayIso, toIso } = require('../src/lib/date.ts');
const card = (date, extra = {}) => ({ id: '1', title: 'Actividad', desc: '', date, time: '', order: 0, ...extra });
function daysAgo(days) {
  const date = new Date(`${todayIso()}T12:00:00`);
  date.setDate(date.getDate() - days);
  return toIso(date);
}
test('unfinished overdue activities stay visible in every unfinished status', () => {
  for (const status of ['pending', 'progress', 'waiting', 'custom']) {
    assert.equal(isCardVisibleToday(card(daysAgo(10)), status), true);
    assert.equal(overdueDays(card(daysAgo(10)), status), 10);
  }
});
test('today, future and undated activities do not have overdue alerts', () => {
  for (const date of [todayIso(), daysAgo(-1), '']) assert.equal(overdueDays(card(date), 'pending'), 0);
  assert.equal(isCardVisibleToday(card(daysAgo(-1)), 'pending'), false);
  assert.equal(isCardVisibleToday(card(''), 'pending'), true);
});
test('completing an overdue activity removes its alert and keeps weekly history rules', () => {
  assert.equal(overdueDays(card(daysAgo(15), { doneAt: todayIso() }), 'done'), 0);
  assert.equal(isCardVisibleToday(card(daysAgo(15), { doneAt: todayIso() }), 'done'), true);
  assert.equal(isCardVisibleToday(card(daysAgo(15), { doneAt: daysAgo(15) }), 'done'), false);
});
test('calendar-day count works across month and year boundaries', () => {
  const date = `${Number(todayIso().slice(0, 4)) - 1}-12-31`;
  const expected = (Date.parse(`${todayIso()}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000;
  assert.equal(overdueDays(card(date), 'pending'), expected);
});

test('recurring activities expire instead of accumulating overdue work', () => {
  for (const status of ['pending', 'progress', 'waiting']) {
    const recurring = card(daysAgo(1), { routineId: '7' });
    assert.equal(isCardVisibleToday(recurring, status), false);
    assert.equal(overdueDays(recurring, status), 0);
    assert.equal(isCardVisibleToday(card(todayIso(), { routineId: '7' }), status), true);
    assert.equal(isCardVisibleToday(card(daysAgo(-1), { routineId: '7' }), status), false);
  }
  assert.equal(isCardVisibleToday(card(daysAgo(1), { routineId: '7', doneAt: todayIso() }), 'done'), true);
});

test('calendar excludes only expired unfinished recurring occurrences', () => {
  const { isExpiredRecurring } = require('../src/lib/schedule.ts');
  assert.equal(isExpiredRecurring(card(daysAgo(1), { isRecurring: true }), 'pending'), true);
  assert.equal(isExpiredRecurring(card(daysAgo(1), { isRecurring: true }), 'done'), false);
  assert.equal(isExpiredRecurring(card(todayIso(), { isRecurring: true }), 'pending'), false);
  assert.equal(isExpiredRecurring(card(daysAgo(-1), { isRecurring: true }), 'pending'), false);
  assert.equal(isExpiredRecurring(card(daysAgo(1)), 'pending'), false);
});

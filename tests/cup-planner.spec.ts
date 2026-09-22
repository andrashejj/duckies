import { test, expect, type APIRequestContext } from '@playwright/test';
import pg from 'pg';
import { signIn } from './auth-helpers';
import { DEFAULT_CUP_PLAN, boundaryTies, cupTimetable, progressiveDraw, roundReadiness } from '../src/lib/cup-planner';
import { standings, type Entrant, type Heat, type Wave } from '../src/lib/comp';
import type { CompState } from '../src/lib/server/comp';
const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
const origin = 'http://127.0.0.1:4329';
const email = 'planner@example.com';
const post = (data: unknown) => ({ headers: { origin }, data });
const config = { edition: 'cup-vol-2', rounds: 3, heatSize: 4, finalSize: 4, live: false, version: 1, plan: DEFAULT_CUP_PLAN };
const state = async (request: APIRequestContext): Promise<CompState> => (await request.get('/api/admin/cup')).json();
const makeHeat = (id: string, round: number, slots: Heat['slots'], number = 1): Heat => ({ id, stage: 'round', round, number, status: 'done', startedAt: null, finishedAt: null, durationMinutes: 8, endsAt: null, slots, judges: [] });
const entrants: Entrant[] = Array.from({ length: 12 }, (_, i) => ({ id: `k${i}`, name: `Surfer ${i}`, age: 10, member: true, photoVersion: null }));
let randomSeed = 321;
const random = () => { randomSeed = randomSeed * 16807 % 2147483647; return randomSeed / 2147483647; };

test('the full timetable reserves four surfs, breaks, a last Cup final and delay estimates', () => {
  const table = cupTimetable(config, 12, [])!;
  expect(table.rows).toHaveLength(12);
  expect(table.rows[0].start).toBe('2026-10-16T11:00:00.000Z');
  expect(table.rows.at(-1)).toMatchObject({ stage: 'final', number: 1 });
  expect(table.finish).toBe('2026-10-16T13:15:00.000Z');
  expect(table.spareMinutes).toBe(15);
  expect(cupTimetable(config, 16, [])!.spareMinutes).toBe(-25);
  const late = { ...makeHeat('late', 1, []), startedAt: '2026-10-16T11:20:00Z', finishedAt: '2026-10-16T11:28:00Z' };
  expect(cupTimetable(config, 12, [late])!.spareMinutes).toBe(-5);
});

test('random rounds minimise repeat opponents, then nearby scores group with equal participation', () => {
  const first = progressiveDraw(entrants, 1, [], [], DEFAULT_CUP_PLAN, random);
  expect(first.flat().map(s => s.kidId)).not.toEqual(entrants.map(k => k.id));
  const h1 = first.map((slots, i) => makeHeat(`a${i}`, 1, slots, i + 1));
  const second = progressiveDraw(entrants, 2, h1, [], DEFAULT_CUP_PLAN, random);
  const h2 = second.map((slots, i) => makeHeat(`b${i}`, 2, slots, i + 1));
  for (const round of [first, second]) {
    expect(round.flat().map(s => s.kidId).sort()).toEqual(entrants.map(k => k.id).sort());
    for (const heat of round) expect(new Set(heat.map(s => s.colour)).size).toBe(heat.length);
  }
  const ranking = standings(config, entrants, [...h1, ...h2], []).map((row, i) => ({ ...row, rank: i + 1, total: 5 - i / 3 }));
  const third = progressiveDraw(entrants, 3, [...h1, ...h2], ranking, DEFAULT_CUP_PLAN, random);
  expect(new Set(third[0].map(s => s.kidId))).toEqual(new Set(ranking.slice(0, 4).map(r => r.kidId)));
  const mates = (heats: Heat[], id: string) => heats.find(h => h.slots.some(s => s.kidId === id))!.slots.filter(s => s.kidId !== id).map(s => s.kidId);
  for (const kid of entrants) expect(mates(h2, kid.id).filter(id => mates(h1, kid.id).includes(id)).length).toBeLessThan(3);
  expect(roundReadiness(entrants, [...h1, ...h2], 2)).toBeNull();
  expect(roundReadiness([...entrants, { ...entrants[0], id: 'late' }], [...h1, ...h2], 2)).toContain('exactly one');
});

test('all rounds count equally, absent scores count zero, and lower finals cannot win the Cup', () => {
  const kids = entrants.slice(0, 2);
  const hs = [1, 2, 3].map(round => makeHeat(`h${round}`, round, [{ kidId: kids[0].id, colour: 'red' }, { kidId: kids[1].id, colour: 'blue' }]));
  const waves: Wave[] = hs.flatMap((h, i) => kids.map((k, n) => ({ id: `${i}-${n}`, heatId: h.id, kidId: k.id, judge: 'judge', wave: 1, score: n ? 4 : i === 0 ? 5 : 1 })));
  const board = standings(config, kids, hs, waves);
  expect(board[0]).toMatchObject({ kidId: kids[1].id, total: 4 });
  expect(board[1].total).toBe(2.33);
  expect(standings(config, kids, hs, waves.filter(w => w.heatId !== 'h3'))[0].total).toBe(2.67);
  expect(standings(config, kids, hs.map(h => ({ ...h, status: 'running' })), waves)[0].heats).toBe(0);
  const finals: Heat[] = kids.map((k, i) => ({ ...makeHeat(`f${i}`, 0, [{ kidId: k.id, colour: 'red' }], i + 1), stage: 'final' }));
  const result = standings(config, kids, [...hs, ...finals], [...waves, ...finals.map((h, i) => ({ id: `fw${i}`, heatId: h.id, kidId: kids[i].id, judge: 'judge', wave: 1, score: i ? 5 : 1 }))]);
  expect(result.find(r => r.kidId === kids[0].id)?.finalPlace).toBe(1);
  expect(result.find(r => r.kidId === kids[1].id)?.finalPlace).toBe(5);
});

test.describe('guided planner API and UI', () => {
  test.beforeEach(async () => {
    await db.query('TRUNCATE club_member_archive,club_kid,club_member,"user","session",account,verification,"rateLimit",shop_request_limit,cup_heat,cup_judge,cup_ticker,club_parent_profile CASCADE');
    await db.query("INSERT INTO club_member(email,role) VALUES($1,'organiser')", [email]);
    await db.query("INSERT INTO club_parent_profile(email,name,phone) VALUES($1,'Organiser','')", [email]);
    await db.query("UPDATE cup_event SET plan=NULL,final_review=NULL,rounds=2,heat_size=4,final_size=4,live=false,version=1 WHERE edition='cup-vol-2'");
    for (let i = 1; i <= 12; i++) {
      const kid = await db.query('INSERT INTO club_kid(name) VALUES($1) RETURNING id', [`Surfer ${String(i).padStart(2, '0')}`]);
      await db.query("INSERT INTO club_cup_entry(kid_id,edition,member,contact_name,contact_phone) VALUES($1,'cup-vol-2',true,'Parent','+230 5555 0000')", [kid.rows[0].id]);
    }
  });
  test('complete progression, full-heat swaps, boundary review, protection and public timetable', async ({ request, playwright, page }) => {
    await signIn(request, email);
    expect((await request.patch('/api/admin/cup', post({ plan: DEFAULT_CUP_PLAN, version: 1 }))).status()).toBe(200);
    expect((await request.post('/api/admin/cup/rounds', post({ round: 2 }))).status()).toBe(409);
    expect((await request.post('/api/admin/cup/final', post({}))).status()).toBe(409);
    const first = await request.post('/api/admin/cup/rounds', post({ round: 1 })); expect(first.status()).toBe(201);
    let board: CompState = await first.json();
    const [a,b] = board.heats;
    const [one,two] = [a.slots[0], b.slots[0]];
    const move = (body: object) => request.post('/api/admin/cup/slots', post({ kidId: one.kidId, stage: 'round', round: 1, heatId: b.id, ...body }));
    expect((await move({ swapKidId: two.kidId })).status()).toBe(200);
    board = await state(request);
    expect(board.heats[0].slots.some(s => s.kidId === two.kidId)).toBe(true);
    expect(board.heats[1].slots.some(s => s.kidId === one.kidId)).toBe(true);
    expect(board.heats.map(h => h.slots.length)).toEqual([4,4,4]);
    expect((await request.patch('/api/admin/cup', post({ plan: DEFAULT_CUP_PLAN, version: board.config.version }))).status()).toBe(409);
    for (let round = 1; round <= 3; round++) {
      if (round > 1) expect((await request.post('/api/admin/cup/rounds', post({ round }))).status()).toBe(201);
      board = await state(request);
      const group = board.heats.filter(h => h.stage === 'round' && h.round === round);
      for (const heat of group) {
        expect((await request.put(`/api/admin/cup/heats/${heat.id}/judges`, post({ judges: [email] }))).status()).toBe(200);
        expect((await request.patch(`/api/admin/cup/heats/${heat.id}`, post({ status: 'running' }))).status()).toBe(200);
        if (round === 1 && heat.id === a.id) {
          expect((await request.patch(`/api/admin/cup/heats/${b.id}`, post({ status: 'running' }))).status()).toBe(409);
          expect((await move({ kidId: two.kidId })).status()).toBe(409);
          expect((await request.post('/api/admin/cup/rounds', post({ round: 1 }))).status()).toBe(409);
        }
        for (const slot of heat.slots) expect((await request.post('/api/cup/judge/waves', post({ heatId: heat.id, kidId: slot.kidId, wave: 1, score: 4 }))).status()).toBe(201);
        expect((await request.patch(`/api/admin/cup/heats/${heat.id}`, post({ status: 'done' }))).status()).toBe(200);
      }
    }
    board = await state(request);
    expect(board.standings.every(r => r.heats === 3 && r.total === 4)).toBe(true);
    expect(boundaryTies(board.standings)).toHaveLength(2);
    expect((await request.post('/api/admin/cup/final', post({}))).status()).toBe(409);
    const review = { order: board.standings.map(r => r.kidId), reason: 'Head judge reviewed a separately observed surf-off for all tied surfers.' };
    expect((await request.post('/api/admin/cup/final', post({ ...review, order: [review.order[0]] }))).status()).toBe(400);
    [review.order[3], review.order[4]] = [review.order[4], review.order[3]];
    await signIn(page.request, email);
    await page.goto('/admin/cup');
    await page.getByRole('button', { name: `Move ${board.standings[3].name} down in tie review`, exact: true }).click();
    await page.getByLabel('Tie decision and reason').fill(review.reason);
    await page.getByRole('button', { name: 'Confirm & build placement finals', exact: true }).click();
    await expect.poll(async () => (await state(request)).config.finalReview).toEqual(review);
    board = await state(request);
    expect(board.config.finalReview).toEqual(review);
    const finals = board.heats.filter(h => h.stage === 'final');
    expect(finals.map(h => h.number)).toEqual([3,2,1]);
    expect(finals.flatMap(h => h.slots)).toHaveLength(12);
    expect(new Set(finals.at(-1)!.slots.map(s => s.kidId))).toEqual(new Set(review.order.slice(0,4)));
    expect((await request.post('/api/admin/cup/slots', post({ kidId: finals[0].slots[0].kidId, stage: 'final', round: 0, heatId: finals[2].id, swapKidId: finals[2].slots[0].kidId }))).status()).toBe(409);
    expect((await request.patch(`/api/admin/cup/heats/${finals[2].id}`, post({ status: 'running' }))).status()).toBe(409);
    for (const heat of finals) {
      await request.put(`/api/admin/cup/heats/${heat.id}/judges`, post({ judges: [email] }));
      expect((await request.patch(`/api/admin/cup/heats/${heat.id}`, post({ status: 'running' }))).status()).toBe(200);
      expect((await request.post('/api/admin/cup/final', post(review))).status()).toBe(409);
      for (const slot of heat.slots) expect((await request.post('/api/cup/judge/waves', post({ heatId: heat.id, kidId: slot.kidId, wave: 1, score: 4 }))).status()).toBe(201);
      expect((await request.patch(`/api/admin/cup/heats/${heat.id}`, post({ status: 'done' }))).status()).toBe(200);
    }
    board = await state(request);
    expect(board.heats.every(h => h.status === 'done')).toBe(true);
    for (const kid of board.entrants) expect(board.heats.filter(h => h.slots.some(s => s.kidId === kid.id))).toHaveLength(4);
    expect(new Set(board.standings.map(row => row.finalPlace))).toEqual(new Set([1, 5, 9])); // Exact ties share a place, never alphabetical winners.
    await request.patch('/api/admin/cup', post({ live: true, version: board.config.version }));
    const guest = await playwright.request.newContext({ baseURL: origin });
    const live = await (await guest.get('/api/cup/live')).json();
    expect(live.timetable.rows).toHaveLength(12);
    expect(live.timetable.rows[0].surfers).toHaveLength(4);
    expect(JSON.stringify(live)).not.toContain(review.order[0]);
    expect(JSON.stringify(live)).not.toContain(review.reason);
    expect((await guest.post('/api/admin/cup/slots', post({}))).status()).not.toBe(200);
    await guest.dispose();
  });
  test('the organiser saves the guided plan, sees named times and swaps from a phone', async ({ page }) => {
    await signIn(page.request, email);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin/cup');
    await expect(page.getByRole('heading', { name: 'Four surfs for every kid' })).toBeVisible();
    await page.getByRole('button', { name: 'Save format & timetable' }).click();
    await expect(page.getByText('Guided format and timetable saved.')).toBeVisible();
    await expect(page.getByText('12 kids · 12 heats · estimated finish 17:15')).toBeVisible();
    await page.getByRole('button', { name: 'Draw round 1', exact: true }).click();
    await expect(page.getByText('Round 1 drawn.')).toBeVisible();
    const board = await state(page.request);
    const [first, second] = board.heats;
    const name = board.entrants.find(k => k.id === first.slots[0].kidId)!.name;
    await page.getByLabel(`Move ${name}`, { exact: true }).selectOption(`swap:${second.id}:${second.slots[0].kidId}`);
    await expect.poll(async () => (await state(page.request)).heats.find(h => h.id === second.id)!.slots.some(s => s.kidId === first.slots[0].kidId)).toBe(true);
    await page.getByLabel('Find a surfer’s heats').selectOption(first.slots[0].kidId);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/cup-planner-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: 'test-results/cup-planner-desktop.png', fullPage: true });
  });
});
test.afterAll(async () => { await db.end(); });

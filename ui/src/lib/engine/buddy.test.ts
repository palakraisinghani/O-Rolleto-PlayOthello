// Buddy's skill estimate: synthetic players of known temperature must be recovered, and the running
// profile must follow a player who improves while Buddy stays a little ahead.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Rng } from './ai.ts';
import {
  BUDDY_EDGE,
  NEW_PROFILE,
  buddySkill,
  buddyTemperature,
  estimateSkill,
  parseLevel,
  profileAtLevel,
  moveProbabilities,
  skillFromT,
  tFromSkill,
  updateProfile,
  type MoveSample
} from './buddy.ts';

/** Visit counts like a 100-simulation search: a few good moves share most visits. */
function fakeVisits(rng: Rng): number[] {
  const n = 3 + rng.below(10);
  const raw = Array.from({ length: n }, (_, i) => Math.pow(0.45, i) * (0.6 + 0.8 * (rng.below(1000) / 1000)));
  const total = raw.reduce((a, b) => a + b, 0);
  const visits = raw.map((x) => Math.round((x / total) * 100));
  // shuffle the order so the best move is not always first
  for (let i = n - 1; i > 0; i--) {
    const j = rng.below(i + 1);
    [visits[i], visits[j]] = [visits[j], visits[i]];
  }
  return visits;
}

function playGame(skill: number, moves: number, rng: Rng): MoveSample[] {
  const t = tFromSkill(skill);
  return Array.from({ length: moves }, () => {
    const visits = fakeVisits(rng);
    const p = moveProbabilities(visits, t);
    let x = rng.below(1_000_000) / 1_000_000;
    let chosen = p.length - 1;
    for (let i = 0; i < p.length; i++) {
      x -= p[i];
      if (x < 0) {
        chosen = i;
        break;
      }
    }
    return { visits, chosen };
  });
}

test('skill and temperature convert both ways', () => {
  assert.equal(skillFromT(0), 1);
  assert.ok(Math.abs(skillFromT(8)) < 1e-12);
  for (const s of [0, 0.2, 0.5, 0.8, 1]) assert.ok(Math.abs(skillFromT(tFromSkill(s)) - s) < 1e-9);
  assert.ok(tFromSkill(0.3) > tFromSkill(0.7), 'weaker play means a higher temperature');
});

test('move probabilities form a distribution and favour well-visited moves', () => {
  for (const t of [0, 0.5, 2, 8]) {
    const p = moveProbabilities([60, 30, 10, 0], t);
    assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-9);
    assert.ok(p.every((x) => x > 0));
    assert.ok(p[0] >= p[1] && p[1] >= p[2] && p[2] >= p[3]);
  }
});

test('the estimate recovers the true skill of synthetic players', () => {
  const rng = new Rng(7);
  for (const skill of [0.15, 0.4, 0.65, 0.9]) {
    // average several 30-move games, as a player would build up over a few sessions
    const estimates = Array.from({ length: 6 }, () => estimateSkill(playGame(skill, 30, rng))!.skill);
    const mean = estimates.reduce((a, b) => a + b, 0) / estimates.length;
    assert.ok(Math.abs(mean - skill) < 0.12, `true ${skill}, estimated ${mean.toFixed(3)}`);
  }
});

test('stronger players get higher estimates, and more moves make it surer', () => {
  const rng = new Rng(11);
  const weak = estimateSkill(playGame(0.2, 30, rng))!;
  const strong = estimateSkill(playGame(0.85, 30, rng))!;
  assert.ok(strong.skill > weak.skill);
  const short = estimateSkill(playGame(0.5, 8, rng))!;
  const long = estimateSkill(playGame(0.5, 40, rng))!;
  assert.ok(long.sd < short.sd);
  assert.equal(estimateSkill([]), null);
});

test('the profile follows an improving player and Buddy stays slightly ahead', () => {
  const rng = new Rng(3);
  let p = NEW_PROFILE;
  const levels: number[] = [];
  for (let g = 0; g < 40; g++) {
    const truth = 0.25 + (0.5 * g) / 39; // improves from 0.25 to 0.75
    p = updateProfile(p, estimateSkill(playGame(truth, 28, rng))!, { time: g, opponent: 'buddy', result: 'win' });
    levels.push(p.level);
    assert.ok(buddySkill(p) >= p.level);
    assert.ok(buddySkill(p) - p.level <= BUDDY_EDGE + 1e-12);
  }
  assert.ok(levels[39] > levels[5] + 0.25, 'the estimate rises with the player');
  assert.ok(Math.abs(levels[39] - 0.75) < 0.15, `ended at ${levels[39].toFixed(3)}`);
  assert.ok(buddyTemperature(p) < tFromSkill(p.level), 'Buddy plays with a lower temperature than you');
  assert.equal(p.games.length, 40);
});

test('a level carried over from an earlier session starts the profile there', () => {
  const p = profileAtLevel(0.62);
  assert.equal(p.level, 0.62);
  assert.equal(p.games.length, 0);
  assert.ok(buddySkill(p) > 0.62);
  assert.equal(profileAtLevel(7).level, 1);
  assert.equal(parseLevel('0.62'), 0.62);
  assert.equal(parseLevel(' 0,5 '), 0.5);
  assert.equal(parseLevel('62%'), 0.62);
  for (const bad of ['', 'abc', '1.5', '-0.1', '150%']) assert.equal(parseLevel(bad), null, bad);
  // a game at a different level moves the carried-over estimate towards it
  const rng = new Rng(5);
  const next = updateProfile(p, estimateSkill(playGame(0.9, 30, rng))!, { time: 0, opponent: 'Buddy', result: 'win' });
  assert.ok(next.level > 0.62);
});

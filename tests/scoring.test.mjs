// Bonus de emoción a partir de la tarjeta hoyo a hoyo
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bonusPoints } from '../src/lib/scoring.js'

const holePars = Object.fromEntries(Array.from({ length: 18 }, (_, i) => [i + 1, 4]))
const card = (diffs) => diffs.map((d) => (d == null ? null : 4 + d))
const tournament = { holePars, status: 'in_progress', rounds: 4 }

test('racha: 3 bajo par seguidos, solo una por ronda', () => {
  const r = bonusPoints({ scorecard: [{ round: 1, strokes: card([-1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]) }] }, tournament)
  assert.equal(r.streaks, 1)
  assert.equal(r.bogeyFree, 0)
})

test('ronda sin bogeys solo con los 18 hoyos jugados', () => {
  const full = bonusPoints({ scorecard: [{ round: 1, strokes: card(Array(18).fill(0)) }] }, tournament)
  const partial = bonusPoints({ scorecard: [{ round: 1, strokes: card([...Array(9).fill(0), ...Array(9).fill(null)]) }] }, tournament)
  assert.equal(full.bogeyFree, 1)
  assert.equal(partial.bogeyFree, 0)
})

test('hoyo en uno: +10', () => {
  const strokes = card(Array(18).fill(0)); strokes[6] = 1
  const r = bonusPoints({ scorecard: [{ round: 1, strokes }] }, tournament)
  assert.equal(r.holesInOne, 1)
  assert.equal(r.total, 10 + 3) // y además ronda sin bogeys
})

test('todas las rondas bajo par: solo al terminar el torneo', () => {
  const under = { round: 1, strokes: card([-1, ...Array(17).fill(0)]) }
  const scorecard = [1, 2, 3, 4].map((round) => ({ ...under, round }))
  assert.equal(bonusPoints({ scorecard }, tournament).allUnderPar, false)
  assert.equal(bonusPoints({ scorecard }, { ...tournament, status: 'final' }).allUnderPar, true)
})

test('precio por forma: sube en racha, baja fuera de forma, nunca fuera de 4-25M', async () => {
  const { formAdjustment, withForm } = await import('../src/lib/pricing.js')
  const r = (position) => ({ position, finished: true })
  assert.equal(formAdjustment([r('1'), r('T3'), r('2'), r('T5')]).adjustment, 3)
  assert.equal(formAdjustment([r('CUT'), r('CUT'), r('T70'), r('CUT')]).adjustment, -2)
  assert.equal(formAdjustment([r('T30'), r('T25'), r('T40'), r('T20')]).trend, 'flat')
  assert.deepEqual(formAdjustment([]).form, [])
  assert.equal(withForm(24, 3), 25)
  assert.equal(withForm(4.5, -2), 4)
})

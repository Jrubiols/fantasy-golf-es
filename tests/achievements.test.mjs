import assert from 'node:assert/strict'
import { test } from 'node:test'
import { achievementsFor } from '../src/lib/achievements.js'

test('logros: se ganan en el primer torneo que los cumple y los torneos en juego no cuentan', () => {
  const entries = [
    { tournamentName: 'B', startDate: '2026-02', final: true, rank: 1, points: 310, stats: { captainTop: true, allMadeCut: false, birdies: 40, eagles: 1 } },
    { tournamentName: 'A', startDate: '2026-01', final: true, rank: 3, points: 120, stats: { captainTop: false, allMadeCut: true, birdies: 61, eagles: 3 } },
    { tournamentName: 'C', startDate: '2026-03', final: false, rank: 1, points: 400, stats: {} },
  ]
  const byId = Object.fromEntries(achievementsFor(entries).map((a) => [a.id, a]))
  assert.equal(byId.debut.entry.tournamentName, 'A')
  assert.equal(byId.podium.entry.tournamentName, 'A')
  assert.equal(byId.champion.entry.tournamentName, 'B')
  assert.equal(byId.hattrick.earned, false)
  assert.equal(byId.cut.entry.tournamentName, 'A')
  assert.equal(byId.birdies.entry.tournamentName, 'A')
  assert.equal(byId.eagles.entry.tournamentName, 'A')
  assert.equal(byId.century.entry.tournamentName, 'B')
  assert.equal(byId.regular.earned, false)
})

export const POINTS = {
  eagle: 5, birdie: 3, par: 1, bogey: -1, doubleBogeyOrWorse: -2,
  cutMade: 5, cutMissed: -10,
  pos1: 30, pos2: 25, pos3: 22, pos4: 19, pos5: 16,
  top10: 12, top15: 8, top20: 5, top30: 3,
}

export const TEAM_SIZE = 6
export const BUDGET = 100

export function calculatePlayerPoints(playerData) {
  let pts = 0
  if (playerData.eagles) pts += playerData.eagles * POINTS.eagle
  if (playerData.birdies) pts += playerData.birdies * POINTS.birdie
  if (playerData.pars) pts += playerData.pars * POINTS.par
  if (playerData.bogeys) pts += playerData.bogeys * POINTS.bogey
  if (playerData.doubleBogeys) pts += playerData.doubleBogeys * POINTS.doubleBogeyOrWorse
  if (playerData.cutMade === true) pts += POINTS.cutMade
  if (playerData.cutMade === false) pts += POINTS.cutMissed
  const pos = playerData.position
  if (pos === 1) pts += POINTS.pos1
  else if (pos === 2) pts += POINTS.pos2
  else if (pos === 3) pts += POINTS.pos3
  else if (pos === 4) pts += POINTS.pos4
  else if (pos <= 5) pts += POINTS.pos5
  else if (pos <= 10) pts += POINTS.top10
  else if (pos <= 15) pts += POINTS.top15
  else if (pos <= 20) pts += POINTS.top20
  else if (pos <= 30) pts += POINTS.top30
  return pts
}

export function playerValue(owgr) {
  if (!owgr) return 5
  if (owgr <= 5) return 20
  if (owgr <= 10) return 18
  if (owgr <= 20) return 15
  if (owgr <= 50) return 12
  if (owgr <= 100) return 9
  if (owgr <= 200) return 6
  return 4
}

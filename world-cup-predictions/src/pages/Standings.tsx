import React from 'react'
import { useData } from '../data/useData'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { fixtureResult } from '../data/resultUtils'
import { formatDateShort, formatKickoffBst } from '../utils/dates'
import { PlayerAvatar, PlayerInitials } from '../components/PlayerAvatar'
import {
  calculateTotals,
  groupFixturesByLondonDate,
  runningTotalsThroughDate,
  scoreRows,
  sortedDateKeys,
  sortedFixtures,
  votersByPick,
  votePercentage,
} from './standingsUtils'

const Standings: React.FC = () => {
  const { players, fixtures, predictions } = useData()
  const totals = calculateTotals(players, fixtures, predictions)
  const byDate = groupFixturesByLondonDate(fixtures)
  const dateKeys = sortedDateKeys(byDate)
  const scores = scoreRows(totals)
  const chartHeight = Math.max(320, scores.length * 34 + 48)

  return (
    <div>

      {players.length > 0 && (
        <div className="top-cards">
          {scores
            .slice(0, 5)
            .map((tp) => (
              <div key={tp.name} className="card">
                <h3 style={{ margin: '4px 0' }}>
                  {tp.name.split(/\s+/)[0]} (<PlayerInitials name={tp.name} />)
                </h3>
                <p style={{ margin: 0, fontWeight: 700 }}>{tp.score} pts</p>
              </div>
            ))}
        </div>
      )}

      {players.length > 0 && (
        <section style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scores} layout="vertical" margin={{ top: 12, right: 36, bottom: 12, left: 24 }}>
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                interval={0}
                width={120}
              />
              <Tooltip />
              <Bar dataKey="score" fill="var(--fifa-blue)">
                <LabelList dataKey="score" position="right" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {dateKeys.length === 0 && <p>No fixtures loaded</p>}
      {dateKeys.map((date) => {
        const dayFixtures = sortedFixtures(byDate[date])
        const runningScores = scoreRows(runningTotalsThroughDate(players, byDate, predictions, date))

        return (
          <div key={date} className="matchday">
            <h4>{formatDateShort(date)}</h4>
            <div className="day-table-wrapper">
              <div className="fixture-cards">
                {dayFixtures.map((f) => {
                  const { H: votersH, X: votersX, A: votersA } = votersByPick(predictions, f.id)
                  const totalVotes = votersH.length + votersX.length + votersA.length

                  const actualResult = fixtureResult(f)
                  const resultClassForPick = (pick: 'H' | 'X' | 'A') => {
                    if (!actualResult) return undefined
                    return pick === actualResult ? 'avatar-correct' : 'avatar-incorrect'
                  }

                  const renderAvatars = (list: string[], pick: 'H' | 'X' | 'A') => {
                    if (!list || list.length === 0) return <div className="avatars-empty">-</div>
                    const sortedList = [...list].sort((a, b) => a.localeCompare(b))
                    return (
                      <div className="avatars-row">
                        {sortedList.map((pl) => (
                          <PlayerAvatar key={pl} name={pl} className={resultClassForPick(pick)} />
                        ))}
                      </div>
                    )
                  }

                  return (
                    <div className="fixture-card" key={f.id}>
                      <div className="fixture-card-header">
                        <div className="match-title">{f.home.name} vs {f.away.name}</div>
                        <div className="kickoff-small">{formatKickoffBst(f.kickoff)}</div>
                      </div>
                      <div className="outcomes">
                        <div className="outcome home">
                          <div className="outcome-label"><span>{f.home.name}</span></div>
                          {renderAvatars(votersH, 'H')}
                        </div>
                        <div className="outcome draw">
                          <div className="outcome-label"><span>Draw</span></div>
                          {renderAvatars(votersX, 'X')}
                        </div>
                        <div className="outcome away">
                          <div className="outcome-label"><span>{f.away.name}</span></div>
                          {renderAvatars(votersA, 'A')}
                        </div>
                      </div>
                      <div className="prediction-bar-wrapper">
                        <div className="prediction-bar">
                          <div className="bar-seg home" style={{ width: `${votePercentage(votersH.length, totalVotes)}%` }} title={`${votePercentage(votersH.length, totalVotes)}%`} />
                          <div className="bar-seg draw" style={{ width: `${votePercentage(votersX.length, totalVotes)}%` }} title={`${votePercentage(votersX.length, totalVotes)}%`} />
                          <div className="bar-seg away" style={{ width: `${votePercentage(votersA.length, totalVotes)}%` }} title={`${votePercentage(votersA.length, totalVotes)}%`} />
                        </div>
                        <div className="prediction-labels">
                          <span>{votePercentage(votersH.length, totalVotes)}%</span>
                          <span>{votePercentage(votersX.length, totalVotes)}%</span>
                          <span>{votePercentage(votersA.length, totalVotes)}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {runningScores.length > 0 && (
                  <div className="day-scoreboard" aria-label={`Player standings after ${formatDateShort(date)}`}>
                    {runningScores.map(({ name, score }) => (
                      <div key={name} className="day-score-player" aria-label={`${name}: ${score} pts`}>
                        <PlayerAvatar name={name} />
                        <div className="day-score-value">{score}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Standings

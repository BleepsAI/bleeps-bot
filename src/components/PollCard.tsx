'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Check } from 'lucide-react'

interface PollOption {
  id: string
  text: string
  voteCount: number
  voters: { userId: string; name: string }[]
}

interface Poll {
  id: string
  question: string
  creatorId: string
  createdAt: string
  closedAt?: string
  options: PollOption[]
  totalVotes: number
}

interface PollCardProps {
  pollId: string
  userId: string
  onVote?: () => void
}

export default function PollCard({ pollId, userId, onVote }: PollCardProps) {
  const [poll, setPoll] = useState<Poll | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState<string | null>(null)

  console.log('[PollCard] Mounted with pollId:', pollId)

  const fetchPoll = async () => {
    console.log('[PollCard] Fetching poll:', pollId)
    try {
      const response = await fetch(`/api/polls?pollId=${pollId}`)
      console.log('[PollCard] Response:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('[PollCard] Poll data:', data)
        setPoll(data.poll)
      }
    } catch (error) {
      console.error('[PollCard] Error fetching poll:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPoll()
  }, [pollId])

  const handleVote = async (optionId: string) => {
    if (voting || poll?.closedAt) return
    setVoting(optionId)

    try {
      const response = await fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, optionId, userId })
      })

      if (response.ok) {
        await fetchPoll()
        onVote?.()
      }
    } catch (error) {
      console.error('Error voting:', error)
    } finally {
      setVoting(null)
    }
  }

  const hasVoted = (optionId: string) => {
    return poll?.options.find(o => o.id === optionId)?.voters.some(v => v.userId === userId)
  }

  const getVotePercentage = (voteCount: number) => {
    if (!poll || poll.totalVotes === 0) return 0
    return Math.round((voteCount / poll.totalVotes) * 100)
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-3" />
        <div className="space-y-2">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!poll) {
    return null
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Poll</span>
      </div>

      <h3 className="font-medium mb-3">{poll.question}</h3>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const voted = hasVoted(option.id)
          const percentage = getVotePercentage(option.voteCount)
          const isVoting = voting === option.id

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={!!poll.closedAt || isVoting}
              className={`w-full text-left relative overflow-hidden rounded-lg border transition-all ${
                voted
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              } ${poll.closedAt ? 'opacity-75' : ''}`}
            >
              {/* Background progress bar */}
              <div
                className={`absolute inset-0 ${voted ? 'bg-primary/20' : 'bg-muted'}`}
                style={{ width: `${percentage}%` }}
              />

              <div className="relative flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {voted && <Check className="h-4 w-4 text-primary" />}
                  <span className={`text-sm ${voted ? 'font-medium' : ''}`}>
                    {option.text}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {percentage}%
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Voters */}
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}
          {poll.options.some(o => o.voters.length > 0) && (
            <span className="ml-1">
              · {poll.options
                .flatMap(o => o.voters)
                .slice(0, 3)
                .map(v => v.name)
                .join(', ')}
              {poll.totalVotes > 3 && ` +${poll.totalVotes - 3} more`}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

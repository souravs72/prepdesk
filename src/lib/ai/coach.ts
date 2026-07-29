import type { Question } from '../../types/question'

export function getHints(q: Question, level: number): string {
  const hints = [
    `What structure fits ${q.topic.replace(/-/g, ' ')}?`,
    q.explanation.pitfalls[0]
      ? `Pitfall: ${q.explanation.pitfalls[0]}`
      : 'Constraints first — optimal or just correct?',
    q.kind === 'coding'
      ? 'Brute force → cut repeated work.'
      : 'Drop near-miss concepts.',
    q.explanation.alternatives[0]
      ? `Alt: ${q.explanation.alternatives[0]}`
      : 'Hand-run a tiny case.',
    'Check complexity + edges.',
  ]
  return hints[Math.min(level, hints.length - 1)]!
}

export function reviewCodeStub(code: string, q: Question): string[] {
  const tips: string[] = []
  if (code.length < 40) tips.push('Incomplete — read input, print answer.')
  if (!/print|console\.log|cout|fmt\.Print|println!/.test(code)) tips.push('No print/output found.')
  if (q.coding && /TODO|pass\s*$/m.test(code)) tips.push('Replace TODOs.')
  if (q.topic === 'binary-search' && !/mid|left|right|lo|hi/.test(code)) tips.push('Track lo/hi/mid.')
  if (q.topic === 'sliding-window' && !/window|left|right|sum/.test(code))
    tips.push('Maintain L/R + running metric.')
  tips.push(`Target: ${q.explanation.timeComplexity ?? q.coding?.timeComplexity ?? 'see problem'}.`)
  return tips
}

export async function aiAssist(prompt: string, q: Question): Promise<string> {
  const key = localStorage.getItem('prepilo-openai-key')
  if (!key) return getHints(q, 2)
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Interview coach. Concise hints only. No full code unless asked.',
          },
          {
            role: 'user',
            content: `Question: ${q.title}\n${q.prompt}\n\nUser: ${prompt}`,
          },
        ],
        temperature: 0.4,
      }),
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? 'No response'
  } catch {
    return getHints(q, 3)
  }
}

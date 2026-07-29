import type { Question } from '../../types/question'

/** Local AI coach — progressive hints without dumping the full answer first. */
export function getHints(q: Question, level: number): string {
  const hints = [
    `Focus on the core pattern for ${q.topic.replace(/-/g, ' ')}. What invariant or data structure fits?`,
    q.explanation.pitfalls[0]
      ? `Watch out: ${q.explanation.pitfalls[0]}`
      : 'Name the constraints and whether you need optimal or just correct.',
    q.kind === 'coding'
      ? 'Sketch brute force first, then find repeated work to eliminate.'
      : 'Eliminate options that confuse related but different concepts.',
    q.explanation.alternatives[0]
      ? `Consider an alternative angle: ${q.explanation.alternatives[0]}`
      : 'Try a tiny example by hand and generalize.',
    'Final nudge: revisit complexity targets and edge cases before locking in.',
  ]
  return hints[Math.min(level, hints.length - 1)]!
}

export function reviewCodeStub(code: string, q: Question): string[] {
  const tips: string[] = []
  if (code.length < 40) tips.push('Solution looks incomplete — ensure you read all input and print the answer.')
  if (!/print|console\.log|cout|fmt\.Print|println!/.test(code))
    tips.push('No obvious output statement detected for this language style.')
  if (q.coding && /TODO|pass\s*$/m.test(code)) tips.push('Replace TODO stubs with a real algorithm.')
  if (q.topic === 'binary-search' && !/mid|left|right|lo|hi/.test(code))
    tips.push('Binary search usually tracks lo/hi and a mid index.')
  if (q.topic === 'sliding-window' && !/window|left|right|sum/.test(code))
    tips.push('Sliding window typically maintains left/right bounds and a running metric.')
  tips.push(`Target complexity: ${q.explanation.timeComplexity ?? q.coding?.timeComplexity ?? 'see problem'}.`)
  tips.push('Related practice: generate another problem in the same topic from Practice.')
  return tips
}

export async function aiAssist(prompt: string, q: Question): Promise<string> {
  // Optional remote model — falls back to local coach
  const key = localStorage.getItem('prepilo-openai-key')
  if (!key) {
    return `Local coach:\n${getHints(q, 2)}\n\n(Add an API key in Settings for richer LLM help.)\n\nYou asked: ${prompt.slice(0, 200)}`
  }
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
            content:
              'You are an interview coach. Give hints and reviews without dumping full final code unless asked. Be concise.',
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

import type { LanguageId } from '../types/question'

const RUNNER = 'http://127.0.0.1:4789'

export interface RunCaseResult {
  id: string
  name: string
  passed: boolean
  expected: string
  actual: string
  stderr: string
  timeMs: number
  hidden?: boolean
}

export async function runCode(opts: {
  language: LanguageId
  code: string
  cases: { id: string; name: string; input: string; expectedOutput: string; hidden?: boolean }[]
}): Promise<{ results: RunCaseResult[]; ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${RUNNER}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    })
    if (!res.ok) {
      const text = await res.text()
      return { results: [], ok: false, message: text || res.statusText }
    }
    return await res.json()
  } catch {
    return {
      results: [],
      ok: false,
      message:
        'Runner offline. Start it with: npm run runner (listens on 127.0.0.1:4789). Python & Node supported locally.',
    }
  }
}

export async function runnerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${RUNNER}/health`)
    return res.ok
  } catch {
    return false
  }
}

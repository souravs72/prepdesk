#!/usr/bin/env node
/**
 * Prepilo local API: code runner + lock session + OpenAI explanations.
 * OpenAI key loaded from ~/.config/daily-work-digest/.env (never sent to the browser).
 */
import cors from 'cors'
import express from 'express'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PORT = 4789
const LEGACY_CONFIG_DIR = path.join(os.homedir(), '.config', 'prepdesk')
const CONFIG_DIR = path.join(os.homedir(), '.config', 'prepilo')
const BYPASS_FILE = path.join(CONFIG_DIR, 'bypass.key')
const LOCK_FILE = path.join(CONFIG_DIR, 'lock-state.json')
const SESSION_FILE = path.join(CONFIG_DIR, 'lock-session.json')
const DIGEST_ENV = path.join(os.homedir(), '.config', 'daily-work-digest', '.env')
const DIGEST_CFG = path.join(os.homedir(), '.config', 'daily-work-digest', 'config.yaml')

const app = express()
app.use(
  cors({
    // Electron (file://), Vite, GTK WebKit, and local tools
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  }),
)
app.use(express.json({ limit: '1mb' }))

const DIST = path.join(ROOT, 'dist')
if (fsSync.existsSync(DIST)) {
  app.use(express.static(DIST, { index: false }))
  // SPA fallback for BrowserRouter routes (e.g. /lock)
  app.get(['/lock', '/practice', '/playground', '/mock', '/analytics', '/coach', '/'], (_req, res) => {
    res.sendFile(path.join(DIST, 'index.html'))
  })
}

function ensureConfigDir() {
  fsSync.mkdirSync(CONFIG_DIR, { recursive: true })
  // One-time migrate from PrepDesk config if present
  if (fsSync.existsSync(LEGACY_CONFIG_DIR)) {
    for (const name of ['bypass.key', 'analytics.json', 'retest.json', 'keybinds-backup.json']) {
      const from = path.join(LEGACY_CONFIG_DIR, name)
      const to = path.join(CONFIG_DIR, name)
      if (fsSync.existsSync(from) && !fsSync.existsSync(to)) {
        try {
          fsSync.copyFileSync(from, to)
        } catch {
          /* ignore */
        }
      }
    }
  }
}

function loadDotEnv(filePath) {
  const out = {}
  if (!fsSync.existsSync(filePath)) return out
  const text = fsSync.readFileSync(filePath, 'utf8')
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

function loadOpenAIConfig() {
  const env = { ...loadDotEnv(DIGEST_ENV), ...process.env }
  let model = 'gpt-4.1-mini'
  try {
    const yaml = fsSync.readFileSync(DIGEST_CFG, 'utf8')
    const m = yaml.match(/openai:\s*\n\s*model:\s*([^\s#]+)/)
    if (m) model = m[1].trim().replace(/['"]/g, '')
  } catch {
    /* ignore */
  }
  return { apiKey: env.OPENAI_API_KEY || '', model }
}

function makeBypassKey() {
  // Two UUIDs joined with '-' ≈ 73 characters
  return `${randomUUID()}-${randomUUID()}`
}

function ensureBypassKey() {
  ensureConfigDir()
  const existing = fsSync.existsSync(BYPASS_FILE)
    ? fsSync.readFileSync(BYPASS_FILE, 'utf8').trim()
    : ''
  // Keep a single 2-UUID key (~73 chars). Regenerate if missing or wrong shape.
  if (!existing || existing.length < 70 || existing.length > 80) {
    const key = makeBypassKey()
    fsSync.writeFileSync(BYPASS_FILE, key + '\n', { mode: 0o600 })
    return key
  }
  return existing
}

function readLockState() {
  ensureConfigDir()
  if (!fsSync.existsSync(LOCK_FILE)) {
    return { unlocked: false, reason: null, at: null }
  }
  try {
    return JSON.parse(fsSync.readFileSync(LOCK_FILE, 'utf8'))
  } catch {
    return { unlocked: false, reason: null, at: null }
  }
}

function writeLockState(state) {
  ensureConfigDir()
  fsSync.writeFileSync(LOCK_FILE, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 })
}

function readSession() {
  try {
    if (!fsSync.existsSync(SESSION_FILE)) return null
    return JSON.parse(fsSync.readFileSync(SESSION_FILE, 'utf8'))
  } catch {
    return null
  }
}

function writeSession(session) {
  ensureConfigDir()
  fsSync.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2) + '\n', { mode: 0o600 })
}

function requireLockToken(req) {
  const token =
    req.headers['x-prepilo-token'] ||
    req.headers['x-prepdesk-token'] ||
    req.body?.token ||
    req.query?.token
  const session = readSession()
  if (!session?.token || !token || token !== session.token) return false
  return true
}


function normalizeOut(s) {
  return String(s ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
}

function exec(command, args, cwd, timeoutMs, input = '') {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`Timeout after ${timeoutMs}ms`))
    }, timeoutMs)
    child.stdout.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ stdout, stderr, code: code ?? 1 })
    })
    if (input) child.stdin.write(input)
    child.stdin.end()
  })
}

async function runOnce(language, code, input, timeoutMs = 4000) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prepilo-'))
  const started = Date.now()
  try {
    let command
    let args = []
    let file
    if (language === 'python') {
      file = path.join(dir, 'main.py')
      await fs.writeFile(file, code)
      command = 'python3'
      args = [file]
    } else if (language === 'javascript') {
      file = path.join(dir, 'main.js')
      await fs.writeFile(file, code)
      command = 'node'
      args = [file]
    } else if (language === 'java') {
      file = path.join(dir, 'Main.java')
      await fs.writeFile(file, code)
      await exec('javac', [file], dir, timeoutMs)
      command = 'java'
      args = ['-cp', dir, 'Main']
    } else if (language === 'cpp') {
      file = path.join(dir, 'main.cpp')
      const bin = path.join(dir, 'a.out')
      await fs.writeFile(file, code)
      await exec('g++', ['-O2', '-std=c++17', file, '-o', bin], dir, timeoutMs)
      command = bin
    } else if (language === 'go') {
      file = path.join(dir, 'main.go')
      await fs.writeFile(file, code)
      command = 'go'
      args = ['run', file]
    } else if (language === 'rust') {
      file = path.join(dir, 'main.rs')
      const bin = path.join(dir, 'main')
      await fs.writeFile(file, code)
      await exec('rustc', ['-O', file, '-o', bin], dir, timeoutMs)
      command = bin
    } else {
      return { stdout: '', stderr: `Unsupported language: ${language}`, timeMs: 0, code: 1 }
    }
    const result = await exec(command, args, dir, timeoutMs, input)
    return { ...result, timeMs: Date.now() - started }
  } catch (e) {
    return {
      stdout: '',
      stderr: e instanceof Error ? e.message : String(e),
      timeMs: Date.now() - started,
      code: 1,
    }
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

app.get('/health', (_req, res) => {
  const { apiKey, model } = loadOpenAIConfig()
  res.json({
    ok: true,
    languages: ['python', 'javascript', 'java', 'cpp', 'go', 'rust'],
    openaiConfigured: Boolean(apiKey),
    openaiModel: model,
    bypassConfigured: fsSync.existsSync(BYPASS_FILE),
  })
})

app.get('/lock/status', (_req, res) => {
  res.json(readLockState())
})

app.post('/lock/arm', (req, res) => {
  const token = randomUUID() + randomUUID()
  writeSession({ token, armedAt: new Date().toISOString(), source: req.body?.source || 'unknown' })
  writeLockState({ unlocked: false, reason: null, at: null })
  res.json({ ok: true, unlocked: false, token })
})

app.post('/lock/unlock', (req, res) => {
  if (!requireLockToken(req)) {
    return res.status(401).json({ ok: false, error: 'Invalid or missing lock session token' })
  }
  const { reason = 'solved' } = req.body ?? {}
  writeLockState({
    unlocked: true,
    reason,
    at: new Date().toISOString(),
  })
  res.json({ ok: true, unlocked: true, reason })
})

app.post('/lock/bypass', (req, res) => {
  const typed = String(req.body?.key ?? '').trim()
  const expected = ensureBypassKey()
  if (!typed || typed !== expected) {
    return res.status(401).json({ ok: false, error: 'Invalid bypass key' })
  }
  writeLockState({
    unlocked: true,
    reason: 'bypass',
    at: new Date().toISOString(),
  })
  res.json({ ok: true, unlocked: true, reason: 'bypass' })
})

app.get('/lock/bypass-meta', (_req, res) => {
  const key = ensureBypassKey()
  res.json({
    length: key.length,
    path: BYPASS_FILE,
    hint: 'Type the full key from ~/.config/prepilo/bypass.key — paste is disabled in the lock UI.',
  })
})


app.post('/run', async (req, res) => {
  const { language, code, cases } = req.body ?? {}
  if (!language || typeof code !== 'string' || !Array.isArray(cases)) {
    return res.status(400).send('Expected { language, code, cases[] }')
  }
  const results = []
  for (const c of cases) {
    const out = await runOnce(language, code, c.input ?? '')
    const actual = normalizeOut(out.stdout)
    const expected = normalizeOut(c.expectedOutput ?? '')
    results.push({
      id: c.id ?? randomUUID(),
      name: c.name ?? 'case',
      passed: out.code === 0 && actual === expected,
      expected,
      actual: out.code === 0 ? actual : '',
      stderr: out.stderr,
      timeMs: out.timeMs,
      hidden: !!c.hidden,
    })
  }
  res.json({ results, ok: results.every((r) => r.passed) })
})

app.post('/explain', async (req, res) => {
  const { question, correct, userAnswer, selectedOptionText } = req.body ?? {}
  if (!question) return res.status(400).json({ error: 'question required' })

  const { apiKey, model } = loadOpenAIConfig()
  const localSections = []
  const ex = question.explanation || {}
  if (correct) {
    localSections.push(`## Why your answer is correct\n${ex.whyCorrect || ''}`)
  } else {
    localSections.push(`## Why your answer is incorrect\n${ex.whyIncorrect || 'It does not match the expected answer.'}`)
    localSections.push(`## Correct reasoning\n${ex.whyCorrect || ''}`)
    if (question.kind === 'mcq' && question.options) {
      for (const o of question.options) {
        if (o.correct) localSections.push(`## Correct option\n${o.text}`)
        else if (o.whyWrong) localSections.push(`## Why “${o.text}” is wrong\n${o.whyWrong}`)
      }
    }
    if (question.acceptedAnswers?.length) {
      localSections.push(`## Accepted answer(s)\n${question.acceptedAnswers.join(', ')}`)
    }
  }
  if (ex.timeComplexity) localSections.push(`## Time complexity\n${ex.timeComplexity}`)
  if (ex.spaceComplexity) localSections.push(`## Space complexity\n${ex.spaceComplexity}`)
  if (ex.pitfalls?.length) localSections.push(`## Common interview pitfalls\n- ${ex.pitfalls.join('\n- ')}`)
  if (ex.alternatives?.length) localSections.push(`## Alternative approaches\n- ${ex.alternatives.join('\n- ')}`)
  if (ex.followUps?.length) localSections.push(`## Follow-up questions interviewers ask\n- ${ex.followUps.join('\n- ')}`)
  if (question.coding) {
    localSections.push(`## Brute force\n${question.coding.bruteForce}`)
    localSections.push(`## Optimized solution idea\n${question.coding.optimized}`)
    localSections.push(`## Complexity comparison\n${question.coding.complexityComparison}`)
  }

  const localMarkdown = localSections.filter(Boolean).join('\n\n')

  if (!apiKey) {
    return res.json({
      source: 'local',
      markdown: localMarkdown,
      note: 'OPENAI_API_KEY not found in daily-work-digest .env — showing local explanation.',
    })
  }

  try {
    const prompt = {
      model,
      temperature: 0.35,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert interview coach. Write a clear, informative explanation for a software engineer. Use markdown with short sections. Be accurate. Do not invent APIs. Expand on the provided facts; teach intuition.',
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              title: question.title,
              prompt: question.prompt,
              kind: question.kind,
              topic: question.topic,
              domain: question.domain,
              difficulty: question.difficulty,
              userWasCorrect: correct,
              userAnswer,
              selectedOptionText,
              acceptedAnswers: question.acceptedAnswers,
              options: question.options,
              baseFacts: localMarkdown,
              ask: 'Write a thorough explanation: verdict, why right/wrong, intuition, complexity, pitfalls, alternatives, and 2-3 follow-ups.',
            },
            null,
            2,
          ),
        },
      ],
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(prompt),
    })
    if (!r.ok) {
      const errText = await r.text()
      return res.json({
        source: 'local-fallback',
        markdown: localMarkdown,
        note: `OpenAI error (${r.status}): using local explanation.`,
        detail: errText.slice(0, 200),
      })
    }
    const data = await r.json()
    const markdown = data.choices?.[0]?.message?.content || localMarkdown
    return res.json({ source: 'openai', model, markdown })
  } catch (e) {
    return res.json({
      source: 'local-fallback',
      markdown: localMarkdown,
      note: e instanceof Error ? e.message : String(e),
    })
  }
})

const ANALYTICS_FILE = path.join(CONFIG_DIR, 'analytics.json')
const RETEST_FILE = path.join(CONFIG_DIR, 'retest.json')
const RETEST_HOURS = 4.5

function readJson(file, fallback) {
  try {
    if (!fsSync.existsSync(file)) return fallback
    return JSON.parse(fsSync.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, data) {
  ensureConfigDir()
  fsSync.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 })
}

app.get('/analytics', (_req, res) => {
  res.json(readJson(ANALYTICS_FILE, { attempts: [], byTopic: {}, byDifficulty: {}, byKind: {} }))
})

app.post('/analytics/attempt', (req, res) => {
  const attempt = req.body ?? {}
  const store = readJson(ANALYTICS_FILE, {
    attempts: [],
    byTopic: {},
    byDifficulty: {},
    byKind: {},
  })
  store.attempts = [...(store.attempts || []), attempt].slice(-5000)
  const bump = (map, key, ok) => {
    map[key] ??= { n: 0, ok: 0 }
    map[key].n++
    if (ok) map[key].ok++
  }
  bump(store.byTopic, attempt.topic || 'unknown', !!attempt.correct)
  bump(store.byDifficulty, attempt.difficulty || 'unknown', !!attempt.correct)
  bump(store.byKind, attempt.kind || 'unknown', !!attempt.correct)
  store.updatedAt = new Date().toISOString()
  writeJson(ANALYTICS_FILE, store)

  // Rolling accuracy for retest scheduling (last 10)
  const recent = store.attempts.slice(-10)
  const acc = recent.length
    ? recent.filter((a) => a.correct).length / recent.length
    : 1
  if (recent.length >= 5 && acc < 0.8) {
    const existing = readJson(RETEST_FILE, {})
    if (!existing.dueAt || existing.fired) {
      const dueAt = Date.now() + RETEST_HOURS * 3600 * 1000
      writeJson(RETEST_FILE, {
        dueAt,
        dueAtIso: new Date(dueAt).toISOString(),
        accuracy: Math.round(acc * 100),
        reason: 'Rolling accuracy below 80%',
        fired: false,
      })
    }
  } else if (recent.length >= 5 && acc >= 0.8) {
    const existing = readJson(RETEST_FILE, {})
    if (existing.dueAt && !existing.fired) {
      writeJson(RETEST_FILE, {
        dueAt: null,
        clearedAt: new Date().toISOString(),
        accuracy: Math.round(acc * 100),
        reason: 'Accuracy recovered above 80%',
        fired: true,
      })
    }
  }
  res.json({ ok: true, rollingAccuracy: Math.round(acc * 100) })
})

app.get('/retest', (_req, res) => {
  res.json(readJson(RETEST_FILE, { dueAt: null }))
})

app.post('/retest/clear', (_req, res) => {
  writeJson(RETEST_FILE, { dueAt: null, fired: true, clearedAt: new Date().toISOString() })
  res.json({ ok: true })
})

/** Progressive hints only — never the final answer or full code. */
app.post('/hint-chat', async (req, res) => {
  const { question, messages = [], userMessage } = req.body ?? {}
  if (!question || !userMessage) return res.status(400).json({ error: 'question and userMessage required' })

  const { apiKey, model } = loadOpenAIConfig()
  const level = Math.min((messages.filter((m) => m.role === 'assistant').length || 0) + 1, 5)
  const localHints = [
    `Think about the core pattern for ${question.topic}. What data structure or invariant fits?`,
    `Constraints matter: what would be too slow? Name a target complexity before coding.`,
    `Try a tiny example by hand. What must remain true after each step?`,
    `Which edge cases break a naive approach? Empty input, duplicates, already-sorted…`,
    `Compare brute force vs one optimization idea at a high level — still no full solution.`,
  ]

  if (!apiKey) {
    return res.json({
      source: 'local',
      reply: localHints[level - 1],
      level,
    })
  }

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: `You are a Socratic interview coach. Give SHORT hints (2-5 sentences) that steer thinking.
STRICT RULES:
- Do NOT reveal the final answer, exact option letter, or full solution code.
- Do NOT write complete algorithms or pasteable solutions.
- You MAY name patterns (two pointers, hash map, BFS), complexities, and questions to ask yourself.
- If the user demands the answer, refuse and offer a narrower hint instead.
- Hint strength level ${level}/5 (1=gentle, 5=quite pointed but still not the answer).
Topic: ${question.topic}. Difficulty: ${question.difficulty}. Kind: ${question.kind}.`,
          },
          {
            role: 'user',
            content: `Problem title: ${question.title}\nProblem: ${question.prompt}\n`,
          },
          ...messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage },
        ],
      }),
    })
    if (!r.ok) {
      return res.json({ source: 'local-fallback', reply: localHints[level - 1], level })
    }
    const data = await r.json()
    const reply = data.choices?.[0]?.message?.content || localHints[level - 1]
    return res.json({ source: 'openai', model, reply, level })
  } catch {
    return res.json({ source: 'local-fallback', reply: localHints[level - 1], level })
  }
})

ensureBypassKey()
// Do not reset lock state on API restart — avoids re-locking after unlock mid-session.

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Prepilo API on http://127.0.0.1:${PORT}`)
  console.log(`Bypass key file: ${BYPASS_FILE}`)
  const { apiKey, model } = loadOpenAIConfig()
  console.log(`OpenAI: ${apiKey ? 'configured' : 'missing'} (model ${model})`)
})

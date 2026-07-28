export type Difficulty = 'easy' | 'medium' | 'hard'
export type QuestionKind = 'mcq' | 'objective' | 'coding'
export type Domain =
  | 'dsa'
  | 'system-design'
  | 'os'
  | 'dbms'
  | 'oop'
  | 'networking'
  | 'sql'

export type Topic =
  | 'arrays'
  | 'strings'
  | 'hashing'
  | 'linked-lists'
  | 'stacks'
  | 'queues'
  | 'trees'
  | 'bst'
  | 'heaps'
  | 'graphs'
  | 'dp'
  | 'greedy'
  | 'backtracking'
  | 'recursion'
  | 'binary-search'
  | 'sliding-window'
  | 'two-pointers'
  | 'bit-manipulation'
  | 'tries'
  | 'segment-trees'
  | 'system-design'
  | 'sql'
  | 'os'
  | 'dbms'
  | 'oop'
  | 'networking'

export type CompanyTag =
  | 'Google'
  | 'Meta'
  | 'Amazon'
  | 'Apple'
  | 'Microsoft'
  | 'Uber'
  | 'Netflix'
  | 'Flipkart'
  | 'General'

export type LanguageId = 'python' | 'javascript' | 'java' | 'cpp' | 'go' | 'rust'

export interface McqOption {
  id: string
  text: string
  correct: boolean
  whyWrong?: string
}

export interface TestCase {
  id: string
  name: string
  input: string
  expectedOutput: string
  hidden?: boolean
  isEdge?: boolean
  isStress?: boolean
}

export interface CodingPayload {
  statement: string
  constraints: string[]
  inputFormat: string
  outputFormat: string
  samples: TestCase[]
  hidden: TestCase[]
  starterCode: Partial<Record<LanguageId, string>>
  bruteForce: string
  optimized: string
  timeComplexity: string
  spaceComplexity: string
  complexityComparison: string
}

export interface Explanation {
  whyCorrect: string
  whyIncorrect?: string
  timeComplexity?: string
  spaceComplexity?: string
  pitfalls: string[]
  alternatives: string[]
  followUps: string[]
}

export interface Question {
  id: string
  title: string
  kind: QuestionKind
  domain: Domain
  topic: Topic
  difficulty: Difficulty
  company: CompanyTag
  interviewFrequency: 'low' | 'medium' | 'high'
  estimatedMinutes: number
  prompt: string
  options?: McqOption[]
  /** Normalized accepted answers for objective questions */
  acceptedAnswers?: string[]
  coding?: CodingPayload
  explanation: Explanation
  tags: string[]
  createdForDate: string
}

export interface AttemptResult {
  questionId: string
  correct: boolean
  kind: QuestionKind
  topic: Topic
  domain: Domain
  difficulty: Difficulty
  timeSpentMs: number
  at: string
  userAnswer?: string
  language?: LanguageId
}

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function safeUrl(url: string): string {
  try {
    const u = new URL(url, 'http://127.0.0.1')
    if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:') return url
  } catch {
    /* ignore */
  }
  return ''
}

export function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="md-body text-sm leading-relaxed text-[var(--color-muted)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={safeUrl}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

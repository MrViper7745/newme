import { useState, useRef } from 'react'
import MobileLayout from '../../components/mobile/MobileLayout'
import useHaptic from '../../hooks/useHaptic'

const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C', 'C++', 'SQL']

const TEMPLATES = {
  Python: `# Python starter\ndef solve():\n    # Write your solution here\n    pass\n\nsolve()`,
  JavaScript: `// JavaScript starter\nfunction solve() {\n  // Write your solution here\n}\n\nsolve();`,
  Java: `// Java starter\npublic class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}`,
  C: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
  'C++': `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
  SQL: `-- SQL starter\nSELECT *\nFROM table_name\nWHERE condition;`,
}

export default function MobileCodeEditor() {
  const haptic = useHaptic()
  const [lang, setLang] = useState('Python')
  const [code, setCode] = useState(TEMPLATES.Python)
  const [output, setOutput] = useState(null)
  const [running, setRunning] = useState(false)
  const [question, setQuestion] = useState('')
  const [aiHelp, setAiHelp] = useState(null)
  const [loadingHelp, setLoadingHelp] = useState(false)
  const textareaRef = useRef(null)

  const changeLang = (l) => {
    setLang(l)
    setCode(TEMPLATES[l] || '')
    setOutput(null)
  }

  const runCode = async () => {
    setRunning(true)
    setOutput(null)
    haptic.tap()
    try {
      // Use AI to simulate code execution for educational purposes
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Execute this ${lang} code and show what the output would be. If there are errors, show them. If it runs successfully, show the output. Then briefly explain what the code does in 1-2 sentences.\n\nCode:\n\`\`\`${lang.toLowerCase()}\n${code}\n\`\`\``
          }]
        })
      })
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      let buffer = '', full = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim(); if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim(); if (d === '[DONE]') break
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setOutput(full) } } catch {}
        }
      }
    } catch (err) { setOutput('Error: ' + err.message) }
    setRunning(false)
  }

  const askForHelp = async () => {
    if (!question.trim()) return
    setLoadingHelp(true)
    setAiHelp(null)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `I am writing ${lang} code and have a question: "${question}"\n\nMy current code:\n\`\`\`${lang.toLowerCase()}\n${code}\n\`\`\`\n\nPlease help me understand and improve my code. Show corrected code if needed.`
          }]
        })
      })
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      let buffer = '', full = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop()
        for (const line of lines) {
          const t = line.trim(); if (!t.startsWith('data:')) continue
          const d = t.slice(5).trim(); if (d === '[DONE]') break
          try { const p = JSON.parse(d); if (p.text) { full += p.text; setAiHelp(full) } } catch {}
        }
      }
    } catch {}
    setLoadingHelp(false)
    setQuestion('')
  }

  const insertSnippet = (text) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    setCode(prev => prev.slice(0, start) + text + prev.slice(end))
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + text.length; ta.focus() }, 0)
  }

  const SNIPPETS = ['print()', 'for i in range():', 'def ():', 'if __name__ == "__main__":']

  return (
    <MobileLayout title="💻 Code Editor">
      <div style={{ padding: '12px 16px' }}>

        {/* Language selector */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
          {LANGUAGES.map(l => (
            <button key={l} onClick={() => changeLang(l)}
              style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: lang === l ? 'rgba(37,99,235,0.15)' : 'var(--surface)', color: lang === l ? '#60a5fa' : 'var(--text3)', border: `1px solid ${lang === l ? 'rgba(37,99,235,0.3)' : 'var(--border)'}` }}>
              {l}
            </button>
          ))}
        </div>

        {/* Code area */}
        <div style={{ background: '#0d0d1a', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>● {lang}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setCode(TEMPLATES[lang] || '')} style={{ fontSize: 10, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Reset</button>
              <button onClick={() => navigator.clipboard.writeText(code)} style={{ fontSize: 10, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Copy</button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            style={{ width: '100%', minHeight: 200, padding: '14px', fontSize: 13, fontFamily: 'JetBrains Mono, Fira Code, monospace', background: 'transparent', border: 'none', color: '#e2e8f0', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        {/* Quick snippets for Python */}
        {lang === 'Python' && (
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
            {SNIPPETS.map((s, i) => (
              <button key={i} onClick={() => insertSnippet(s)}
                style={{ padding: '4px 10px', borderRadius: 8, fontSize: 10, fontFamily: 'monospace', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', color: '#60a5fa' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Run button */}
        <button onClick={runCode} disabled={running || !code.trim()}
          style={{ width: '100%', padding: '13px', borderRadius: 12, background: running ? 'var(--surface2)' : 'linear-gradient(135deg,#10b981,#059669)', color: running ? 'var(--text3)' : '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {running ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Running...</> : '▶ Run Code'}
        </button>

        {/* Output */}
        {output && (
          <div style={{ background: '#0d0d1a', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '14px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Output</div>
            <pre style={{ fontSize: 12, color: '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>{output}</pre>
          </div>
        )}

        {/* Ask for help */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>🤖 Ask EduBot for Help</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && askForHelp()} placeholder="Why is my code not working?" style={{ flex: 1, padding: '9px 12px', borderRadius: 9, fontSize: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }} />
            <button onClick={askForHelp} disabled={!question.trim() || loadingHelp}
              style={{ width: 38, height: 38, borderRadius: '50%', background: question.trim() ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'var(--surface2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ↑
            </button>
          </div>
          {loadingHelp && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>EduBot is analysing your code...</div>}
          {aiHelp && (
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', borderTop: '1px solid var(--border)', paddingTop: 12 }}>{aiHelp}</div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </MobileLayout>
  )
}
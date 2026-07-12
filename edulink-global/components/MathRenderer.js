import { useEffect, useRef } from 'react'

export default function MathRenderer({ content, style, className }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !content) return
    try {
      if (typeof window !== 'undefined' && window.katex) {
        ref.current.querySelectorAll('.katex-render').forEach(el => {
          try {
            window.katex.render(el.dataset.expr, el, {
              displayMode: el.dataset.mode === 'display',
              throwOnError: false,
            })
          } catch {}
        })
      }
    } catch {}
  }, [content])

  return (
    <div
      ref={ref}
      style={style}
      className={className}
      dangerouslySetInnerHTML={{ __html: formatMath(content || '') }}
    />
  )
}

function formatMath(text) {
  if (!text) return ''
  let html = text

  // Display math blocks $$ ... $$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, expr) => {
    const rendered = renderExpr(expr.trim(), true)
    return `<div style="background:rgba(37,99,235,0.08);border:1px solid rgba(37,99,235,0.2);border-left:3px solid #2563eb;border-radius:8px;padding:14px 18px;margin:10px 0;overflow-x:auto;font-family:'Courier New',monospace;font-size:14px;color:#e2e8f0;text-align:center">${rendered}</div>`
  })

  // Inline math $ ... $
  html = html.replace(/\$([^$\n]+?)\$/g, (_, expr) => {
    const rendered = renderExpr(expr.trim(), false)
    return `<span style="background:rgba(124,58,237,0.1);border-radius:4px;padding:1px 5px;font-family:'Courier New',monospace;font-size:0.95em;color:#a78bfa">${rendered}</span>`
  })

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f1f5f9;font-weight:700">$1</strong>')

  // Italic
  html = html.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-size:12px;font-family:\'Courier New\',monospace;color:#10b981">$1</code>')

  // Code blocks
  html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:14px;margin:8px 0;overflow-x:auto;font-size:12px;font-family:'Courier New',monospace;color:#10b981;line-height:1.6">${escapeHtml(code.trim())}</pre>`
  )

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<div style="font-weight:800;color:#f59e0b;font-size:13px;margin:12px 0 5px">$1</div>')
  html = html.replace(/^### (.+)$/gm, '<div style="font-weight:800;color:#a78bfa;font-size:14px;margin:14px 0 6px">$1</div>')
  html = html.replace(/^## (.+)$/gm, '<div style="font-weight:800;color:#60a5fa;font-size:15px;margin:16px 0 8px;border-bottom:1px solid rgba(96,165,250,0.2);padding-bottom:4px">$1</div>')
  html = html.replace(/^# (.+)$/gm, '<div style="font-weight:900;color:#f1f5f9;font-size:18px;margin:18px 0 10px">$1</div>')

  // Step labels
  html = html.replace(/^\*\*(Step \d+[:.：].*?)\*\*/gm, '<div style="color:#60a5fa;font-weight:800;font-size:13px;margin:10px 0 4px">$1</div>')

  // Answer line
  html = html.replace(/\*\*(Answer[:.：].*?)\*\*/g, '<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:10px 14px;margin:10px 0;color:#10b981;font-weight:800;font-size:14px">✅ $1</div>')

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:14px 0"/>')

  // Tables
  html = html.replace(/(\|.+\|\n?)+/g, (tableMatch) => {
    const rows = tableMatch.trim().split('\n').filter(r => r.trim() && !r.match(/^\|[-: |]+\|$/))
    if (rows.length < 1) return tableMatch
    const headerCells = rows[0].split('|').filter((_, i, a) => i > 0 && i < a.length - 1).map(c => c.trim())
    const bodyRows = rows.slice(1)
    return `<div style="overflow-x:auto;margin:10px 0"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${headerCells.map(c => `<th style="padding:8px 12px;background:rgba(37,99,235,0.15);border:1px solid rgba(255,255,255,0.1);color:#60a5fa;text-align:left;font-weight:700">${c}</th>`).join('')}</tr></thead><tbody>${bodyRows.map((row, ri) => {
      const cells = row.split('|').filter((_, i, a) => i > 0 && i < a.length - 1).map(c => c.trim())
      return `<tr style="background:${ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}">${cells.map(c => `<td style="padding:7px 12px;border:1px solid rgba(255,255,255,0.06);color:#e2e8f0">${c}</td>`).join('')}</tr>`
    }).join('')}</tbody></table></div>`
  })

  // Bullet lists
  html = html.replace(/^[•\-\*] (.+)$/gm, '<div style="display:flex;gap:8px;padding:2px 0;padding-left:4px"><span style="color:#60a5fa;flex-shrink:0;margin-top:1px">•</span><span>$1</span></div>')

  // Numbered lists
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:8px;padding:2px 0;padding-left:4px"><span style="color:#60a5fa;font-weight:700;flex-shrink:0;min-width:18px">$1.</span><span>$2</span></div>')

  // Line breaks
  html = html.replace(/\n\n/g, '<div style="height:8px"></div>')
  html = html.replace(/\n/g, '<br/>')

  return html
}

function renderExpr(expr, display) {
  let r = expr

  // Fractions
  r = r.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, num, den) =>
    `<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 3px;line-height:1.2"><span style="border-bottom:1.5px solid currentColor;padding:0 4px;font-size:0.85em">${renderExpr(num, false)}</span><span style="padding:0 4px;font-size:0.85em">${renderExpr(den, false)}</span></span>`
  )

  // Square root
  r = r.replace(/\\sqrt\{([^}]+)\}/g, (_, inner) =>
    `<span style="display:inline-flex;align-items:center;gap:1px">√<span style="border-top:1.5px solid currentColor;padding:0 3px">${renderExpr(inner, false)}</span></span>`
  )
  r = r.replace(/\\sqrt([^{])/g, '√$1')

  // Powers x^{n} and x^n
  r = r.replace(/\^\{([^}]+)\}/g, '<sup style="font-size:0.75em;line-height:0;position:relative;top:-0.5em">$1</sup>')
  r = r.replace(/\^(-?\d+)/g, '<sup style="font-size:0.75em;line-height:0;position:relative;top:-0.5em">$1</sup>')

  // Subscripts
  r = r.replace(/_\{([^}]+)\}/g, '<sub style="font-size:0.75em;line-height:0;position:relative;bottom:-0.3em">$1</sub>')
  r = r.replace(/_([a-zA-Z0-9])/g, '<sub style="font-size:0.75em;line-height:0;position:relative;bottom:-0.3em">$1</sub>')

  // Greek letters
  const greek = {
    '\\alpha':'α','\\beta':'β','\\gamma':'γ','\\delta':'δ','\\Delta':'Δ',
    '\\epsilon':'ε','\\zeta':'ζ','\\eta':'η','\\theta':'θ','\\Theta':'Θ',
    '\\iota':'ι','\\kappa':'κ','\\lambda':'λ','\\Lambda':'Λ','\\mu':'μ',
    '\\nu':'ν','\\xi':'ξ','\\pi':'π','\\Pi':'Π','\\rho':'ρ','\\sigma':'σ',
    '\\Sigma':'Σ','\\tau':'τ','\\phi':'φ','\\Phi':'Φ','\\chi':'χ',
    '\\psi':'ψ','\\Psi':'Ψ','\\omega':'ω','\\Omega':'Ω',
  }
  Object.entries(greek).forEach(([k, v]) => { r = r.split(k).join(v) })

  // Operators
  const ops = {
    '\\times':'×','\\div':'÷','\\pm':'±','\\mp':'∓',
    '\\leq':'≤','\\geq':'≥','\\neq':'≠','\\approx':'≈',
    '\\equiv':'≡','\\cong':'≅','\\sim':'∼',
    '\\infty':'∞','\\partial':'∂','\\nabla':'∇',
    '\\sum':'Σ','\\prod':'Π','\\int':'∫','\\oint':'∮',
    '\\rightarrow':'→','\\leftarrow':'←','\\Rightarrow':'⇒',
    '\\Leftarrow':'⇐','\\leftrightarrow':'↔','\\Leftrightarrow':'⟺',
    '\\cdot':'·','\\cdots':'⋯','\\ldots':'…',
    '\\forall':'∀','\\exists':'∃','\\in':'∈','\\notin':'∉',
    '\\subset':'⊂','\\supset':'⊃','\\cup':'∪','\\cap':'∩',
    '\\degree':'°','\\circ':'∘',
    '\\sin':'sin','\\cos':'cos','\\tan':'tan',
    '\\log':'log','\\ln':'ln','\\lim':'lim',
    '\\max':'max','\\min':'min',
  }
  Object.entries(ops).forEach(([k, v]) => { r = r.split(k).join(v) })

  // Remove leftover backslashes
  r = r.replace(/\\([a-zA-Z]+)/g, '$1')

  // Remove grouping braces
  r = r.replace(/\{([^{}]*)\}/g, '$1')

  return r
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
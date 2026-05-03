import { Node, mergeAttributes } from '@tiptap/core'

// ââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
interface ProjectVariable {
  tag: string
  value: string
  variable_type?: string  // 'text' | 'rich_text'
}

// Global map: tag â { value, type }
declare global {
  interface Window {
    __projectVariables: Record<string, { value: string; type: string }>
  }
}

// ââ VariableNode âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Inline atom for text variables.
// Rich-text variables are rendered as a block wrapper (see addNodeView).
export const VariableNode = Node.create({
  name: 'variableNode',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      tag: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const tag = node.attrs.tag
    const entry = typeof window !== 'undefined' ? window.__projectVariables?.[tag] : null
    const isRich = entry?.type === 'rich_text'
    const value = entry?.value || null
    const display = isRich ? `[${tag}]` : (value || tag)
    const isEmpty = !value
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-variable': tag,
      class: isEmpty ? 'variable-chip variable-chip--empty' : (isRich ? 'variable-chip variable-chip--rich' : 'variable-chip'),
      contenteditable: 'false',
      title: tag,
    }), display]
  },

  addNodeView() {
    return ({ node }) => {
      const tag = node.attrs.tag
      const outer = document.createElement('span')
      outer.setAttribute('contenteditable', 'false')

      const render = () => {
        const entry = typeof window !== 'undefined' ? window.__projectVariables?.[tag] : null
        const isRich = entry?.type === 'rich_text'
        const value = (entry && typeof entry === 'object') ? (entry.value || null) : null
        const isEmpty = !value
        outer.innerHTML = ''
        if (isRich && value) {
          const block = document.createElement('div')
          block.setAttribute('data-variable', tag)
          block.setAttribute('contenteditable', 'false')
          block.className = 'variable-block'
          const label = document.createElement('div')
          label.className = 'variable-block__label'
          label.textContent = tag
          block.appendChild(label)
          const content = document.createElement('div')
          content.className = 'variable-block__content'
          content.innerHTML = richJsonToHtml(tryParseJson(value))
          block.appendChild(content)
          outer.appendChild(block)
        } else {
          const chip = document.createElement('span')
          chip.setAttribute('data-variable', tag)
          chip.setAttribute('contenteditable', 'false')
          chip.className = isEmpty ? 'variable-chip variable-chip--empty' : (isRich ? 'variable-chip variable-chip--rich' : 'variable-chip')
          chip.textContent = (value && typeof value === 'string') ? value : tag
          outer.appendChild(chip)
        }
      }

      render()

      const interval = setInterval(() => {
        if (typeof window !== 'undefined' && window.__projectVariables?.[tag]) {
          render()
          clearInterval(interval)
        }
      }, 200)
      setTimeout(() => clearInterval(interval), 10000)

      return { dom: outer }
    }
  },
})

// ââ Styles âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export const VARIABLE_STYLES = `
  .variable-chip {
    display: inline;
    background: rgba(78,140,140,0.12);
    color: #2e5f5f;
    border: 0.5px solid rgba(78,140,140,0.3);
    border-radius: 3px;
    padding: 0 4px;
    font-size: 0.95em;
    cursor: default;
    user-select: none;
    white-space: nowrap;
  }
  .variable-chip--empty {
    background: rgba(200,169,110,0.12);
    color: #8a6020;
    border-color: rgba(200,169,110,0.4);
    font-style: italic;
  }
  .variable-chip--rich {
    background: rgba(78,140,140,0.08);
    color: #2e5f5f;
    border-color: rgba(78,140,140,0.4);
    font-style: italic;
    font-size: 0.9em;
  }
  .variable-block {
    display: block;
    border-left: 3px solid rgba(78,140,140,0.5);
    padding: 8px 12px;
    margin: 6px 0;
    background: rgba(78,140,140,0.04);
    border-radius: 0 4px 4px 0;
    user-select: none;
  }
  .variable-block__label {
    font-size: 10px;
    font-weight: 600;
    color: #4e8c8c;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .variable-block__content {
    font-size: 13px;
    line-height: 1.7;
    color: #1a1f24;
  }
  .variable-block__content p { margin: 0 0 6px; }
  .variable-block__content p:last-child { margin-bottom: 0; }
  .variable-block__content ul { list-style: disc; padding-left: 18px; margin: 4px 0; }
  .variable-block__content ol { list-style: decimal; padding-left: 18px; margin: 4px 0; }
  .variable-block__content img { max-width: 100%; max-height: 320px; border-radius: 3px; margin: 4px 0; }
`

// ââ Helpers âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export function setProjectVariables(variables: ProjectVariable[]) {
  if (typeof window === 'undefined') return
  const map: Record<string, { value: string; type: string }> = {}
  for (const v of variables) {
    if (v.value) map[v.tag] = { value: v.value, type: v.variable_type || 'text' }
  }
  window.__projectVariables = map
}

// Convert TipTap JSON to simple HTML for display inside variable block
export function richJsonToHtml(doc: any): string {
  if (!doc || !doc.content) return ''
  return doc.content.map(nodeToHtml).join('')
}

function nodeToHtml(node: any): string {
  if (!node) return ''
  switch (node.type) {
    case 'paragraph': {
      const inner = (node.content || []).map(nodeToHtml).join('')
      return `<p>${inner || '<br>'}</p>`
    }
    case 'text': {
      let t = escapeHtml(node.text || '')
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === 'bold') t = `<strong>${t}</strong>`
          else if (mark.type === 'italic') t = `<em>${t}</em>`
          else if (mark.type === 'underline') t = `<u>${t}</u>`
        }
      }
      return t
    }
    case 'bulletList':
      return `<ul>${(node.content || []).map(nodeToHtml).join('')}</ul>`
    case 'orderedList':
      return `<ol>${(node.content || []).map(nodeToHtml).join('')}</ol>`
    case 'listItem':
      return `<li>${(node.content || []).map(nodeToHtml).join('')}</li>`
    case 'image':
      return `<img src="${node.attrs?.src || ''}" alt="${escapeHtml(node.attrs?.alt || '')}" style="max-width:100%;max-height:320px;">`
    case 'hardBreak':
      return '<br>'
    default:
      return (node.content || []).map(nodeToHtml).join('')
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function tryParseJson(value: string): any {
  try { return JSON.parse(value) } catch { return null }
}

// ââ Export resolver âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Walks document JSON and replaces variableNode atoms with their resolved content.
// For text variables â single text node.
// For rich_text variables â inlines the full content nodes from the variable doc.
export function resolveVariablesInContent(content: any, variables: ProjectVariable[]): any {
  if (!content) return content

  const map: Record<string, ProjectVariable> = {}
  for (const v of variables) map[v.tag] = v

  function resolveNode(node: any): any | any[] {
    if (node.type === 'variableNode') {
      const v = map[node.attrs?.tag]
      if (!v) return { type: 'text', text: node.attrs?.tag || '' }

      if (v.variable_type === 'rich_text' && v.value) {
        const parsed = tryParseJson(v.value)
        if (parsed?.content) {
          // Mark nodes as coming from rich variable so parent can handle them
          return parsed.content.map((n: any) => ({ ...n, _fromRichVar: true }))
        }
      }
      // Plain text fallback
      return { type: 'text', text: v.value || v.tag }
    }

    if (node.content) {
      const resolved: any[] = []
      for (const child of node.content) {
        const r = resolveNode(child)
        if (Array.isArray(r)) resolved.push(...r)
        else resolved.push(r)
      }

      // If this paragraph now contains block-level nodes (from rich var),
      // extract them out and return as siblings instead
      if (node.type === 'paragraph') {
        const hasBlocks = resolved.some((n: any) => n._fromRichVar && n.type !== 'text')
        if (hasBlocks) {
          // Split: text before, rich blocks, text after
          const result: any[] = []
          let inlineBuffer: any[] = []
          for (const n of resolved) {
            if (n._fromRichVar && n.type !== 'text') {
              if (inlineBuffer.length > 0) {
                result.push({ type: 'paragraph', content: inlineBuffer })
                inlineBuffer = []
              }
              const { _fromRichVar, ...clean } = n
              result.push(clean)
            } else {
              const { _fromRichVar, ...clean } = n
              inlineBuffer.push(clean)
            }
          }
          if (inlineBuffer.length > 0) result.push({ type: 'paragraph', content: inlineBuffer })
          return result
        }
      }

      return { ...node, content: resolved.map(({ _fromRichVar, ...n }: any) => n) }
    }

    return node
  }

  function resolveDoc(doc: any): any {
    const resolvedContent: any[] = []
    for (const node of doc.content || []) {
      const r = resolveNode(node)
      if (Array.isArray(r)) resolvedContent.push(...r)
      else resolvedContent.push(r)
    }
    return { ...doc, content: resolvedContent }
  }

  return resolveDoc(content)
}

// ââ RiskMatrixNode (unchanged) âââââââââââââââââââââââââââââââââââââââââââââ
export const RiskMatrixNode = Node.create({
  name: 'riskMatrixNode',
  group: 'block',
  atom: true,
  addAttributes() {
    return { mode: { default: 'initial' } }
  },
  parseHTML() { return [{ tag: 'div[data-risk-matrix]' }] },
  renderHTML({ node }: any) {
    return ['div', { 'data-risk-matrix': node.attrs.mode, class: 'risk-matrix-placeholder' }, '[ Risk Matrix ]']
  },
  addNodeView() {
    return ({ node }: any) => {
      const dom = document.createElement('div')
      dom.setAttribute('data-risk-matrix', node.attrs.mode)
      dom.setAttribute('contenteditable', 'false')
      dom.style.cssText = 'margin: 16px 0; user-select: none;'

      const parts = window.location.pathname.split('/')
      const projIdx = parts.indexOf('projects')
      const projectId = projIdx !== -1 ? parts[projIdx + 1] : null

      const render = async () => {
        if (!projectId) {
          dom.innerHTML = '<p style="color:#ccc;font-size:12px">[ Risk Matrix: no project ]</p>'
          return
        }
        try {
          const listRes = await fetch('/api/projects/' + projectId + '/fmea')
          if (!listRes.ok) throw new Error('no fmea')
          const fmeaData = await listRes.json()
          if (!fmeaData.fmea) throw new Error('no fmea doc')

          const criteria = fmeaData.criteria || {}
          const sheets = fmeaData.sheets || []
          const allRows: any[] = sheets.flatMap((s: any) => s.rows || [])

          const mode = node.attrs.mode
          const probKey = mode === 'residual' ? 'residual_probability' : 'probability'
          const sevKey  = mode === 'residual' ? 'residual_severity'    : 'severity'

          const r1max: number = criteria.r1_max ?? 4
          const r2max: number = criteria.r2_max ?? 9

          const rpnColor = (rpn: number): string => {
            if (rpn <= r1max) return '#92C95B'
            if (rpn <= r2max) return '#FFEB3B'
            return '#F44336'
          }
          const rpnLevel = (rpn: number): string => {
            if (rpn <= r1max) return 'LOW'
            if (rpn <= r2max) return 'MEDIUM'
            return 'HIGH'
          }

          const countMap: Record<string, number> = {}
          const levelCount: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 }
          for (const row of allRows) {
            const p = parseInt(row[probKey])
            const s = parseInt(row[sevKey])
            if (!p || !s) continue
            const key = p + '-' + s
            countMap[key] = (countMap[key] || 0) + 1
            const rpn = p * s
            levelCount[rpnLevel(rpn)]++
          }

          const severities = [1, 2, 3, 4, 5]
          const probabilities = [5, 4, 3, 2, 1]
          const sevLabels: Record<number, string> = { 1: 'Negligible', 2: 'Minor', 3: 'Serious', 4: 'Critical', 5: 'Catastrophic' }
          const probLabels: Record<number, string> = { 5: 'Frequent', 4: 'Probable', 3: 'Occasional', 2: 'Remote', 1: 'Improbable' }

          const wrapper = document.createElement('div')
          wrapper.style.cssText = 'border:1px solid rgba(0,0,0,0.1);border-radius:6px;padding:16px;background:#fafaf8;overflow-x:auto;'

          const labelEl = document.createElement('div')
          labelEl.style.cssText = 'font-size:10px;font-weight:600;color:#8a96a2;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;font-family:Arial,sans-serif;'
          labelEl.textContent = (mode === 'residual' ? 'Residual' : 'Initial') + ' Risk Matrix - auto-generated from FMEA'
          wrapper.appendChild(labelEl)

          const table = document.createElement('table')
          table.style.cssText = 'border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px;margin-bottom:12px;'

          const thead = table.createTHead()
          const hrow1 = thead.insertRow()
          const cornerCell = hrow1.insertCell()
          cornerCell.rowSpan = 2
          cornerCell.colSpan = 2
          cornerCell.style.cssText = 'border:1px solid #bbb;padding:4px 8px;'
          const sevHeader = hrow1.insertCell()
          sevHeader.colSpan = 5
          sevHeader.style.cssText = 'border:1px solid #bbb;padding:4px 8px;font-weight:700;text-align:center;background:#f0f0f0;'
          sevHeader.textContent = 'Severity of Harm'

          const hrow2 = thead.insertRow()
          severities.forEach(function(s) {
            const th = hrow2.insertCell()
            th.style.cssText = 'border:1px solid #bbb;padding:4px 8px;text-align:center;background:#f0f0f0;font-weight:600;'
            th.innerHTML = sevLabels[s] + '<br/><span style="font-weight:400;color:#888">' + s + '</span>'
          })

          const tbody = table.createTBody()
          probabilities.forEach(function(p, pi) {
            const tr = tbody.insertRow()
            if (pi === 0) {
              const phc = tr.insertCell()
              phc.rowSpan = 5
              phc.style.cssText = 'border:1px solid #bbb;padding:4px 8px;text-align:center;font-weight:700;writing-mode:vertical-rl;transform:rotate(180deg);background:#f0f0f0;white-space:nowrap;'
              phc.textContent = 'Probability of Occurrence'
            }
            const plc = tr.insertCell()
            plc.style.cssText = 'border:1px solid #bbb;padding:4px 8px;background:#f0f0f0;white-space:nowrap;'
            plc.innerHTML = '<span style="font-weight:700">' + p + '</span> ' + probLabels[p]
            severities.forEach(function(s) {
              const rpn = p * s
              const bg = rpnColor(rpn)
              const count = countMap[p + '-' + s] || 0
              const textColor = rpn <= r1max ? '#27500A' : rpn <= r2max ? '#7A6500' : '#fff'
              const td = tr.insertCell()
              td.style.cssText = 'border:1px solid #bbb;padding:6px 10px;background:' + bg + ';text-align:center;font-weight:700;color:' + textColor + ';min-width:48px;'
              td.textContent = count > 0 ? String(count) : ''
            })
          })

          wrapper.appendChild(table)

          const summaryLabel = document.createElement('div')
          summaryLabel.style.cssText = 'font-size:11px;font-family:Arial,sans-serif;margin-bottom:4px;color:#555;'
          summaryLabel.textContent = 'Level of risk:'
          wrapper.appendChild(summaryLabel)

          const sumTable = document.createElement('table')
          sumTable.style.cssText = 'border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;min-width:300px;'
          const sumHead = sumTable.createTHead()
          const sumHrow = sumHead.insertRow()
          const levels: [string, string, string][] = [['LOW', '#92C95B', '#27500A'], ['MEDIUM', '#FFEB3B', '#7A6500'], ['HIGH', '#F44336', '#fff']]
          levels.forEach(function(lv) {
            const th = sumHrow.insertCell()
            th.style.cssText = 'border:1px solid #bbb;padding:6px 24px;background:' + lv[1] + ';text-align:center;font-weight:700;color:' + lv[2] + ';width:33%;'
            th.textContent = lv[0]
          })
          const sumBody = sumTable.createTBody()
          const sumBrow = sumBody.insertRow()
          levels.forEach(function(lv) {
            const td = sumBrow.insertCell()
            td.style.cssText = 'border:1px solid #bbb;padding:6px 24px;text-align:center;'
            td.textContent = String(levelCount[lv[0]] || 0)
          })
          wrapper.appendChild(sumTable)

          dom.innerHTML = ''
          dom.appendChild(wrapper)

        } catch (e) {
          dom.innerHTML = '<div style="padding:12px;background:#f5f2ee;border-radius:4px;font-size:12px;color:#8a96a2;">[ Risk Matrix - no FMEA data found ]</div>'
        }
      }

      render()
      return { dom }
    }
  },
})

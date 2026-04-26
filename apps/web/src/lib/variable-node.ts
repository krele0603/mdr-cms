import { Node, mergeAttributes } from '@tiptap/core'

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
    const value = typeof window !== 'undefined'
      ? (window as any).__projectVariables?.[tag] || null
      : null
    const display = value || tag
    const isEmpty = !value
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-variable': tag,
      class: isEmpty ? 'variable-chip variable-chip--empty' : 'variable-chip',
      contenteditable: 'false',
      title: tag,
    }), display]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span')
      const tag = node.attrs.tag
      const value = (window as any).__projectVariables?.[tag] || null
      const isEmpty = !value
      dom.setAttribute('data-variable', tag)
      dom.setAttribute('contenteditable', 'false')
      dom.setAttribute('title', isEmpty ? `${tag} (not defined)` : `${tag}`)
      dom.className = isEmpty ? 'variable-chip variable-chip--empty' : 'variable-chip'
      dom.textContent = value || tag
      return { dom }
    }
  },
})

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
`

export function setProjectVariables(variables: { tag: string; value: string }[]) {
  if (typeof window === 'undefined') return
  const map: Record<string, string> = {}
  for (const v of variables) {
    if (v.value) map[v.tag] = v.value
  }
  ;(window as any).__projectVariables = map
}

export function resolveVariablesInContent(content: any, variables: { tag: string; value: string }[]): any {
  if (!content) return content
  const map: Record<string, string> = {}
  for (const v of variables) map[v.tag] = v.value || v.tag

  function resolve(node: any): any {
    if (node.type === 'variableNode') {
      return { type: 'text', text: map[node.attrs?.tag] || node.attrs?.tag || '' }
    }
    if (node.content) return { ...node, content: node.content.map(resolve) }
    return node
  }

  return resolve(content)
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface MentionInputProps {
  onSubmit: (payload: {
    text: string
    mentions: { models: string[]; tool: string | null }
  }) => void | Promise<void>
  disabled?: boolean
  initialModels?: string[]
  prefillText?: string
  prefillTokens?: Token[]
  prefillKey?: number
}

type Token = {
  type: 'model' | 'tool'
  value: string
}

const MODEL_OPTIONS = ['豆包', 'DeepSeek', 'DeepSeek-R1', 'Kimi', 'GLM']
const ROLE_OPTIONS = ['@分歧官', '@合成官', '@审稿官', '@比稿官']

export function MentionInput({
  onSubmit,
  disabled = false,
  initialModels = ['豆包', 'DeepSeek'],
  prefillText,
  prefillTokens,
  prefillKey,
}: MentionInputProps) {
  const [text, setText] = useState('')
  const [tab, setTab] = useState<'models' | 'roles'>('models')
  const [open, setOpen] = useState(false)
  const [warning, setWarning] = useState('')
  const [tokens, setTokens] = useState<Token[]>(() =>
    initialModels.map((model) => ({ type: 'model', value: model }))
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (prefillText && prefillKey) {
      setText(prefillText)
      textareaRef.current?.focus()
    }
  }, [prefillKey])

  useEffect(() => {
    if (prefillTokens && prefillKey) {
      setTokens(prefillTokens)
    }
  }, [prefillKey])

  const models = useMemo(
    () => tokens.filter((token) => token.type === 'model').map((token) => token.value),
    [tokens]
  )
  const tool = useMemo(() => {
    const roleToken = tokens.find((token) => token.type === 'tool')?.value
    return roleToken ? roleToken.replace(/^@/, '').toLowerCase() : null
  }, [tokens])

  function addToken(type: Token['type'], value: string) {
    setTokens((prev) => {
      if (prev.some((token) => token.value === value)) {
        return prev
      }

      if (type === 'tool') {
        return [...prev.filter((token) => token.type !== 'tool'), { type, value }]
      }

      return [...prev, { type, value }]
    })
    setWarning('')
    setOpen(false)
  }

  function removeToken(value: string) {
    setWarning('')
    setTokens((prev) => prev.filter((token) => token.value !== value))
  }

  async function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return

    if (models.length < 1 && tool === null) {
      setWarning('请选择至少 1 个 AI')
      setTimeout(() => {
        alert('请选择至少 1 个 AI')
      }, 300)
      return
    }

    setWarning('')

    await onSubmit({
      text: trimmed,
      mentions: {
        models,
        tool,
      },
    })

    setText('')
  }

  return (
    <div className="relative w-full rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
        {tokens.map((token) => (
          <span
            key={token.value}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
              token.type === 'model'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-violet-50 text-violet-700'
            )}
          >
            {token.value}
            <button
              type="button"
              className="text-current/70 transition hover:text-current"
              onClick={() => removeToken(token.value)}
              aria-label={`移除 ${token.value}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          if (warning) {
            setWarning('')
          }
        }}
        onInput={(event) => {
          const target = event.target as HTMLTextAreaElement
          target.style.height = 'auto'
          target.style.height = Math.min(target.scrollHeight, 240) + 'px'
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void handleSubmit()
          }
        }}
        disabled={disabled}
        placeholder="输入你的问题，至少选择 2 个 AI 协作"
        className="min-h-[80px] max-h-[240px] w-full resize-none overflow-y-auto rounded-t-none rounded-b-3xl border-0 px-4 py-4 text-sm outline-none placeholder:text-slate-400"
      />

      <div className="flex items-center justify-between px-4 pb-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            @
          </button>

          {open ? (
            <div className="absolute bottom-12 left-0 z-20 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab('models')}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    tab === 'models' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  模型
                </button>
                <button
                  type="button"
                  onClick={() => setTab('roles')}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    tab === 'roles' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  角色
                </button>
              </div>

              <div className="space-y-2">
                {(tab === 'models' ? MODEL_OPTIONS : ROLE_OPTIONS).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => addToken(tab === 'models' ? 'model' : 'tool', option)}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {warning ? <div className="text-xs text-red-500">{warning}</div> : null}
          <button
            type="button"
            disabled={disabled || text.trim().length === 0}
            onClick={() => void handleSubmit()}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

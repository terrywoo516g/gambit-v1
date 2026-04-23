import React from 'react'
import { MentionsInput, Mention } from 'react-mentions'

export interface MentionData {
  id: string
  display: string
}

interface Props {
  value: string
  onChange: (val: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
  data: MentionData[]
}

const defaultStyle = {
  control: {
    backgroundColor: '#fff',
    fontSize: 14,
    fontWeight: 'normal',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    minHeight: '44px',
    padding: '0',
    width: '100%',
  },
  '&multiLine': {
    control: {
      fontFamily: 'inherit',
      minHeight: 44,
      maxHeight: 120,
      overflowY: 'auto',
      borderRadius: '12px',
    },
    highlighter: {
      padding: '10px 16px',
      border: '1px solid transparent',
    },
    input: {
      padding: '10px 16px',
      border: '1px solid transparent',
      outline: 'none',
      borderRadius: '12px',
      backgroundColor: 'transparent',
      boxShadow: 'none',
      width: '100%',
    },
  },
  suggestions: {
    list: {
      backgroundColor: 'white',
      border: '1px solid rgba(0,0,0,0.1)',
      fontSize: 14,
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      zIndex: 50,
      position: 'absolute',
      bottom: '100%',
      marginBottom: '8px'
    },
    item: {
      padding: '8px 12px',
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      '&focused': {
        backgroundColor: '#f3f4f6',
      },
    },
  },
}

const mentionStyle = {
  backgroundColor: '#e0e7ff',
  color: '#4f46e5',
  borderRadius: '4px',
  padding: '0 2px',
  marginLeft: '-2px',
  marginRight: '2px',
  zIndex: 1,
  position: 'relative'
}

export default function MentionTextarea({ value, onChange, onSubmit, disabled, placeholder, data }: Props) {
  
  const handleChange = (e: any, newValue: string) => {
    onChange(newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Check if suggestion list is open (react-mentions internal state hack or let it handle its own enter)
      // Usually if we just preventDefault, it breaks suggestion selection.
      // So we only submit if there's no suggestion popup active.
      // A simple heuristic: react-mentions stops propagation on Enter if suggestion is open.
      // But we can just use a short timeout or check if default was prevented.
      if (!e.defaultPrevented) {
        e.preventDefault()
        onSubmit()
      }
    }
  }

  return (
    <div className="relative flex-1 w-full bg-white rounded-xl shadow-sm focus-within:ring-1 focus-within:ring-accent transition">
      <MentionsInput
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown as any}
        style={defaultStyle as any}
        placeholder={placeholder}
        disabled={disabled}
        allowSuggestionsAboveCursor={true}
        a11ySuggestionsListLabel={"Suggested mentions"}
        className="mentions-input-container"
      >
        <Mention
          trigger="@"
          data={data}
          style={mentionStyle as any}
          displayTransform={(id, display) => `@${display}`}
        />
      </MentionsInput>
    </div>
  )
}

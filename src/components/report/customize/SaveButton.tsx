'use client'

interface SaveButtonProps {
  isDirty: boolean
  isSaving: boolean
  onClick: () => void
}

export function SaveButton({ isDirty, isSaving, onClick }: SaveButtonProps) {
  if (isSaving) {
    return (
      <button 
        disabled
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-100 text-gray-400 cursor-not-allowed"
      >
        保存中...
      </button>
    )
  }

  if (!isDirty) {
    return (
      <button 
        disabled
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
      >
        已保存
      </button>
    )
  }

  return (
    <button 
      onClick={onClick}
      className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-accent hover:bg-accent/90 text-white"
    >
      保存
      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
    </button>
  )
}
export type ReportTemplate = 'report' | 'memo' | 'custom'
export type ReportTone = 'formal' | 'plain' | 'academic'
export type DimensionKey = 'consensus' | 'divergence' | 'minority' | 'pending'

export type SectionKey =
  | 'cover'
  | 'question'
  | 'summary'
  | 'dimensions'
  | 'consensus'
  | 'divergence'
  | 'minority'
  | 'pending'
  | 'draft'
  | 'conclusion'
  | 'actions'
  | 'modelSummary'
  | 'rawAnswers'
  | 'metadata'

export interface ReportConfig {
  template: ReportTemplate
  title: string
  tone: ReportTone
  selectedDimensions: DimensionKey[]
  enabledSections: SectionKey[]
  sectionOrder: SectionKey[]
  contentEdits: {
    title?: string
    question?: string
    judgment?: string
    summary?: string
    draft?: string
    conclusion?: string
    actions?: string
    dimensions?: Partial<Record<DimensionKey, string[]>>
  }
}

export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  template: 'report',
  title: '',
  tone: 'formal',
  selectedDimensions: ['consensus', 'divergence', 'minority', 'pending'],
  enabledSections: [
    'cover',
    'summary',
    'dimensions',
    'conclusion',
    'actions',
    'metadata',
  ],
  sectionOrder: [
    'cover',
    'summary',
    'dimensions',
    'conclusion',
    'actions',
    'metadata',
  ],
  contentEdits: {},
}

export function parseReportConfig(raw: string | null | undefined): ReportConfig | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    return parsed as ReportConfig
  } catch {
    return null
  }
}
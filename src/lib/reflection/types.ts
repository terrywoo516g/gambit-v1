export interface ReflectionItem {
  id: string
  text: string
}

export interface Reflection {
  summary: string
  dimensions: {
    consensus: ReflectionItem[]
    divergence: ReflectionItem[]
    minority: ReflectionItem[]
    pending: ReflectionItem[]
  }
  draft: string
}

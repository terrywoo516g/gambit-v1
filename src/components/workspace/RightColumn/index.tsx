import SummaryCard from './SummaryCard'
import FourDimensions from './FourDimensions'
import AutoDraft from './AutoDraft'
import ExportActions from './ExportActions'

export default function RightColumn() {
  // TODO: D3 之后将 page.tsx 中的右栏逻辑迁移到这里
  // 目前只是占位，包含未来会用到的四个子组件
  return (
    <div className="flex flex-col h-full bg-white space-y-4 p-4">
      <SummaryCard />
      <FourDimensions />
      <AutoDraft />
      <ExportActions />
    </div>
  )
}

export default function ReportPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">报告生成页 - 待实现</h1>
        <p className="text-gray-600">Report ID: {params.id}</p>
        {/* TODO: D3 之后实现报告渲染 */}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Subject, api } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, ZoomIn, ZoomOut, Maximize2, Loader2, Network } from 'lucide-react'
import { toast } from 'sonner'

type NodeType = 'knowledge' | 'thinking' | 'wrong'

interface MapNode {
  id: string; type: NodeType; title: string; mastery?: number; status?: string
  x: number; y: number; radius: number; relationCount: number
}
interface MapEdge { from: string; to: string; type: string; description: string; aiGenerated?: boolean }
interface KnowledgeMapData {
  subjectId: string; subjectName: string; nodes: MapNode[]; edges: MapEdge[]; generatedAt: string
}

// 知识点间关联的颜色
const KP_EDGE_COLORS: Record<string, string> = {
  prerequisite: '#dc2626', extension: '#16a34a', contrast: '#d97706', example: '#7c3aed', related: '#0891b2',
}
// 跨类型关联的颜色(虚线)
const CROSS_EDGE_COLORS: Record<string, string> = {
  'has-thinking': '#3b82f6', 'has-wrong': '#ef4444',
  'extends': '#6b7280', 'contrasts': '#6b7280', 'refutes': '#6b7280', 'inspired-by': '#6b7280',
}
const KP_EDGE_LABELS: Record<string, string> = {
  prerequisite: '前置依赖', extension: '拓展延伸', contrast: '对比辨析', example: '典型示例', related: '一般相关',
}
const CROSS_EDGE_LABELS: Record<string, string> = {
  'has-thinking': '关联思考', 'has-wrong': '关联错题',
  'extends': '延伸', 'contrasts': '对比', 'refutes': '反驳', 'inspired-by': '受启发',
}

function masteryColor(m: number) { return m <= 40 ? '#dc2626' : m <= 70 ? '#d97706' : '#16a34a' }
function thinkingColor(status?: string) { return status === 'reflected' ? '#3b82f6' : '#9ca3af' }
function wrongColor(status?: string) { return status === 'mastered' ? '#16a34a' : status === 'reviewed' ? '#d97706' : '#dc2626' }

interface Props {
  subjects: Subject[]
  onNodeClick: (nodeId: string, nodeType: NodeType) => void
}

export function KnowledgeMapModule({ subjects, onNodeClick }: Props) {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id || '')
  const [mapData, setMapData] = useState<KnowledgeMapData | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const loadMap = useCallback(async (subjectId: string, force = false) => {
    if (!subjectId) return
    setLoading(true)
    try {
      const url = `/api/knowledge-map?subjectId=${subjectId}`
      const data = force ? await api<KnowledgeMapData>(url, { method: 'POST' }) : await api<KnowledgeMapData>(url)
      setMapData(data); setScale(1); setPan({ x: 0, y: 0 })
    } catch (e: any) { toast.error(e.message || '加载失败') } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (selectedSubject) loadMap(selectedSubject) }, [selectedSubject, loadMap])

  const refresh = async () => { if (!selectedSubject) return; setRefreshing(true); await loadMap(selectedSubject, true); setRefreshing(false); toast.success('地图已刷新') }
  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3))
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.3))
  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }) }

  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); setScale(s => Math.max(0.3, Math.min(s + (e.deltaY > 0 ? -0.1 : 0.1), 3))) }
  const handleMouseDown = (e: React.MouseEvent) => { if (draggingNode) return; setIsPanning(true); panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y } }
  const handleMouseMove = (e: React.MouseEvent) => { if (!isPanning) return; setPan({ x: panStart.current.panX + e.clientX - panStart.current.x, y: panStart.current.panY + e.clientY - panStart.current.y }) }
  const handleMouseUp = () => { setIsPanning(false); setDraggingNode(null) }
  const handleNodeClick = (node: MapNode) => { if (!draggingNode) onNodeClick(node.id, node.type) }
  const handleNodeMouseDown = (e: React.MouseEvent, node: MapNode) => { e.stopPropagation(); setDraggingNode(node.id); panStart.current = { x: e.clientX, y: e.clientY, panX: node.x, panY: node.y } }
  const handleNodeMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode || !mapData) return
    const dx = (e.clientX - panStart.current.x) / scale, dy = (e.clientY - panStart.current.y) / scale
    setMapData({ ...mapData, nodes: mapData.nodes.map(n => n.id === draggingNode ? { ...n, x: panStart.current.panX + dx, y: panStart.current.panY + dy } : n) })
  }

  // 渲染节点形状
  const renderNode = (node: MapNode) => {
    const color = node.type === 'knowledge' ? masteryColor(node.mastery || 0)
      : node.type === 'thinking' ? thinkingColor(node.status)
      : wrongColor(node.status)

    if (node.type === 'knowledge') {
      // 知识点:圆形
      return (
        <g key={node.id} className="cursor-pointer" onClick={() => handleNodeClick(node)} onMouseDown={e => handleNodeMouseDown(e, node)}>
          <circle cx={node.x} cy={node.y} r={node.radius} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={2} className="transition-opacity hover:opacity-80" />
          <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="10" fill="white" className="pointer-events-none font-bold">{node.mastery}</text>
          <text x={node.x} y={node.y + node.radius + 14} textAnchor="middle" fontSize="11" fill="currentColor" className="pointer-events-none font-medium">{node.title.length > 8 ? node.title.slice(0, 7) + '…' : node.title}</text>
        </g>
      )
    } else if (node.type === 'thinking') {
      // 思考笔记:方形
      const s = node.radius
      return (
        <g key={node.id} className="cursor-pointer" onClick={() => handleNodeClick(node)} onMouseDown={e => handleNodeMouseDown(e, node)}>
          <rect x={node.x - s} y={node.y - s} width={s * 2} height={s * 2} rx={3} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={2} className="transition-opacity hover:opacity-80" />
          <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="12" fill="white" className="pointer-events-none">💭</text>
          <text x={node.x} y={node.y + s + 14} textAnchor="middle" fontSize="10" fill="currentColor" className="pointer-events-none">{node.title.length > 8 ? node.title.slice(0, 7) + '…' : node.title}</text>
        </g>
      )
    } else {
      // 错题:三角形
      const s = node.radius
      const points = `${node.x},${node.y - s} ${node.x - s},${node.y + s * 0.7} ${node.x + s},${node.y + s * 0.7}`
      return (
        <g key={node.id} className="cursor-pointer" onClick={() => handleNodeClick(node)} onMouseDown={e => handleNodeMouseDown(e, node)}>
          <polygon points={points} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={2} className="transition-opacity hover:opacity-80" />
          <text x={node.x} y={node.y + 5} textAnchor="middle" fontSize="11" fill="white" className="pointer-events-none">✗</text>
          <text x={node.x} y={node.y + s + 14} textAnchor="middle" fontSize="10" fill="currentColor" className="pointer-events-none">{node.title.length > 8 ? node.title.slice(0, 7) + '…' : node.title}</text>
        </g>
      )
    }
  }

  if (subjects.length === 0) return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-semibold">知识地图</h2><p className="text-sm text-muted-foreground mt-1">以可视化图表展示学科内知识点、思考笔记、错题之间的关联。</p></div>
      <Card><CardContent className="p-10 text-center text-muted-foreground">还没有学科。请先在"学科"中创建学科和知识点。</CardContent></Card>
    </div>
  )

  // 统计节点数
  const nodeStats = mapData ? {
    knowledge: mapData.nodes.filter(n => n.type === 'knowledge').length,
    thinking: mapData.nodes.filter(n => n.type === 'thinking').length,
    wrong: mapData.nodes.filter(n => n.type === 'wrong').length,
  } : null

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h2 className="text-xl font-semibold">知识地图</h2><p className="text-sm text-muted-foreground mt-1">力导向布局展示知识点(●)、思考笔记(■)、错题(▲)及关联。</p></div>
        <div className="flex items-center gap-2">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-40"><SelectValue placeholder="选择学科" /></SelectTrigger>
            <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing || loading}>
            {refreshing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}刷新
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={zoomIn}><ZoomIn className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={zoomOut}><ZoomOut className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={resetView}><Maximize2 className="h-4 w-4" /></Button>
        <span className="text-xs text-muted-foreground ml-2">缩放: {Math.round(scale * 100)}%</span>
        {nodeStats && (
          <span className="text-xs text-muted-foreground ml-4">
            {nodeStats.knowledge} 知识点 · {nodeStats.thinking} 思考 · {nodeStats.wrong} 错题 · {mapData!.edges.length} 条关联
          </span>
        )}
      </div>
      <Card><CardContent className="p-0 overflow-hidden">
        {loading ? (
          <div className="h-[500px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : mapData && mapData.nodes.length > 0 ? (
          <div className="relative w-full h-[500px] bg-muted/20 overflow-hidden" onWheel={handleWheel} onMouseDown={handleMouseDown}
            onMouseMove={e => draggingNode ? handleNodeMouseMove(e) : handleMouseMove(e)} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
            style={{ cursor: isPanning || draggingNode ? 'grabbing' : 'grab' }}>
            <svg width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" className="select-none">
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                {mapData.edges.map((edge, i) => {
                  const f = mapData.nodes.find(n => n.id === edge.from), t = mapData.nodes.find(n => n.id === edge.to)
                  if (!f || !t) return null
                  const isCross = edge.type.startsWith('has-') || ['extends', 'contrasts', 'refutes', 'inspired-by'].includes(edge.type)
                  const color = isCross ? (CROSS_EDGE_COLORS[edge.type] || '#6b7280') : (KP_EDGE_COLORS[edge.type] || KP_EDGE_COLORS.related)
                  return <line key={i} x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke={color} strokeWidth={isCross ? 1 : 1.5} strokeOpacity={0.5} strokeDasharray={isCross ? '4 2' : undefined} />
                })}
                {mapData.nodes.map(renderNode)}
              </g>
            </svg>
          </div>
        ) : (
          <div className="h-[500px] flex flex-col items-center justify-center text-muted-foreground">
            <Network className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">{mapData ? '该学科还没有知识点' : '选择一个学科查看知识地图'}</p>
            <p className="text-xs mt-1">在"知识点"中创建知识点并建立关联后,这里会显示可视化图表</p>
          </div>
        )}
      </CardContent></Card>
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">知识点掌握度:</span>
          {[['#dc2626', '0-40%'], ['#d97706', '41-70%'], ['#16a34a', '71-100%']].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />{l}</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">节点类型:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400" />思考(■)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />错题(▲)</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">知识点关联:</span>
          {Object.entries(KP_EDGE_COLORS).map(([t, c]) => (
            <span key={t} className="flex items-center gap-1"><span className="w-4 h-0.5" style={{ backgroundColor: c }} />{KP_EDGE_LABELS[t] || t}</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">跨类型关联:</span>
          {Object.entries(CROSS_EDGE_COLORS).map(([t, c]) => (
            <span key={t} className="flex items-center gap-1"><span className="w-4 h-0.5 border-t border-dashed" style={{ borderColor: c }} />{CROSS_EDGE_LABELS[t] || t}</span>
          ))}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        提示:拖拽节点可调整位置,滚轮缩放,拖拽空白处平移画布,点击节点查看详情。
        {mapData && <span className="ml-2">地图生成于 {new Date(mapData.generatedAt).toLocaleString('zh-CN')}</span>}
      </div>
    </div>
  )
}

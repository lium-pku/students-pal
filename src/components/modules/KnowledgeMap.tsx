'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Subject, api } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, ZoomIn, ZoomOut, Maximize2, Loader2, Network } from 'lucide-react'
import { toast } from 'sonner'

interface MapNode {
  id: string
  title: string
  mastery: number
  x: number
  y: number
  radius: number
  relationCount: number
}

interface MapEdge {
  from: string
  to: string
  type: string
  description: string
  aiGenerated: boolean
}

interface KnowledgeMapData {
  subjectId: string
  subjectName: string
  nodes: MapNode[]
  edges: MapEdge[]
  generatedAt: string
}

// 关联类型颜色
const EDGE_COLORS: Record<string, string> = {
  prerequisite: '#dc2626',
  extension: '#16a34a',
  contrast: '#d97706',
  example: '#7c3aed',
  related: '#0891b2',
}

const EDGE_LABELS: Record<string, string> = {
  prerequisite: '前置依赖',
  extension: '拓展延伸',
  contrast: '对比辨析',
  example: '典型示例',
  related: '一般相关',
}

// 掌握度颜色
function masteryColor(mastery: number): string {
  if (mastery <= 40) return '#dc2626' // 红
  if (mastery <= 70) return '#d97706' // 黄
  return '#16a34a' // 绿
}

interface KnowledgeMapModuleProps {
  subjects: Subject[]
  onNodeClick: (nodeId: string) => void
}

export function KnowledgeMapModule({ subjects, onNodeClick }: KnowledgeMapModuleProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0]?.id || '')
  const [mapData, setMapData] = useState<KnowledgeMapData | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // 缩放和平移状态
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  // 拖拽节点状态
  const [draggingNode, setDraggingNode] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)

  // 加载地图
  const loadMap = useCallback(async (subjectId: string, force = false) => {
    if (!subjectId) return
    setLoading(true)
    try {
      const url = `/api/knowledge-map?subjectId=${subjectId}`
      const data = force
        ? await api<KnowledgeMapData>(url, { method: 'POST' })
        : await api<KnowledgeMapData>(url)
      setMapData(data)
      // 重置视图
      setScale(1)
      setPan({ x: 0, y: 0 })
    } catch (e: any) {
      toast.error(e.message || '加载地图失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSubject) loadMap(selectedSubject)
  }, [selectedSubject, loadMap])

  // 刷新
  const refresh = async () => {
    if (!selectedSubject) return
    setRefreshing(true)
    await loadMap(selectedSubject, true)
    setRefreshing(false)
    toast.success('地图已刷新')
  }

  // 缩放
  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 3))
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.3))
  const resetView = () => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale((s) => Math.max(0.3, Math.min(s + delta, 3)))
  }

  // 画布平移(鼠标)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggingNode) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy })
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    setDraggingNode(null)
  }

  // 节点点击
  const handleNodeClick = (node: MapNode) => {
    if (draggingNode) return // 拖拽中不触发点击
    onNodeClick(node.id)
  }

  // 节点拖拽
  const handleNodeMouseDown = (e: React.MouseEvent, node: MapNode) => {
    e.stopPropagation()
    setDraggingNode(node.id)
    panStart.current = { x: e.clientX, y: e.clientY, panX: node.x, panY: node.y }
  }

  const handleNodeMouseMove = (e: React.MouseEvent) => {
    if (!draggingNode || !mapData) return
    const dx = (e.clientX - panStart.current.x) / scale
    const dy = (e.clientY - panStart.current.y) / scale
    const newX = panStart.current.panX + dx
    const newY = panStart.current.panY + dy
    setMapData({
      ...mapData,
      nodes: mapData.nodes.map((n) =>
        n.id === draggingNode ? { ...n, x: newX, y: newY } : n
      ),
    })
  }

  if (subjects.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">知识地图</h2>
          <p className="text-sm text-muted-foreground mt-1">
            以可视化图表展示学科内知识点之间的关联,帮助你理解知识结构。
          </p>
        </div>
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            还没有学科。请先在"学科"中创建学科和知识点。
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">知识地图</h2>
          <p className="text-sm text-muted-foreground mt-1">
            以力导向布局展示知识点之间的关联。节点颜色 = 掌握度,边颜色 = 关联类型。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择学科" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            刷新
          </Button>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={zoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={zoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={resetView}>
          <Maximize2 className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground ml-2">
          缩放: {Math.round(scale * 100)}%
        </span>
        {mapData && (
          <span className="text-xs text-muted-foreground ml-4">
            {mapData.nodes.length} 个知识点 · {mapData.edges.length} 条关联
          </span>
        )}
      </div>

      {/* 地图画布 */}
      <Card>
        <CardContent className="p-0 overflow-hidden">
          {loading ? (
            <div className="h-[500px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : mapData && mapData.nodes.length > 0 ? (
            <div
              className="relative w-full h-[500px] bg-muted/20 overflow-hidden"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={(e) => {
                if (draggingNode) handleNodeMouseMove(e)
                else handleMouseMove(e)
              }}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: isPanning ? 'grabbing' : draggingNode ? 'grabbing' : 'grab' }}
            >
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox="0 0 800 600"
                preserveAspectRatio="xMidYMid meet"
                className="select-none"
              >
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                  {/* 边 */}
                  {mapData.edges.map((edge, i) => {
                    const fromNode = mapData.nodes.find((n) => n.id === edge.from)
                    const toNode = mapData.nodes.find((n) => n.id === edge.to)
                    if (!fromNode || !toNode) return null
                    const color = EDGE_COLORS[edge.type] || EDGE_COLORS.related
                    return (
                      <line
                        key={`${edge.from}-${edge.to}-${i}`}
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke={color}
                        strokeWidth={1.5}
                        strokeOpacity={0.5}
                      />
                    )
                  })}

                  {/* 节点 */}
                  {mapData.nodes.map((node) => (
                    <g
                      key={node.id}
                      className="cursor-pointer"
                      onClick={() => handleNodeClick(node)}
                      onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius}
                        fill={masteryColor(node.mastery)}
                        fillOpacity={0.7}
                        stroke={masteryColor(node.mastery)}
                        strokeWidth={2}
                        className="transition-opacity hover:opacity-80"
                      />
                      <text
                        x={node.x}
                        y={node.y + node.radius + 14}
                        textAnchor="middle"
                        fontSize="12"
                        fill="currentColor"
                        className="pointer-events-none font-medium"
                      >
                        {node.title.length > 8 ? node.title.slice(0, 7) + '…' : node.title}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + 4}
                        textAnchor="middle"
                        fontSize="10"
                        fill="white"
                        className="pointer-events-none font-bold"
                      >
                        {node.mastery}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>

              {/* 悬浮提示(用 title 属性实现) */}
            </div>
          ) : (
            <div className="h-[500px] flex flex-col items-center justify-center text-muted-foreground">
              <Network className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">
                {mapData ? '该学科还没有知识点' : '选择一个学科查看知识地图'}
              </p>
              <p className="text-xs mt-1">
                在"知识点"中创建知识点并建立关联后,这里会显示可视化图表
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">掌握度:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dc2626' }} />
            0-40%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d97706' }} />
            41-70%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#16a34a' }} />
            71-100%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">关联类型:</span>
          {Object.entries(EDGE_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1">
              <span className="w-4 h-0.5" style={{ backgroundColor: color }} />
              {EDGE_LABELS[type] || type}
            </span>
          ))}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        提示:拖拽节点可调整位置,滚轮缩放,拖拽空白处平移画布,点击节点查看详情。
        {mapData && (
          <span className="ml-2">
            地图生成于 {new Date(mapData.generatedAt).toLocaleString('zh-CN')}
          </span>
        )}
      </div>
    </div>
  )
}

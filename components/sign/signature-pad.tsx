"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Eraser, PenLine, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * Capture a signature by drawing or typing. The canvas bitmap stays transparent
 * with dark ink (so it stamps cleanly onto a white PDF page); a white CSS
 * background just makes it visible on dark UI. onSave receives base64 PNG.
 */
export function SignaturePad({
  onSave,
  saving,
  label = "Save signature",
}: {
  onSave: (base64Png: string) => void
  saving?: boolean
  label?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const dirty = useRef(false)
  const [mode, setMode] = useState<"draw" | "type">("draw")
  const [typed, setTyped] = useState("")

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const g = c.getContext("2d")!
    g.lineWidth = 2.4
    g.lineJoin = "round"
    g.lineCap = "round"
    g.strokeStyle = "#0E1015"
  }, [])

  const clear = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height)
    dirty.current = false
  }, [])

  const renderTyped = useCallback((text: string) => {
    const c = canvasRef.current
    if (!c) return
    const g = c.getContext("2d")!
    g.clearRect(0, 0, c.width, c.height)
    g.fillStyle = "#0E1015"
    g.font = "italic 42px Georgia, 'Times New Roman', serif"
    g.textBaseline = "middle"
    g.fillText(text, 18, c.height / 2)
    dirty.current = text.trim().length > 0
  }, [])

  useEffect(() => {
    if (mode === "type") renderTyped(typed)
  }, [mode, typed, renderTyped])

  function coords(e: React.PointerEvent) {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }
  }
  function down(e: React.PointerEvent) {
    if (mode !== "draw") return
    drawing.current = true
    const g = canvasRef.current!.getContext("2d")!
    const p = coords(e)
    g.beginPath()
    g.moveTo(p.x, p.y)
  }
  function moveP(e: React.PointerEvent) {
    if (!drawing.current) return
    const g = canvasRef.current!.getContext("2d")!
    const p = coords(e)
    g.lineTo(p.x, p.y)
    g.stroke()
    dirty.current = true
  }
  function up() {
    drawing.current = false
  }

  function save() {
    if (mode === "type") renderTyped(typed)
    if (!dirty.current) return
    const data = canvasRef.current!.toDataURL("image/png")
    onSave(data.split(",")[1])
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <Button type="button" size="sm" variant={mode === "draw" ? "default" : "outline"} onClick={() => { setMode("draw"); clear() }}>
          <PenLine className="size-3.5" /> Draw
        </Button>
        <Button type="button" size="sm" variant={mode === "type" ? "default" : "outline"} onClick={() => setMode("type")}>
          <Type className="size-3.5" /> Type
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { clear(); setTyped("") }}>
          <Eraser className="size-3.5" /> Clear
        </Button>
      </div>
      {mode === "type" && (
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type your full name" />
      )}
      <canvas
        ref={canvasRef}
        width={520}
        height={150}
        onPointerDown={down}
        onPointerMove={moveP}
        onPointerUp={up}
        onPointerLeave={up}
        className={cn("w-full touch-none rounded-md border border-hairline bg-white", mode === "type" && "pointer-events-none")}
        style={{ aspectRatio: "520 / 150" }}
      />
      <Button type="button" size="sm" onClick={save} disabled={saving}>
        {saving ? "Saving…" : label}
      </Button>
    </div>
  )
}

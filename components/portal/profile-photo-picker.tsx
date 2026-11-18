"use client"

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react"
import { useRouter } from "next/navigation"
import { Check, ImagePlus, LoaderCircle, Smartphone, Upload, ZoomIn } from "lucide-react"
import { toast } from "sonner"
import { updateProfileAvatar } from "@/app/portal/profile/actions"
import { ANIMAL_AVATARS, type AnimalAvatarKey } from "@/components/portal/avatars/registry"
import { AnimalAvatar } from "@/components/portal/avatars/animal-avatar"
import { usePortalUserAvatar } from "@/components/portal/portal-user-avatar-provider"
import { UserAvatar, type UserAvatarValue } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { compressImageFile } from "@/lib/files/compress"
import { createClient } from "@/lib/supabase/client"

const MAX_FILE_BYTES = 5 * 1024 * 1024
const CROP_STAGE = 200

interface CropState {
  src: string
  width: number
  height: number
  zoom: number
  x: number
  y: number
}

function isSupportedPhoto(file: File) {
  return /^(image\/(jpeg|png|heic|heif))$/i.test(file.type)
    || /\.(jpe?g|png|heic|heif)$/i.test(file.name)
}

function constrainOffset(value: number, rendered: number) {
  const maximum = Math.max(0, (rendered - CROP_STAGE) / 2)
  return Math.max(-maximum, Math.min(maximum, value))
}

export function ProfilePhotoPicker({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const portalUser = usePortalUserAvatar()
  const router = useRouter()
  const chooseInput = useRef<HTMLInputElement>(null)
  const takeInput = useRef<HTMLInputElement>(null)
  const cropImage = useRef<HTMLImageElement | null>(null)
  const drag = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null)
  const [tab, setTab] = useState(() => portalUser?.avatar.kind === "upload" ? "upload" : "animals")
  const [draft, setDraft] = useState<UserAvatarValue>(portalUser?.avatar ?? { kind: null, key: null, path: null, url: null })
  const [crop, setCrop] = useState<CropState | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const touchDevice = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0

  useEffect(() => {
    if (!crop || !cropImage.current) return
    const timer = window.setTimeout(() => {
      const canvas = drawCrop(cropImage.current!, crop, 144)
      setPreviewUrl(canvas.toDataURL("image/jpeg", 0.84))
    }, 24)
    return () => window.clearTimeout(timer)
  }, [crop])

  useEffect(() => () => {
    const src = cropImage.current?.src
    if (src?.startsWith("blob:")) URL.revokeObjectURL(src)
  }, [])

  const user = portalUser
  if (!user) return null

  const { userId, fullName, setAvatar } = user
  const current = user.avatar
  const changed = crop !== null
    || draft.kind !== current.kind
    || draft.key !== current.key
    || draft.path !== current.path
  const shownAvatar: UserAvatarValue = draft.kind === "upload" && crop
    ? { kind: "upload", key: null, path: null, url: previewUrl ?? crop.src }
    : draft
  const hasPhoto = current.kind !== null || draft.kind !== null

  function selectAnimal(key: AnimalAvatarKey) {
    setDraft({ kind: "animal", key, path: null, url: null })
    setCrop(null)
    cropImage.current = null
    setPreviewUrl(null)
    setError(null)
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!isSupportedPhoto(file)) {
      setError("Please choose a JPG, PNG or HEIC photo.")
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("That photo is over 5 MB. Please choose a smaller one.")
      return
    }

    const prepared = await compressImageFile(file)
    const src = URL.createObjectURL(prepared)
    const image = new Image()
    image.onload = () => {
      if (cropImage.current?.src.startsWith("blob:")) URL.revokeObjectURL(cropImage.current.src)
      cropImage.current = image
      setCrop({ src, width: image.naturalWidth, height: image.naturalHeight, zoom: 1, x: 0, y: 0 })
      setDraft({ kind: "upload", key: null, path: null, url: src })
      setPreviewUrl(null)
    }
    image.onerror = () => {
      URL.revokeObjectURL(src)
      setError("We couldn't read that photo. Please choose a JPG, PNG or HEIC photo.")
    }
    image.src = src
  }

  function renderedSize(state: CropState, zoom = state.zoom) {
    const base = Math.max(CROP_STAGE / state.width, CROP_STAGE / state.height)
    return { width: state.width * base * zoom, height: state.height * base * zoom }
  }

  function setZoom(zoom: number) {
    setCrop((state) => {
      if (!state) return state
      const size = renderedSize(state, zoom)
      return {
        ...state,
        zoom,
        x: constrainOffset(state.x, size.width),
        y: constrainOffset(state.y, size.height),
      }
    })
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!crop) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: crop.x,
      y: crop.y,
    }
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!crop || !drag.current || drag.current.pointerId !== event.pointerId) return
    const size = renderedSize(crop)
    setCrop({
      ...crop,
      x: constrainOffset(drag.current.x + event.clientX - drag.current.startX, size.width),
      y: constrainOffset(drag.current.y + event.clientY - drag.current.startY, size.height),
    })
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
  }

  async function save() {
    if (!changed || saving) return
    setSaving(true)
    setError(null)
    let uploadedPath: string | null = null

    try {
      if (draft.kind === "upload" && crop && cropImage.current) {
        const canvas = drawCrop(cropImage.current, crop, 512)
        const blob = await canvasBlob(canvas)
        if (!blob) throw new Error("crop")
        uploadedPath = `${userId}/${Date.now()}.jpg`
        const db = createClient()
        const { error: uploadError } = await db.storage
          .from("avatars")
          .upload(uploadedPath, blob, { contentType: "image/jpeg", upsert: false })
        if (uploadError) throw uploadError
        const result = await updateProfileAvatar({ kind: "upload", path: uploadedPath })
        if (!result.ok) {
          await db.storage.from("avatars").remove([uploadedPath])
          throw new Error(result.error)
        }
        const localUrl = previewUrl ?? canvas.toDataURL("image/jpeg", 0.84)
        setAvatar({ kind: "upload", key: null, path: uploadedPath, url: localUrl })
      } else if (draft.kind === "animal" && draft.key) {
        const result = await updateProfileAvatar({ kind: "animal", key: draft.key })
        if (!result.ok) throw new Error(result.error)
        setAvatar({ kind: "animal", key: draft.key, path: null, url: null })
      } else if (draft.kind === null) {
        const result = await updateProfileAvatar({ kind: null })
        if (!result.ok) throw new Error(result.error)
        setAvatar({ kind: null, key: null, path: null, url: null })
      } else {
        throw new Error("invalid")
      }

      toast.success("Profile photo updated")
      onOpenChange(false)
      router.refresh()
    } catch {
      setError("We couldn't save your photo. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const cropSize = crop ? renderedSize(crop) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        manualPosition
        className="portal-v2 profile-photo-dialog"
        overlayClassName="profile-photo-overlay"
      >
        <span className="profile-photo-sheet-handle" aria-hidden />
        <header className="profile-photo-header">
          <DialogTitle>Choose your profile photo</DialogTitle>
          <DialogDescription>Pick a friendly animal or upload your own.</DialogDescription>
        </header>

        <div className="profile-photo-preview-row">
          <UserAvatar name={fullName} avatar={shownAvatar} size={72} animate />
          <div>
            <strong>{fullName}</strong>
            <span>Looks great!</span>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="profile-photo-tabs">
          <TabsList variant="line" aria-label="Profile photo source">
            <TabsTrigger value="animals">Animals</TabsTrigger>
            <TabsTrigger value="upload">Upload a photo</TabsTrigger>
          </TabsList>

          <TabsContent value="animals" className="profile-animals-panel">
            <div className="profile-animal-grid" role="radiogroup" aria-label="Choose an animal">
              {ANIMAL_AVATARS.map((animal, index) => {
                const selected = draft.kind === "animal" && draft.key === animal.key
                return (
                  <button
                    key={animal.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={animal.name}
                    className="profile-animal-option"
                    data-selected={selected}
                    style={{ "--avatar-delay": `${index * -0.31}s` } as CSSProperties}
                    onClick={() => selectAnimal(animal.key)}
                  >
                    <span>
                      <AnimalAvatar animal={animal.key} decorative />
                      {selected && <i aria-hidden><Check /></i>}
                    </span>
                    <small>{animal.name}</small>
                  </button>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="profile-upload-panel">
            {!crop ? (
              <div className="profile-photo-dropzone">
                <span className="profile-photo-upload-icon" aria-hidden><ImagePlus /></span>
                <strong>Upload your own photo</strong>
                <p>JPG, PNG or HEIC · up to 5 MB · we crop it to a circle</p>
                <div>
                  <Button type="button" onClick={() => chooseInput.current?.click()}>
                    <Upload /> Choose photo
                  </Button>
                  {touchDevice && (
                    <Button type="button" variant="outline" onClick={() => takeInput.current?.click()}>
                      <Smartphone /> Take photo
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="profile-photo-cropper-wrap">
                <div
                  className="profile-photo-cropper"
                  onPointerDown={pointerDown}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerUp}
                  onPointerCancel={pointerUp}
                  aria-label="Drag your photo to position the crop"
                >
                  {/* Blob URLs are local editor previews and cannot use Next Image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={crop.src}
                    alt="Photo crop preview"
                    draggable={false}
                    style={{
                      width: cropSize?.width,
                      height: cropSize?.height,
                      transform: `translate(-50%, -50%) translate(${crop.x}px, ${crop.y}px)`,
                    }}
                  />
                </div>
                <label className="profile-photo-zoom">
                  <ZoomIn aria-hidden />
                  <span className="sr-only">Zoom photo</span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={crop.zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                  />
                  <output>{crop.zoom.toFixed(1)}×</output>
                </label>
                <button type="button" className="profile-photo-different" onClick={() => chooseInput.current?.click()}>
                  Choose a different photo
                </button>
              </div>
            )}

            <input
              ref={chooseInput}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
              hidden
              onChange={(event) => {
                void chooseFile(event.currentTarget.files?.[0])
                event.currentTarget.value = ""
              }}
            />
            <input
              ref={takeInput}
              type="file"
              accept="image/*"
              capture="user"
              hidden
              onChange={(event) => {
                void chooseFile(event.currentTarget.files?.[0])
                event.currentTarget.value = ""
              }}
            />
          </TabsContent>
        </Tabs>

        {error && <p className="profile-photo-error" role="alert">{error}</p>}

        <footer className="profile-photo-footer">
          {hasPhoto ? (
            <button
              type="button"
              className="profile-photo-remove"
              onClick={() => {
                setDraft({ kind: null, key: null, path: null, url: null })
                setCrop(null)
                cropImage.current = null
                setPreviewUrl(null)
                setError(null)
              }}
            >
              Remove photo
            </button>
          ) : <span />}
          <div>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" disabled={!changed || saving} onClick={() => void save()}>
              {saving ? <><LoaderCircle className="animate-spin" /> Saving…</> : "Save photo"}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}

function drawCrop(image: HTMLImageElement, crop: CropState, size: number) {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")
  if (!context) return canvas
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, size, size)
  const base = Math.max(CROP_STAGE / crop.width, CROP_STAGE / crop.height)
  const ratio = size / CROP_STAGE
  const width = crop.width * base * crop.zoom * ratio
  const height = crop.height * base * crop.zoom * ratio
  context.drawImage(
    image,
    (size - width) / 2 + crop.x * ratio,
    (size - height) / 2 + crop.y * ratio,
    width,
    height
  )
  return canvas
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85))
}

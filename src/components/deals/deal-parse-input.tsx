import { useId, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { File as FileIcon, FileText, Image as ImageIcon, Loader2, Sparkles, Upload, X } from 'lucide-react'
import { Textarea } from '#/components/ui/textarea'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

const ACCEPTED_TYPES = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png'] as const
const ACCEPTED_TYPES_ATTR = ACCEPTED_TYPES.join(',')

export interface StagedAsset {
  id: string
  file: File
}

/** What actually goes to the parser once files are supported — text is all that's wired up today. */
export interface DealParsePayload {
  text: string
  files: Array<File>
}

interface DealParseInputProps {
  rawText: string
  onRawTextChange: (text: string) => void
  assets: Array<StagedAsset>
  onAssetsChange: (assets: Array<StagedAsset>) => void
  parsing: boolean
  parseError: string | null
  onParse: (payload: DealParsePayload) => void
  onSkipToManual: () => void
}

function fileIconFor(file: File) {
  if (file.type === 'application/pdf') return FileText
  if (file.type.startsWith('image/')) return ImageIcon
  return FileIcon
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DealParseInput({
  rawText,
  onRawTextChange,
  assets,
  onAssetsChange,
  parsing,
  parseError,
  onParse,
  onSkipToManual,
}: DealParseInputProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  function addFiles(fileList: FileList | Array<File>) {
    const accepted = Array.from(fileList).filter((file) => ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number]))
    if (accepted.length === 0) return
    const staged = accepted.map((file) => ({ id: `${file.name}-${file.size}-${file.lastModified}`, file }))
    onAssetsChange([...assets, ...staged])
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  function removeAsset(id: string) {
    onAssetsChange(assets.filter((asset) => asset.id !== id))
  }

  function handleParseClick() {
    onParse({ text: rawText, files: assets.map((asset) => asset.file) })
  }

  const canParse = !parsing && (rawText.trim().length > 0 || assets.length > 0)

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-input bg-transparent px-4 py-6 text-center transition-colors dark:bg-input/30',
          isDragOver && 'border-ring bg-accent/10',
        )}
      >
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag creative briefs or PDFs here, or <span className="font-medium text-foreground">click to upload</span>
        </p>
        <p className="text-xs text-muted-foreground/70">PDF, TXT, JPG, or PNG · multiple files supported</p>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          multiple
          accept={ACCEPTED_TYPES_ATTR}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {assets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assets.map((asset) => {
            const Icon = fileIconFor(asset.file)
            return (
              <div
                key={asset.id}
                className="flex items-center gap-1.5 rounded-full border border-input bg-transparent py-1 pr-1 pl-2.5 text-xs dark:bg-input/30"
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="max-w-40 truncate">{asset.file.name}</span>
                <span className="text-muted-foreground/70">{formatFileSize(asset.file.size)}</span>
                <button
                  type="button"
                  onClick={() => removeAsset(asset.id)}
                  aria-label={`Remove ${asset.file.name}`}
                  className="ml-0.5 flex size-4 items-center justify-center rounded-full text-[var(--urgency-red)] hover:bg-[var(--urgency-red)]/10"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Textarea
        value={rawText}
        onChange={(e) => onRawTextChange(e.target.value)}
        placeholder="Paste the brand's email, DM, or brief here..."
        rows={10}
      />

      {parseError && (
        <p className="rounded-lg bg-[var(--urgency-red)]/10 px-3 py-2 text-sm text-[var(--urgency-red)]">{parseError}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSkipToManual}>
          Skip to manual entry
        </Button>
        <Button
          type="button"
          onClick={handleParseClick}
          disabled={!canParse}
          className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
        >
          {parsing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {parsing ? 'Parsing...' : 'Parse with AI'}
        </Button>
      </div>
    </div>
  )
}

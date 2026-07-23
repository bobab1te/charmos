import { useEffect, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { BrandAvatar } from './brand-avatar'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']
const MAX_SIZE_BYTES = 2 * 1024 * 1024

interface BrandLogoUploadProps {
  brandName: string
  existingLogoUrl?: string
  file: File | null
  onFileChange: (file: File | null) => void
}

/** Stages a logo file for upload — the actual upload happens once the brand is resolved/created
 * on save (see saveDeal/savePartnership's brandLogoFile param), since a brand-new brand doesn't
 * have an id yet at the point this is used. */
export function BrandLogoUpload({ brandName, existingLogoUrl, file, onFileChange }: BrandLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(existingLogoUrl)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(existingLogoUrl)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, existingLogoUrl])

  function handleFile(selected: File | null) {
    setError(null)
    if (!selected) return
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError('Use a PNG, JPG, or SVG file.')
      return
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setError('Max size is 2MB.')
      return
    }
    onFileChange(selected)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Brand logo</Label>
      <div className="flex items-center gap-3">
        <BrandAvatar name={brandName || '?'} logoUrl={previewUrl} className="size-12 text-base" />
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              className="gap-1.5"
            >
              <Upload className="size-3.5" /> {previewUrl ? 'Replace' : 'Upload'}
            </Button>
            {file && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onFileChange(null)} className="gap-1">
                <X className="size-3.5" /> Cancel
              </Button>
            )}
          </div>
          <p className="text-xs text-[var(--charm-ink-soft)]">PNG, JPG, or SVG · up to 2MB</p>
          {error && <p className="text-xs text-[var(--urgency-red)]">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />
    </div>
  )
}

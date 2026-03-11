'use client'

import { useRef, useState, useCallback } from 'react'
import { UploadCloud, X, FileText, Image, File } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

export interface UploadedFile {
  storageKey: string
  originalName: string
  mimeType: string
  sizeBytes: number
  previewUrl: string
}

interface DropzoneProps {
  files: UploadedFile[]
  onFilesChange: (files: UploadedFile[]) => void
  uploading: boolean
  onUploadingChange: (v: boolean) => void
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType === 'application/pdf') return FileText
  return File
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export function Dropzone({ files, onFilesChange, uploading, onUploadingChange }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const uploadFile = useCallback(async (file: File) => {
    onUploadingChange(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/uploads/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.error) {
        toast({ title: json.error, variant: 'destructive' })
        return
      }
      onFilesChange([
        ...files,
        {
          storageKey: json.storageKey,
          originalName: file.name,
          mimeType: json.mimeType ?? file.type,
          sizeBytes: json.sizeBytes ?? file.size,
          previewUrl: json.url,
        },
      ])
    } catch {
      toast({ title: 'Dosya yüklenemedi.', variant: 'destructive' })
    } finally {
      onUploadingChange(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [files, onFilesChange, onUploadingChange])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  function removeFile(idx: number) {
    onFilesChange(files.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      {/* Drop area */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center gap-2
          border-2 border-dashed rounded-xl px-4 py-6 cursor-pointer
          transition-all duration-200
          ${dragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : uploading
              ? 'border-border bg-muted/30 cursor-wait'
              : 'border-border hover:border-primary/40 hover:bg-muted/20'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          onChange={handleChange}
          className="hidden"
        />
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${dragging ? 'bg-primary/10' : 'bg-muted'}`}>
          <UploadCloud className={`h-4 w-4 ${dragging ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="text-center">
          <p className="text-[13px] font-medium text-foreground">
            {uploading ? 'Yükleniyor...' : 'Dosya sürükle veya tıkla'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            PDF, JPG, PNG, DOCX — maks. 10 MB
          </p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f, idx) => {
            const Icon = fileIcon(f.mimeType)
            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 px-3 py-2 bg-white border rounded-xl group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{f.originalName}</p>
                  <p className="text-[11px] text-muted-foreground">{formatBytes(f.sizeBytes)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Upload, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react'
import {
  DuplicateResolutionModal,
  type DuplicateConflict,
  type DuplicateResolution,
} from './DuplicateResolutionModal'

interface CollectionDropZoneProps {
  collectionId: string
  children: React.ReactNode
}

type FileStatus = 'uploading' | 'done' | 'error' | 'skipped'

interface StatusEntry {
  name: string
  status: FileStatus
  error?: string
}

const ACCEPTED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/tiff': ['.tif', '.tiff'],
  'image/heic': ['.heic'],
  'image/webp': ['.webp'],
}

export function CollectionDropZone({ collectionId, children }: CollectionDropZoneProps) {
  const router = useRouter()
  const [isDragOver, setIsDragOver] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateConflict[]>([])
  const [statusEntries, setStatusEntries] = useState<StatusEntry[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const pendingFilesRef = useRef<File[]>([])

  const updateEntry = (name: string, patch: Partial<StatusEntry>) =>
    setStatusEntries((prev) =>
      prev.map((e) => (e.name === name ? { ...e, ...patch } : e))
    )

  const runUploads = useCallback(
    async (files: File[], resolutions: Record<string, DuplicateResolution>, duplicateMap: Record<string, string>) => {
      setIsUploading(true)

      const entries: StatusEntry[] = files.map((f) => ({
        name: f.name,
        status: resolutions[f.name] === 'skip' ? 'skipped' : 'uploading',
      }))
      setStatusEntries(entries)

      for (const file of files) {
        const resolution = resolutions[file.name] ?? 'new'
        if (resolution === 'skip') continue

        try {
          const form = new FormData()
          form.append('file', file)
          form.append('resolution', resolution)
          if (duplicateMap[file.name]) {
            form.append('existing_photo_id', duplicateMap[file.name])
          }

          const res = await fetch(`/api/collections/${collectionId}/photos`, {
            method: 'POST',
            body: form,
          })

          if (!res.ok) {
            const { error } = await res.json()
            updateEntry(file.name, { status: 'error', error: error ?? 'Upload failed' })
          } else {
            updateEntry(file.name, { status: 'done' })
          }
        } catch {
          updateEntry(file.name, { status: 'error', error: 'Network error' })
        }
      }

      setIsUploading(false)
      router.refresh()
    },
    [collectionId, router]
  )

  const onDrop = useCallback(
    async (accepted: File[]) => {
      setIsDragOver(false)
      if (accepted.length === 0) return

      try {
        const res = await fetch(`/api/collections/${collectionId}/check-duplicates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filenames: accepted.map((f) => f.name) }),
        })
        const data = await res.json()
        const found: DuplicateConflict[] = data.duplicates ?? []

        if (found.length > 0) {
          pendingFilesRef.current = accepted
          setDuplicates(found)
          setShowModal(true)
        } else {
          const resolutions = Object.fromEntries(accepted.map((f) => [f.name, 'new' as DuplicateResolution]))
          runUploads(accepted, resolutions, {})
        }
      } catch {
        const resolutions = Object.fromEntries(accepted.map((f) => [f.name, 'new' as DuplicateResolution]))
        runUploads(accepted, resolutions, {})
      }
    },
    [collectionId, runUploads]
  )

  const handleModalResolve = (resolutions: Record<string, DuplicateResolution>) => {
    setShowModal(false)
    const duplicateMap = Object.fromEntries(duplicates.map((d) => [d.filename, d.existing_photo_id]))
    runUploads(pendingFilesRef.current, resolutions, duplicateMap)
    pendingFilesRef.current = []
    setDuplicates([])
  }

  const handleModalCancel = () => {
    setShowModal(false)
    pendingFilesRef.current = []
    setDuplicates([])
  }

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
    accept: ACCEPTED,
    noClick: true,
    noKeyboard: true,
  })

  const allDone = statusEntries.length > 0 && !isUploading
  const doneCount = statusEntries.filter((e) => e.status === 'done').length
  const errorCount = statusEntries.filter((e) => e.status === 'error').length

  return (
    <>
      <DuplicateResolutionModal
        open={showModal}
        conflicts={duplicates}
        onResolve={handleModalResolve}
        onCancel={handleModalCancel}
      />

      <div {...getRootProps()} className="relative min-h-screen">
        <input {...getInputProps()} />

        {children}

        {/* Full-page drop overlay */}
        {isDragOver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-[2px] border-4 border-dashed border-primary pointer-events-none">
            <div className="flex flex-col items-center gap-3 text-primary">
              <Upload className="size-12" />
              <p className="text-xl font-semibold font-display">Drop to add to collection</p>
            </div>
          </div>
        )}

        {/* Floating upload status panel */}
        {statusEntries.length > 0 && (
          <div className="fixed bottom-6 right-6 z-40 w-72 rounded-xl border bg-background shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
              <span className="text-sm font-medium">
                {isUploading
                  ? `Uploading ${statusEntries.length} photo${statusEntries.length !== 1 ? 's' : ''}…`
                  : `${doneCount} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''}`}
              </span>
              {allDone && (
                <button
                  onClick={() => setStatusEntries([])}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto divide-y">
              {statusEntries.map((entry) => (
                <div key={entry.name} className="flex items-center gap-3 px-4 py-2">
                  <div className="shrink-0">
                    {entry.status === 'uploading' && <Loader2 className="size-3.5 animate-spin text-primary" />}
                    {entry.status === 'done' && <CheckCircle2 className="size-3.5 text-green-500" />}
                    {entry.status === 'error' && <AlertCircle className="size-3.5 text-destructive" />}
                    {entry.status === 'skipped' && <X className="size-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{entry.name}</p>
                    {entry.error && <p className="text-[10px] text-destructive">{entry.error}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {entry.status === 'done' && 'Done'}
                    {entry.status === 'error' && 'Failed'}
                    {entry.status === 'skipped' && 'Skipped'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

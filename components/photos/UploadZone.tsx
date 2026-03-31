'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DuplicateResolutionModal,
  type DuplicateConflict,
  type DuplicateResolution,
} from './DuplicateResolutionModal'

interface UploadZoneProps {
  collectionId: string
}

type FileStatus = 'pending' | 'uploading' | 'done' | 'error' | 'skipped'

interface QueueEntry {
  file: File
  status: FileStatus
  error?: string
  // duplicate resolution state
  resolution?: DuplicateResolution
  existingPhotoId?: string
}

const ACCEPTED = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/tiff': ['.tif', '.tiff'],
  'image/heic': ['.heic'],
  'image/webp': ['.webp'],
}

export function UploadZone({ collectionId }: UploadZoneProps) {
  const router = useRouter()
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [duplicates, setDuplicates] = useState<DuplicateConflict[]>([])
  const [showModal, setShowModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return

      // Check duplicates before showing queue
      try {
        const res = await fetch(`/api/collections/${collectionId}/check-duplicates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filenames: accepted.map((f) => f.name) }),
        })
        const data = await res.json()
        const found: DuplicateConflict[] = data.duplicates ?? []

        if (found.length > 0) {
          // Show modal — hold onto files until resolved
          setPendingFiles(accepted)
          setDuplicates(found)
          setShowModal(true)
        } else {
          // No duplicates — straight to queue
          enqueueFiles(accepted, {})
        }
      } catch {
        enqueueFiles(accepted, {})
      }
    },
    [collectionId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    disabled: isUploading,
  })

  function enqueueFiles(
    files: File[],
    resolutions: Record<string, DuplicateResolution>,
    duplicateMap: Record<string, string> = {}
  ) {
    const entries: QueueEntry[] = files.map((file) => ({
      file,
      status: 'pending',
      resolution: resolutions[file.name] ?? 'new',
      existingPhotoId: duplicateMap[file.name],
    }))
    setQueue((prev) => [...prev, ...entries])
  }

  function handleModalResolve(resolutions: Record<string, DuplicateResolution>) {
    setShowModal(false)
    const duplicateMap = Object.fromEntries(
      duplicates.map((d) => [d.filename, d.existing_photo_id])
    )
    enqueueFiles(pendingFiles, resolutions, duplicateMap)
    setPendingFiles([])
    setDuplicates([])
  }

  function handleModalCancel() {
    setShowModal(false)
    setPendingFiles([])
    setDuplicates([])
  }

  const updateEntry = (index: number, patch: Partial<QueueEntry>) =>
    setQueue((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)))

  async function startUpload() {
    if (isUploading) return
    setIsUploading(true)

    for (let i = 0; i < queue.length; i++) {
      const entry = queue[i]
      if (entry.status === 'done' || entry.status === 'skipped') continue

      // Handle skipped resolutions
      if (entry.resolution === 'skip') {
        updateEntry(i, { status: 'skipped' })
        continue
      }

      updateEntry(i, { status: 'uploading' })

      try {
        const form = new FormData()
        form.append('file', entry.file)
        form.append('resolution', entry.resolution ?? 'new')
        if (entry.existingPhotoId) {
          form.append('existing_photo_id', entry.existingPhotoId)
        }

        const res = await fetch(`/api/collections/${collectionId}/photos`, {
          method: 'POST',
          body: form,
        })

        if (!res.ok) {
          const { error } = await res.json()
          updateEntry(i, { status: 'error', error: error ?? 'Upload failed' })
        } else {
          updateEntry(i, { status: 'done' })
        }
      } catch {
        updateEntry(i, { status: 'error', error: 'Network error' })
      }
    }

    setIsUploading(false)
  }

  const pendingCount = queue.filter((e) => e.status === 'pending').length
  const doneCount = queue.filter((e) => e.status === 'done').length
  const errorCount = queue.filter((e) => e.status === 'error').length
  const allDone = queue.length > 0 && queue.every((e) => e.status !== 'pending' && e.status !== 'uploading')

  return (
    <>
      <DuplicateResolutionModal
        open={showModal}
        conflicts={duplicates}
        onResolve={handleModalResolve}
        onCancel={handleModalCancel}
      />

      <div className="space-y-6">
        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={[
            'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 text-center transition-colors cursor-pointer select-none',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
            isUploading ? 'pointer-events-none opacity-50' : '',
          ].join(' ')}
        >
          <input {...getInputProps()} />
          <div className="rounded-full bg-muted p-5 mb-4">
            <Upload className="size-8 text-muted-foreground" />
          </div>
          <p className="text-base font-medium">
            {isDragActive ? 'Drop photos here' : 'Drag photos here'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
          <p className="text-xs text-muted-foreground mt-3">
            JPG, PNG, TIFF, HEIC, WebP
          </p>
        </div>

        {/* Upload queue */}
        {queue.length > 0 && (
          <div className="rounded-xl border divide-y overflow-hidden">
            {queue.map((entry, i) => (
              <QueueRow key={`${entry.file.name}-${i}`} entry={entry} />
            ))}
          </div>
        )}

        {/* Actions */}
        {queue.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isUploading
                ? `Uploading... (${doneCount} / ${queue.length})`
                : allDone
                ? `${doneCount} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''}`
                : `${queue.length} file${queue.length !== 1 ? 's' : ''} queued`}
            </p>

            <div className="flex gap-2">
              {allDone ? (
                <Button onClick={() => { router.refresh(); router.push(`/collections/${collectionId}`) }}>
                  View collection →
                </Button>
              ) : (
                <Button
                  onClick={startUpload}
                  disabled={isUploading || pendingCount === 0}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="size-4 mr-2" />
                      Upload {pendingCount} photo{pendingCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function QueueRow({ entry }: { entry: QueueEntry }) {
  const sizeKb = Math.round(entry.file.size / 1024)

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-background">
      {/* Status icon */}
      <div className="shrink-0 w-5 flex justify-center">
        {entry.status === 'uploading' && (
          <Loader2 className="size-4 animate-spin text-primary" />
        )}
        {entry.status === 'done' && (
          <CheckCircle2 className="size-4 text-green-500" />
        )}
        {entry.status === 'error' && (
          <AlertCircle className="size-4 text-destructive" />
        )}
        {entry.status === 'skipped' && (
          <X className="size-4 text-muted-foreground" />
        )}
        {entry.status === 'pending' && (
          <div className="size-2 rounded-full bg-muted-foreground/40 m-1" />
        )}
      </div>

      {/* Filename + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{entry.file.name}</p>
        <p className="text-xs text-muted-foreground">
          {sizeKb < 1024
            ? `${sizeKb} KB`
            : `${(sizeKb / 1024).toFixed(1)} MB`}
          {entry.resolution === 'skip' && ' · Skipping'}
          {entry.resolution === 'replace' && entry.status === 'pending' && ' · Will replace existing'}
          {entry.resolution === 'keep_both' && entry.status === 'pending' && ' · Will keep both'}
          {entry.error && ` · ${entry.error}`}
        </p>
      </div>

      {/* Progress bar while uploading */}
      {entry.status === 'uploading' && (
        <div className="w-24 h-1.5 shrink-0 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/2 bg-primary rounded-full animate-slide" />
        </div>
      )}

      {/* Status label */}
      <div className="shrink-0 text-xs text-muted-foreground w-14 text-right">
        {entry.status === 'done' && 'Done'}
        {entry.status === 'error' && 'Failed'}
        {entry.status === 'skipped' && 'Skipped'}
        {entry.status === 'uploading' && 'Uploading'}
      </div>
    </div>
  )
}

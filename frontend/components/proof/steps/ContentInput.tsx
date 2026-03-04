'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import type { ProofType } from '@/types'

interface ContentInputProps {
  proofType: ProofType
  files: File[]
  onFilesChange: (files: File[]) => void
  url: string
  onUrlChange: (url: string) => void
  description: string
  onDescriptionChange: (desc: string) => void
}

export function ContentInput({
  proofType,
  files,
  onFilesChange,
  url,
  onUrlChange,
  description,
  onDescriptionChange,
}: ContentInputProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      onFilesChange([...files, ...accepted])
    },
    [files, onFilesChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 50 * 1024 * 1024, // 50 MB
  })

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Add Content</h3>

      {/* File upload zone */}
      {(proofType === 'file' || proofType === 'url') && proofType === 'file' && (
        <div>
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragActive ? 'border-teal bg-teal/5' : 'border-white/20 hover:border-white/40'
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-sm text-text-muted">
              {isDragActive
                ? 'Drop files here…'
                : 'Drag & drop files, or click to browse'}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Images, videos, PDFs — up to 50 MB each
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-background px-3 py-2"
                >
                  <span className="truncate text-sm">{file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      onClick={() => onFilesChange(files.filter((_, idx) => idx !== i))}
                      className="text-text-muted hover:text-red"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* URL input */}
      {proofType === 'url' && (
        <div>
          <label className="mb-1 block text-sm font-medium">Source URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://example.com/article…"
            className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-teal focus:outline-none"
          />
        </div>
      )}

      {/* Description / testimony */}
      <div>
        <label className="mb-1 block text-sm font-medium">
          {proofType === 'testimony' ? 'Testimony' : 'Description'}
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={
            proofType === 'testimony'
              ? 'Describe what you witnessed or your expert analysis…'
              : 'Brief description of this evidence…'
          }
          rows={proofType === 'testimony' ? 6 : 3}
          className="w-full resize-none rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-teal focus:outline-none"
        />
      </div>
    </div>
  )
}

import { useCallback, useRef, useState } from "react";

import { api } from "@lyra-mvp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function DocumentUploader({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.createDocument);

  const uploadFile = useCallback(
    async (file: File) => {
      setErrorMessage(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setErrorMessage("Invalid file type. Please select a PDF, PNG, or JPG file.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage("File is too large. Maximum size is 20MB.");
        return;
      }

      setIsUploading(true);

      try {
        const uploadUrl = await generateUploadUrl();

        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!response.ok) {
          throw new Error("Failed to upload file to storage");
        }

        const { storageId } = await response.json();

        await createDocument({
          storageId,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        });

        toast.success(`${file.name} uploaded`);
        onUploadComplete?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setErrorMessage(`${message}. Please try again.`);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [generateUploadUrl, createDocument, onUploadComplete],
  );

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
    }
  }

  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileSelect}
        className="sr-only"
        aria-label="Select document file"
        disabled={isUploading}
      />

      <button
        type="button"
        onClick={triggerFileInput}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={isUploading}
        className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-6 py-8 transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
        } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
        aria-label="Drop file here or click to select"
      >
        {isUploading ? (
          <>
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <span className="mt-2 text-sm text-muted-foreground">Uploading…</span>
          </>
        ) : (
          <>
            <Upload className="size-8 text-muted-foreground" />
            <span className="mt-2 text-sm font-medium">Drop file here or click to select</span>
            <span className="mt-1 text-xs text-muted-foreground">PDF, PNG, JPG up to 20MB</span>
          </>
        )}
      </button>

      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <div aria-live="polite" className="sr-only">
        {isUploading && "Uploading document…"}
      </div>
    </div>
  );
}

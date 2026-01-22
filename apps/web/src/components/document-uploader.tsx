import { useRef, useState } from "react";

import { api } from "@lyra-mvp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

type UploadStatus = "idle" | "uploading" | "success" | "error";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUploader({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const createDocument = useMutation(api.documents.createDocument);

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setErrorMessage(null);
    setStatus("idle");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMessage("Invalid file type. Please select a PDF, PNG, or JPG file.");
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("File is too large. Maximum size is 10MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  }

  function clearSelection() {
    setSelectedFile(null);
    setErrorMessage(null);
    setStatus("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setStatus("uploading");
    setErrorMessage(null);

    try {
      const uploadUrl = await generateUploadUrl();

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const { storageId } = await response.json();

      await createDocument({
        storageId,
        filename: selectedFile.name,
        contentType: selectedFile.type,
        sizeBytes: selectedFile.size,
      });

      setStatus("success");
      toast.success("Document uploaded successfully");
      onUploadComplete?.();
      clearSelection();
    } catch (error) {
      setStatus("error");
      const message = error instanceof Error ? error.message : "Upload failed";
      setErrorMessage(`${message}. Please try again.`);
    }
  }

  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileSelect}
        className="sr-only"
        aria-label="Select document file"
      />

      <Button type="button" variant="outline" onClick={triggerFileInput}>
        <Upload data-icon="inline-start" />
        Select File
      </Button>

      {selectedFile && (
        <div className="flex items-center gap-3 rounded border border-border bg-muted/50 p-3">
          <FileText className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)} · {selectedFile.type.split("/")[1].toUpperCase()}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={clearSelection}
            aria-label="Remove selected file"
          >
            <X />
          </Button>
        </div>
      )}

      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      <div aria-live="polite" className="sr-only">
        {status === "uploading" && "Uploading document…"}
        {status === "success" && "Document uploaded successfully"}
        {status === "error" && errorMessage}
      </div>

      {selectedFile && (
        <Button
          type="button"
          onClick={handleUpload}
          disabled={status === "uploading"}
          className="w-full"
        >
          {status === "uploading" ? (
            <>
              <Loader2 className="animate-spin" data-icon="inline-start" />
              Uploading…
            </>
          ) : (
            "Upload Document"
          )}
        </Button>
      )}
    </div>
  );
}

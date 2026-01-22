import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown, ChevronRight, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@lyra-mvp/backend/convex/_generated/api";
import type { Id } from "@lyra-mvp/backend/convex/_generated/dataModel";

import InsuranceReport from "@/components/insurance-report";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type DocumentStatus = "uploaded" | "queued" | "processing" | "complete" | "error";

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string }> = {
  uploaded: {
    label: "Uploaded",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  queued: {
    label: "Queued",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  complete: {
    label: "Complete",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  error: {
    label: "Error",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

function StatusBadge({ status }: { status: DocumentStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
      <p className="mt-1 text-xs text-muted-foreground">Upload a document to get started</p>
    </div>
  );
}

function DocumentAnalyses({ documentId }: { documentId: Id<"documents"> }) {
  const analyses = useQuery(api.analyses.listAnalyses, { documentId });

  if (analyses === undefined) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (analyses.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No analyses yet. Click "Run Lyra" to start.
      </p>
    );
  }

  const latestAnalysis = analyses[0];

  return <InsuranceReport analysisId={latestAnalysis._id} />;
}

interface DocumentWithUrl {
  _id: Id<"documents">;
  _creationTime: number;
  practiceId: Id<"practices">;
  storageId: Id<"_storage">;
  filename: string;
  contentType: string;
  sizeBytes: number;
  status: DocumentStatus;
  uploadedBy: string;
  createdAt: number;
  updatedAt: number;
  url: string | null;
}

export default function DocumentsList() {
  const documents = useQuery(api.documents.listDocuments) as DocumentWithUrl[] | undefined;
  const runLyra = useMutation(api.analyses.runLyra);
  const deleteDocument = useMutation(api.documents.deleteDocument);
  const [expandedDoc, setExpandedDoc] = useState<Id<"documents"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"documents"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: Id<"documents">; filename: string } | null>(
    null,
  );

  async function handleRunLyra(e: React.MouseEvent, documentId: Id<"documents">) {
    e.stopPropagation();
    try {
      await runLyra({ documentId });
      toast.success("Analysis started");
      setExpandedDoc(documentId);
    } catch {
      toast.error("Failed to start analysis");
    }
  }

  function openDeleteDialog(e: React.MouseEvent, id: Id<"documents">, filename: string) {
    e.stopPropagation();
    setDeleteTarget({ id, filename });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setDeleteTarget(null);
    try {
      await deleteDocument({ documentId: deleteTarget.id });
      toast.success("Document deleted");
      if (expandedDoc === deleteTarget.id) {
        setExpandedDoc(null);
      }
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  }

  function toggleExpand(documentId: Id<"documents">) {
    setExpandedDoc((prev) => (prev === documentId ? null : documentId));
  }

  if (documents === undefined) {
    return <LoadingSkeleton />;
  }

  if (documents.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="space-y-2">
        {documents.map((doc) => {
        const isExpanded = expandedDoc === doc._id;
        const isProcessing = doc.status === "queued" || doc.status === "processing";
        const canRunLyra = doc.status === "uploaded" || doc.status === "error";
        const hasAnalysis =
          doc.status === "complete" || doc.status === "processing" || doc.status === "queued";

        return (
          <div key={doc._id} className="overflow-hidden rounded-sm border">
            <div
              onClick={() => hasAnalysis && toggleExpand(doc._id)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && hasAnalysis) {
                  e.preventDefault();
                  toggleExpand(doc._id);
                }
              }}
              tabIndex={hasAnalysis ? 0 : undefined}
              role={hasAnalysis ? "button" : undefined}
              aria-expanded={hasAnalysis ? isExpanded : undefined}
              className={`flex items-center gap-3 px-3 py-2 ${hasAnalysis ? "cursor-pointer hover:bg-muted/50" : ""}`}
            >
              {hasAnalysis ? (
                isExpanded ? (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )
              ) : (
                <div className="size-4 shrink-0" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{doc.filename}</span>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Open document"
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(doc.createdAt)}</span>
                  <span>·</span>
                  <span className="tabular-nums">{formatFileSize(doc.sizeBytes)}</span>
                </div>
              </div>

              <StatusBadge status={doc.status} />

              <Button
                size="xs"
                variant="outline"
                disabled={!canRunLyra || isProcessing}
                onClick={(e) => handleRunLyra(e, doc._id)}
              >
                {isProcessing ? "Running…" : "Run Lyra"}
              </Button>

              <Button
                size="icon-xs"
                variant="ghost"
                disabled={isProcessing || deletingId === doc._id}
                onClick={(e) => openDeleteDialog(e, doc._id, doc.filename)}
                aria-label={`Delete ${doc.filename}`}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>

            {isExpanded && (
              <div className="border-t bg-muted/30 p-4">
                <DocumentAnalyses documentId={doc._id} />
              </div>
            )}
          </div>
        );
      })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogBackdrop />
        <AlertDialogPopup>
          <AlertDialogTitle>Delete document?</AlertDialogTitle>
          <AlertDialogDescription>
            "{deleteTarget?.filename}" and any associated analyses will be permanently deleted.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}

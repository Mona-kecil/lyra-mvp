import type { Id } from "@lyra-mvp/backend/convex/_generated/dataModel";

import { api } from "@lyra-mvp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AnalysisReportProps {
  analysisId: Id<"analyses">;
}

type AnalysisStatus = "queued" | "processing" | "complete" | "error";

interface Finding {
  category: string;
  confidence: number;
}

interface Report {
  summary: string;
  findings: Finding[];
  extractedText: string;
  processedAt: string;
}

export function AnalysisStatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
    queued: {
      className: "bg-muted text-muted-foreground",
      icon: <Clock className="size-3" />,
      label: "Queued",
    },
    processing: {
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      icon: <Loader2 className="size-3 animate-spin" />,
      label: "Processing",
    },
    complete: {
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      icon: <CheckCircle2 className="size-3" />,
      label: "Complete",
    },
    error: {
      className: "bg-destructive/10 text-destructive",
      icon: <AlertCircle className="size-3" />,
      label: "Error",
    },
  };

  const { className, icon, label } = config[status] ?? config.queued;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

function ProcessingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Loader2 className="text-muted-foreground size-8 animate-spin" />
      <p className="text-muted-foreground text-sm">Analyzing document…</p>
    </div>
  );
}

function QueuedState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Clock className="text-muted-foreground size-8" />
      <p className="text-muted-foreground text-sm">Analysis queued…</p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
  isRetrying,
}: {
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <AlertCircle className="text-destructive size-8" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Analysis failed</p>
        <p className="text-muted-foreground text-xs">{message ?? "An unexpected error occurred"}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <RefreshCw data-icon="inline-start" />
          )}
          Retry Analysis
        </Button>
      )}
    </div>
  );
}

function FindingsTable({ findings }: { findings: Finding[] }) {
  return (
    <div className="overflow-hidden rounded-sm border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="px-3 py-2 text-left font-medium">Category</th>
            <th className="px-3 py-2 text-right font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((finding, index) => (
            <tr key={index} className="border-b last:border-0">
              <td className="px-3 py-2">{finding.category}</td>
              <td className="tabular-nums px-3 py-2 text-right">
                {(finding.confidence * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompleteReport({ report }: { report: Report }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-medium">Summary</h3>
        <p className="text-muted-foreground text-sm">{report.summary}</p>
      </section>

      {report.findings.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium">Findings</h3>
          <FindingsTable findings={report.findings} />
        </section>
      )}

      {report.extractedText && (
        <section>
          <h3 className="mb-2 text-sm font-medium">Extracted Text</h3>
          <div className="bg-muted/30 rounded-sm border p-3">
            <pre className="text-muted-foreground whitespace-pre-wrap text-xs leading-relaxed">
              {report.extractedText}
            </pre>
          </div>
        </section>
      )}

      <p className="text-muted-foreground tabular-nums text-xs">
        Processed at {new Date(report.processedAt).toLocaleString()}
      </p>
    </div>
  );
}

export default function AnalysisReport({ analysisId }: AnalysisReportProps) {
  const analysis = useQuery(api.analyses.getAnalysis, { analysisId });
  const runLyra = useMutation(api.analyses.runLyra);

  const handleRetry = async () => {
    if (analysis?.documentId) {
      await runLyra({ documentId: analysis.documentId });
    }
  };

  if (analysis === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analysis Report</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportSkeleton />
        </CardContent>
      </Card>
    );
  }

  const status = analysis.status as AnalysisStatus;
  const report = analysis.report as Report | undefined;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Analysis Report</CardTitle>
        <AnalysisStatusBadge status={status} />
      </CardHeader>
      <CardContent>
        {status === "queued" && <QueuedState />}
        {status === "processing" && <ProcessingState />}
        {status === "error" && <ErrorState message={analysis.errorMessage} onRetry={handleRetry} />}
        {status === "complete" && report && <CompleteReport report={report} />}
      </CardContent>
    </Card>
  );
}

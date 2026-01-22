import type { Id } from "@lyra-mvp/backend/convex/_generated/dataModel";

import { api } from "@lyra-mvp/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface InsuranceReportProps {
  analysisId: Id<"analyses">;
}

type AnalysisStatus = "queued" | "processing" | "complete" | "error";

interface KeyValueItem {
  label: string;
  value: string | undefined | null;
  subValue?: string;
}

interface CopayItem {
  service: string;
  amount: string;
  notes?: string;
}

interface CoinsuranceItem {
  service: string;
  inNetwork?: string;
  outOfNetwork?: string;
}

interface CoverageCategory {
  category: string;
  items: Array<{
    service: string;
    coverage: string;
    limitations?: string;
    priorAuth?: boolean;
  }>;
}

interface DrugTier {
  tier: string;
  copay?: string;
  coinsurance?: string;
}

interface ExtractedField {
  fieldName: string;
  fieldValue: string;
  category?: string;
  confidence: "high" | "medium" | "low";
}

interface InsurancePlanReport {
  planOverview: {
    planName: string;
    carrier: string;
    planType: string;
    effectiveDate?: string;
    groupNumber?: string;
  };
  costSharing: {
    deductible: {
      individual?: string;
      family?: string;
      inNetwork?: string;
      outOfNetwork?: string;
    };
    outOfPocketMax: {
      individual?: string;
      family?: string;
      inNetwork?: string;
      outOfNetwork?: string;
    };
    copays: CopayItem[];
    coinsurance: CoinsuranceItem[];
  };
  coverageDetails: CoverageCategory[];
  prescriptionDrug?: {
    tiers?: DrugTier[];
    deductible?: string;
    mailOrder?: string;
  };
  additionalBenefits?: Array<{
    benefit: string;
    details: string;
  }>;
  importantNotes: string[];
  extractedFields: ExtractedField[];
  documentQuality: {
    isReadable: boolean;
    imageQuality: "good" | "fair" | "poor";
    missingInfo?: string[];
    suggestedActions?: string[];
  };
}

function KeyValueGrid({ items, columns = 2 }: { items: KeyValueItem[]; columns?: 2 | 3 | 4 }) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <dl className={cn("grid gap-4", gridCols[columns])}>
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="text-sm font-medium">{item.value || "—"}</dd>
          {item.subValue && <dd className="text-xs text-muted-foreground">{item.subValue}</dd>}
        </div>
      ))}
    </dl>
  );
}

function DataTable<T extends object>({
  data,
  columns,
}: {
  data: T[];
  columns: Array<{ key: keyof T; label: string; className?: string }>;
}) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No data available</p>;

  return (
    <div className="overflow-hidden rounded-sm border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn("px-3 py-2 text-left font-medium", col.className)}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              {columns.map((col) => (
                <td key={String(col.key)} className={cn("px-3 py-2", col.className)}>
                  {String(row[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const config = {
    high: {
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      label: "High",
    },
    medium: {
      className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      label: "Medium",
    },
    low: {
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      label: "Low",
    },
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-sm px-1.5 py-0.5 text-xs font-medium",
        config[confidence].className,
      )}
    >
      {config[confidence].label}
    </span>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

function PlanOverviewSection({ data }: { data: InsurancePlanReport["planOverview"] }) {
  return (
    <Section title="Plan Overview" icon={Shield}>
      <KeyValueGrid
        items={[
          { label: "Plan Name", value: data.planName },
          { label: "Carrier", value: data.carrier },
          { label: "Plan Type", value: data.planType },
          { label: "Effective Date", value: data.effectiveDate },
          { label: "Group Number", value: data.groupNumber },
        ]}
      />
    </Section>
  );
}

function CostSharingSection({ data }: { data: InsurancePlanReport["costSharing"] }) {
  return (
    <Section title="Cost Sharing" icon={DollarSign}>
      <div className="space-y-4">
        <div>
          <h4 className="mb-2 text-xs font-medium text-muted-foreground">Deductible</h4>
          <KeyValueGrid
            columns={4}
            items={[
              { label: "Individual", value: data.deductible.individual },
              { label: "Family", value: data.deductible.family },
              { label: "In-Network", value: data.deductible.inNetwork },
              { label: "Out-of-Network", value: data.deductible.outOfNetwork },
            ]}
          />
        </div>

        <div>
          <h4 className="mb-2 text-xs font-medium text-muted-foreground">Out-of-Pocket Maximum</h4>
          <KeyValueGrid
            columns={4}
            items={[
              { label: "Individual", value: data.outOfPocketMax.individual },
              { label: "Family", value: data.outOfPocketMax.family },
              { label: "In-Network", value: data.outOfPocketMax.inNetwork },
              { label: "Out-of-Network", value: data.outOfPocketMax.outOfNetwork },
            ]}
          />
        </div>

        {data.copays.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">Copays</h4>
            <DataTable
              data={data.copays}
              columns={[
                { key: "service", label: "Service" },
                { key: "amount", label: "Amount", className: "tabular-nums" },
                { key: "notes", label: "Notes" },
              ]}
            />
          </div>
        )}

        {data.coinsurance.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">Coinsurance</h4>
            <DataTable
              data={data.coinsurance}
              columns={[
                { key: "service", label: "Service" },
                { key: "inNetwork", label: "In-Network", className: "tabular-nums" },
                { key: "outOfNetwork", label: "Out-of-Network", className: "tabular-nums" },
              ]}
            />
          </div>
        )}
      </div>
    </Section>
  );
}

function CoverageDetailsSection({ data }: { data: InsurancePlanReport["coverageDetails"] }) {
  if (data.length === 0) return null;

  return (
    <Section title="Coverage Details" icon={FileText}>
      <div className="space-y-4">
        {data.map((category) => (
          <div key={category.category}>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">{category.category}</h4>
            <div className="overflow-hidden rounded-sm border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Service</th>
                    <th className="px-3 py-2 text-left font-medium">Coverage</th>
                    <th className="px-3 py-2 text-left font-medium">Limitations</th>
                    <th className="px-3 py-2 text-center font-medium">Prior Auth</th>
                  </tr>
                </thead>
                <tbody>
                  {category.items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">{item.service}</td>
                      <td className="px-3 py-2">{item.coverage}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.limitations || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        {item.priorAuth ? (
                          <span className="text-yellow-600">Required</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function PrescriptionDrugSection({ data }: { data: InsurancePlanReport["prescriptionDrug"] }) {
  if (!data) return null;

  return (
    <Section title="Prescription Drug Coverage">
      <div className="space-y-4">
        {data.deductible && (
          <div>
            <span className="text-xs text-muted-foreground">Rx Deductible:</span>{" "}
            <span className="text-sm font-medium">{data.deductible}</span>
          </div>
        )}

        {data.tiers && data.tiers.length > 0 && (
          <DataTable
            data={data.tiers}
            columns={[
              { key: "tier", label: "Tier" },
              { key: "copay", label: "Copay", className: "tabular-nums" },
              { key: "coinsurance", label: "Coinsurance", className: "tabular-nums" },
            ]}
          />
        )}

        {data.mailOrder && (
          <div>
            <span className="text-xs text-muted-foreground">Mail Order:</span>{" "}
            <span className="text-sm">{data.mailOrder}</span>
          </div>
        )}
      </div>
    </Section>
  );
}

function ExtractedFieldsSection({ data }: { data: InsurancePlanReport["extractedFields"] }) {
  if (data.length === 0) return null;

  const grouped = data.reduce(
    (acc, field) => {
      const category = field.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(field);
      return acc;
    },
    {} as Record<string, ExtractedField[]>,
  );

  return (
    <Section title="Additional Extracted Data" icon={Info}>
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, fields]) => (
          <div key={category}>
            <h4 className="mb-2 text-xs font-medium text-muted-foreground">{category}</h4>
            <div className="overflow-hidden rounded-sm border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Field</th>
                    <th className="px-3 py-2 text-left font-medium">Value</th>
                    <th className="px-3 py-2 text-right font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">{field.fieldName}</td>
                      <td className="px-3 py-2">{field.fieldValue}</td>
                      <td className="px-3 py-2 text-right">
                        <ConfidenceBadge confidence={field.confidence} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function DocumentQualitySection({ data }: { data: InsurancePlanReport["documentQuality"] }) {
  return (
    <Section title="Document Quality" icon={AlertTriangle}>
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {data.isReadable ? (
              <CheckCircle2 className="size-4 text-green-500" />
            ) : (
              <AlertCircle className="size-4 text-red-500" />
            )}
            <span className="text-sm">
              {data.isReadable ? "Document readable" : "Document not readable"}
            </span>
          </div>
          <div className="text-sm">
            Image quality:{" "}
            <span
              className={cn(
                "font-medium",
                data.imageQuality === "good" && "text-green-600",
                data.imageQuality === "fair" && "text-yellow-600",
                data.imageQuality === "poor" && "text-red-600",
              )}
            >
              {data.imageQuality}
            </span>
          </div>
        </div>

        {data.missingInfo && data.missingInfo.length > 0 && (
          <div>
            <h4 className="mb-1 text-xs font-medium text-muted-foreground">Missing Information</h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {data.missingInfo.map((info, i) => (
                <li key={i}>{info}</li>
              ))}
            </ul>
          </div>
        )}

        {data.suggestedActions && data.suggestedActions.length > 0 && (
          <div>
            <h4 className="mb-1 text-xs font-medium text-muted-foreground">Suggested Actions</h4>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {data.suggestedActions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}

function ImportantNotesSection({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;

  return (
    <Section title="Important Notes" icon={AlertCircle}>
      <ul className="space-y-2">
        {notes.map((note, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="text-yellow-500">•</span>
            {note}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ReportContent({ report }: { report: InsurancePlanReport }) {
  return (
    <div className="space-y-6">
      <PlanOverviewSection data={report.planOverview} />
      <CostSharingSection data={report.costSharing} />
      <CoverageDetailsSection data={report.coverageDetails} />
      <PrescriptionDrugSection data={report.prescriptionDrug} />

      {report.additionalBenefits && report.additionalBenefits.length > 0 && (
        <Section title="Additional Benefits">
          <div className="space-y-2">
            {report.additionalBenefits.map((benefit, i) => (
              <div key={i} className="rounded-sm border p-3">
                <h4 className="text-sm font-medium">{benefit.benefit}</h4>
                <p className="text-sm text-muted-foreground">{benefit.details}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <ImportantNotesSection notes={report.importantNotes} />
      <ExtractedFieldsSection data={report.extractedFields} />
      <DocumentQualitySection data={report.documentQuality} />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function ProcessingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <div>
        <p className="font-medium">Analyzing document…</p>
        <p className="text-sm text-muted-foreground">
          Lyra is extracting benefit information from your insurance plan
        </p>
      </div>
    </div>
  );
}

function QueuedState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Clock className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Analysis queued…</p>
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
      <AlertCircle className="size-8 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium">Analysis failed</p>
        <p className="text-sm text-muted-foreground">{message ?? "An unexpected error occurred"}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Retry Analysis
        </Button>
      )}
    </div>
  );
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

export default function InsuranceReport({ analysisId }: InsuranceReportProps) {
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
          <CardTitle>Insurance Plan Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingState />
        </CardContent>
      </Card>
    );
  }

  const status = analysis.status as AnalysisStatus;
  const report = analysis.report as InsurancePlanReport | undefined;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Insurance Plan Analysis</CardTitle>
        <AnalysisStatusBadge status={status} />
      </CardHeader>
      <CardContent>
        {status === "queued" && <QueuedState />}
        {status === "processing" && <ProcessingState />}
        {status === "error" && <ErrorState message={analysis.errorMessage} onRetry={handleRetry} />}
        {status === "complete" && report && <ReportContent report={report} />}
      </CardContent>
    </Card>
  );
}

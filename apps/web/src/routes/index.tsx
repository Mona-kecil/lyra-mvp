import { api } from "@lyra-mvp/backend/convex/_generated/api";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight, FileText, Sparkles, Clock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const healthCheck = useQuery(api.healthCheck.get);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <header className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Lyra</h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          Benefit intelligence platform for healthcare practices. Upload insurance plans, run AI
          analysis, and get structured insights.
        </p>
        <div className="mt-8">
          <Link to="/dashboard" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
            Get Started
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <div className="mb-12 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <FileText className="mb-2 size-8 text-muted-foreground" />
            <CardTitle className="text-lg">Upload Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload insurance plan PDFs and images securely to your practice&apos;s private
              storage.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Sparkles className="mb-2 size-8 text-muted-foreground" />
            <CardTitle className="text-lg">Run Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              One-click analysis extracts benefits, coverage details, and key information from your
              documents.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Clock className="mb-2 size-8 text-muted-foreground" />
            <CardTitle className="text-lg">View History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Access all your previous uploads and analysis reports in one organized dashboard.
            </p>
          </CardContent>
        </Card>
      </div>

      <footer className="text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>System Status:</span>
          <div
            className={`size-2 rounded-full ${
              healthCheck === "OK"
                ? "bg-green-500"
                : healthCheck === undefined
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
          />
          <span>
            {healthCheck === undefined ? "Checking…" : healthCheck === "OK" ? "Connected" : "Error"}
          </span>
        </div>
      </footer>
    </div>
  );
}

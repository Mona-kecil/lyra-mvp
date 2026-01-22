import { api } from "@lyra-mvp/backend/convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

import DocumentsList from "@/components/documents-list";
import DocumentUploader from "@/components/document-uploader";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import UserMenu from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

function DashboardContent() {
  const navigate = useNavigate();
  const practice = useQuery(api.practices.getCurrentPractice);
  const getOrCreatePractice = useMutation(api.practices.getOrCreatePractice);

  useEffect(() => {
    if (practice === null) {
      getOrCreatePractice();
    }
  }, [practice, getOrCreatePractice]);

  if (practice === undefined) {
    return (
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{practice?.name ?? "Dashboard"}</h1>
          <p className="text-sm text-muted-foreground">
            Upload insurance plans and run benefit intelligence analysis
          </p>
        </div>
        <UserMenu />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Upload an insurance plan document (PDF or image) to analyze
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploader />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>Your uploaded documents and analysis status</CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentsList />
        </CardContent>
      </Card>
    </div>
  );
}

function AuthScreen() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md">
        {showSignIn ? (
          <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
        ) : (
          <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
        )}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="mx-auto size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

function RouteComponent() {
  return (
    <>
      <Authenticated>
        <DashboardContent />
      </Authenticated>
      <Unauthenticated>
        <AuthScreen />
      </Unauthenticated>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
    </>
  );
}

import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-5" />
          <span>Lyra</span>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground"
          >
            Dashboard
          </Link>
          <ModeToggle />
        </nav>
      </div>
    </header>
  );
}

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Tag } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <Link to="/" className="flex items-center justify-center gap-2 text-foreground">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Tag className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
          </div>
          <span className="text-2xl font-black tracking-tight">GôndolaPro</span>
        </Link>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {children}
      </div>
    </div>
  );
}

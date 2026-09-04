import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { logClientSecurityEvent } from "@/lib/clientAudit";

interface LogoutButtonProps extends Omit<ButtonProps, "onClick" | "disabled"> {
  label?: string;
  redirectTo?: string;
  showIcon?: boolean;
}

export function LogoutButton({
  label = "Sair",
  redirectTo = "/login",
  showIcon = true,
  variant = "outline",
  size = "sm",
  type = "button",
  className,
  ...props
}: LogoutButtonProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await logClientSecurityEvent("user_signed_out", { source: "logout_button" });
      await signOut();
      toast.success("Você saiu da sua conta.");
      navigate(redirectTo, { replace: true });
    } catch {
      toast.error("Não foi possível sair da conta. Tente novamente.");
      setIsSigningOut(false);
    }
  };

  return (
    <Button
      {...props}
      type={type}
      variant={variant}
      size={size}
      className={className}
      disabled={isSigningOut}
      onClick={handleSignOut}
    >
      {isSigningOut ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : showIcon ? (
        <LogOut className="h-4 w-4" aria-hidden="true" />
      ) : null}
      <span>{isSigningOut ? "Saindo..." : label}</span>
    </Button>
  );
}

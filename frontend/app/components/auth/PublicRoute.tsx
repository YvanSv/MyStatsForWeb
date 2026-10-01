"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/authContext";
import { FRONT_ROUTES } from "@/app/constants/routes";
import { safeRedirectPath } from "@/app/services/redirect";

interface PublicRouteProps {
  children: React.ReactNode;
  skeleton: React.ReactNode;
}

export default function PublicRoute({ children, skeleton }: PublicRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Connecté -> retour à la page demandée avant la connexion (paramètre redirect, filtré), sinon page du compte
  useEffect(() => {
    if (!loading && user) {
      const target = safeRedirectPath(new URLSearchParams(window.location.search).get("redirect"));
      router.push(target ?? FRONT_ROUTES.ACCOUNT);
    }
  }, [user, loading, router]);

  if (loading) return <>{skeleton}</>;
  if (user) return null;
  return <>{children}</>;
}
"use client";

import { FRONT_ROUTES } from "@/app/constants/routes";
import { authUrlFor } from "@/app/services/redirect";
import { useAuth } from "@/app/context/authContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skeleton: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, skeleton, adminOnly = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // On garde aussi la query string d'origine (filtres, tri…) : lue ici, côté client uniquement
        router.push(authUrlFor(pathname + window.location.search));
      } 
      // Vérification supplémentaire pour l'admin
      else if (adminOnly && user.isAdmin !== true) {
        router.push(FRONT_ROUTES.ACCUEIL); 
      }
    }
  }, [user, loading, router, pathname, adminOnly]);

  if (loading) return <>{skeleton}</>;
  
  if (!user) return null;
  if (adminOnly && user.isAdmin !== true) return null;

  return <>{children}</>;
}
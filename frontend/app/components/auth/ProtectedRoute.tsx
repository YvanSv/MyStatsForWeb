"use client";

import { FRONT_ROUTES } from "@/app/constants/routes";
import { useAuth } from "@/app/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  skeleton: React.ReactNode;
}

export default function ProtectedRoute({ children, skeleton }:ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const searchParams = new URLSearchParams();
      searchParams.set("redirect", pathname);
      router.push(`${FRONT_ROUTES.AUTH}?${searchParams.toString()}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) return <>{skeleton}</>;
  if (!user) return null;
  return <>{children}</>;
}
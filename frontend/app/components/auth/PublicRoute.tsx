"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/authContext";

interface PublicRouteProps {
  children: React.ReactNode;
  skeleton: React.ReactNode;
}

export default function PublicRoute({ children, skeleton }: PublicRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // connecté -> redirection 
  useEffect(() => {
    if (!loading && user) router.push("/account");
  }, [user, loading, router]);

  if (loading) return <>{skeleton}</>;
  if (user) return null;
  return <>{children}</>;
}
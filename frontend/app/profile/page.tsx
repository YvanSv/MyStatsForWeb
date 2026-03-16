"use client";
import { useEffect } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { useRouter } from "next/navigation";
import { FRONT_ROUTES } from "@/app/constants/routes";
import { ProfileSkeleton } from "./[id]/Skeleton";

export default function DashboardPage() {
  const router = useRouter();
  const { isLoggedIn, user, loading } = useAuth();

  useEffect(() => {
    if (!loading)
      if (isLoggedIn && user?.id) router.push(`${FRONT_ROUTES.PROFILE}/${!user.slug || user.slug === "" ? user.id : user.slug}`);
      else router.push('/auth');
  }, [isLoggedIn, user, router, loading]);

  return <ProfileSkeleton/>;
}
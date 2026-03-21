"use client";
import { useEffect } from "react";
import { useAuth } from "@/app/context/authContext";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/app/components/small_elements/CustomSpinner";
import { FRONT_ROUTES } from "@/app/constants/routes";

export default function DashboardPage() {
  const router = useRouter();
  const { isLoggedIn, user, loading } = useAuth();

  useEffect(() => {
    if (!loading)
      if (isLoggedIn && user?.id) router.push(`${FRONT_ROUTES.DASHBOARD}/${!user.slug || user.slug === "" ? user.id : user.slug}`);
      else router.push('/auth');
  }, [isLoggedIn, user, router, loading]);

  return (
    <div className="mt-[20%] w-full flex items-center justify-center">
      <LoadingSpinner/>
    </div>
  );
}
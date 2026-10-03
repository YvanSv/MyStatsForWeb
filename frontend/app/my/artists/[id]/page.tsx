"use client";

import ProtectedRoute from "@/app/components/auth/ProtectedRoute";
import ItemDetailPage from "../../detail/ItemDetailPage";
import ItemDetailSkeleton from "../../detail/ItemDetailSkeleton";

export default function ArtistDetailPage() {
  return (
    <ProtectedRoute skeleton={<ItemDetailSkeleton/>}>
      <ItemDetailPage type="artist"/>
    </ProtectedRoute>
  );
}

"use client";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { LoadingSpinner } from "../components/small_elements/CustomSpinner";

// Ce layout s'applique à toutes les pages de /admin (accueil, conflits, merge-requests, create-requests et leurs [id]) :
// un non-admin est redirigé et les pages enfants ne sont même pas rendues, donc leurs appels API ne partent pas.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute skeleton={<LoadingSpinner className="p-16"/>} adminOnly={true}>
      {children}
    </ProtectedRoute>
  );
}

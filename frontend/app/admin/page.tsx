"use client";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { AlertTriangle, GitBranchPlus, GitPullRequest, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function AdminLayout() {
  return (
    <ProtectedRoute skeleton={<></>} adminOnly={true}>
      <AdminHomePage/>
    </ProtectedRoute>
  );
}

function AdminHomePage() {
  const adminModules = [
    {
      title: "Create Requests",
      description: "Gérer et valider les demandes de création de track.",
      href: "/admin/create-requests",
      icon: <GitBranchPlus className="w-6 h-6 text2" />,
      color: "hover:border-vert"
    },
    {
      title: "Merge Requests",
      description: "Gérer et valider les demandes de fusion de données.",
      href: "/admin/merge-requests",
      icon: <GitPullRequest className="w-6 h-6 text-blue-500" />,
      color: "hover:border-blue-500"
    },
    {
      title: "Conflits",
      description: "Résoudre les doublons et les incohérences détectés.",
      href: "/admin/conflits",
      icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
      color: "hover:border-amber-500"
    },
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* En-tête */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <LayoutDashboard className="w-8 h-8 text-gray-700"/>
            <h1 className="text-3xl font-bold">Administration</h1>
          </div>
          <p className="text3">
            Bienvenue dans votre interface de gestion. Sélectionnez un module pour commencer.
          </p>
        </header>

        {/* Grille de navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminModules.map((module) => (
            <Link 
              key={module.href} 
              href={module.href}
              className={`group p-6 bg-white/5 rounded-xl shadow-sm border-2 border-transparent transition-all duration-200 ${module.color} hover:shadow-md`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-bg2 rounded-lg group-hover:bg-opacity-80 transition-colors">
                  {module.icon}
                </div>
                <h2 className="text-xl font-semibold text-white uppercase tracking-wide">
                  {module.title}
                </h2>
              </div>
              <p className="text3 text-sm leading-relaxed">
                {module.description}
              </p>
              <div className="mt-4 text-sm font-medium text3 group-hover:text-vert flex items-center gap-1 transition-colors duration-300">
                Accéder au module <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
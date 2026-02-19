"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const navigate = (path: string) => router.push(path);
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [userName, setUserName] = useState("null");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/auth/me", {
          method: "GET",
          credentials: "include", 
        });

        if (response.ok) {
          const data = await response.json();
          if (data.is_logged_in) {
            setIsLoggedIn(true);
            setUserName(data.user_name);
          } else {
            setIsLoggedIn(false);
          }
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de l'auth:", error);
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {window.location.href = "http://127.0.0.1:8000/auth/login";};
  const handleLogout = () => {window.location.href = "http://127.0.0.1:8000/auth/logout";};

  if (loading) return <header className="h-20 bg-background" />;

  return (
    <header className="flex items-center justify-between py-4 px-6 sticky top-0 z-50 bg-bg1/60 backdrop-blur-xl border-b border-white/5">
      {/* Logo + Titre */}
      <div 
        className="flex items-center gap-4 cursor-pointer group"
        onClick={() => navigate("/")}
      >
        <Image src="/logo.png" alt="Logo" width={80} height={80} style={{ width: 80, height: 'auto' }} priority className="rounded-md transition-transform group-hover:scale-105"/>
        <span className="text-titre font-jost text-white tracking-tighter group-hover:text-vert transition-colors transition-transform group-hover:scale-105">MyStats</span>
      </div>

      {/* Navigation */}
      <nav className="hidden md:flex items-center gap-20 text-ss-titre font-jost font-semibold text-white">
        <button onClick={() => navigate("/musiques")} className="hover:text-vert transition-all cursor-pointer">
          Musiques
        </button>
        <button onClick={() => navigate("/albums")} className="hover:text-vert transition cursor-pointer">
          Albums
        </button>
        <button onClick={() => navigate("/artistes")} className="hover:text-vert transition cursor-pointer">
          Artistes
        </button>
        <button onClick={() => navigate("/historique")} className="hover:text-vert transition cursor-pointer">
          Historique
        </button>
      </nav>

      {/* Bouton de connexion */}
      {isLoggedIn ? (
        <button onClick={handleLogout} className="bg-bg2 px-4 py-2 rounded-full text-sm font-medium cursor-pointer hover:text-vert hover:scale-105 transition">
          Connecté en tant que <span className="font-bold">{userName}</span>
        </button>
      ) : (
        <button onClick={handleLogin} className="bg-vert px-4 py-2 rounded-full text-sm font-bold cursor-pointer text-black hover:scale-105 transition">
          Se connecter avec Spotify
        </button>
      )}
    </header>
  );
}
"use client";

export default function Home() {
  const handleLogin = () => {
    window.location.href = "http://127.0.0.1:8000/auth/login";
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-8">
        <h1 className="text-4xl font-bold text-white">MyStats Web</h1>
        <p className="text-gray-400 text-center">
          Visualisez vos habitudes d'écoute Spotify en temps réel.
        </p>
        
        <button
          onClick={handleLogin}
          className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-3 px-8 rounded-full transition-all duration-200"
        >
          Se connecter avec Spotify
        </button>
      </div>
    </main>
  );
}
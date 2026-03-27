import { Jost } from "next/font/google";
import "./globals.css";
import { ViewModeProvider } from "./context/viewModeContext";
import { ShowFiltersProvider } from "./context/showFiltersContext";
import { AuthProvider } from "./context/authContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "react-hot-toast";
import { SpotifyProvider } from "./context/currentlyPlayingContext";
import { LanguageProvider } from "./context/languageContext";

const jost = Jost({ 
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-jost",
});

export const metadata = {
  title: "MyStats - Votre musique, décryptée.",
  description: "Découvrez vos statistiques Spotify ! Venez analyser vos habitudes d'écoute.",
  openGraph: {
    title: "MyStats - Votre musique, décryptée.",
    description: "Découvrez vos statistiques Spotify ! Venez analyser vos habitudes d'écoute.",
    url: "https://mystatsfy.vercel.app/",
    siteName: "MyStats",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <LanguageProvider>  
          <ViewModeProvider>
            <ShowFiltersProvider>
              <AuthProvider>
                <SpotifyProvider>
                  <div className={`${jost.variable} flex flex-col h-screen overflow-hidden text1`}>
                    <Header/>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {/* div wrapper pour gérer la hauteur minimale */}
                      <div className="flex flex-col min-h-full">
                        {/* children prend tout l'espace restant (flex-grow) */}
                        <main className="flex-1 min-h-full">
                          {children}
                        </main>
                        <Footer />
                      </div>
                    </div>
                  </div>
                  <Toaster position="bottom-right" reverseOrder={false}/>
                  <SpeedInsights/>
                </SpotifyProvider>
              </AuthProvider>
            </ShowFiltersProvider>
          </ViewModeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
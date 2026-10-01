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
                  <div className={`${jost.variable} app-shell flex flex-col overflow-hidden text1`}>
                    <Header/>

                    <div className="flex-1 overflow-y-auto">
                      <div className="flex flex-col min-h-full">
                        {/* Chaque page fournit son propre <main> : pas de landmark imbriqué */}
                        <div className="flex-1 flex flex-col">
                          {children}
                        </div>
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
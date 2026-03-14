import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import { ViewModeProvider } from "./context/viewModeContext";
import { ShowFiltersProvider } from "./context/showFiltersContext";
import { AuthProvider } from "./context/authContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "react-hot-toast";

const jost = Jost({ 
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-jost",
});

export const metadata = {
  title: "MyStats",
  description: "Découvrez vos statistiques Spotify !",
  openGraph: {
    title: "MyStats",
    description: "Découvrez vos statistiques Spotify !",
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
        <ViewModeProvider>
          <ShowFiltersProvider>
            <AuthProvider>
              <div className={`${jost.variable} bg-bg1 flex flex-col min-h-screen overflow-x-hidden selection:bg-vert/30 selection:text-vert`}>
                <header className="fixed top-0 left-0 w-[100vw] z-[100] backdrop-blur-md">
                  <div className="w-full h-full">
                    <Header />
                  </div>
                </header>
                <div className="h-[47px] md:h-[65px] w-full" />
                <main className="flex-1 flex flex-col">
                  {children}
                  <Toaster position="bottom-right" reverseOrder={false}/>
                </main>
                <Footer />
                <SpeedInsights />
              </div>
            </AuthProvider>
          </ShowFiltersProvider>
        </ViewModeProvider>
      </body>
    </html>
  );
}
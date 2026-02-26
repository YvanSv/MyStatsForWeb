import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import { ViewModeProvider } from "./context/viewModeContext";
import { ShowFiltersProvider } from "./context/showFiltersContext";
import { AuthProvider } from "./context/authContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next";

const jost = Jost({ 
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-jost",
});

export const metadata: Metadata = {
  title: "MyStats for Web",
  description: "Visualisez vos stats Spotify",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ViewModeProvider>
          <ShowFiltersProvider>
            <AuthProvider>
              <div className={`${jost.variable} bg-bg1 flex flex-1 flex-col min-h-screen overflow-x-hidden font-jost selection:bg-vert/20 selection:text-vert`}>
                <Header />
                {children}
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
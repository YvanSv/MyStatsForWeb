import type { Metadata } from "next";
import { Jost } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ViewModeProvider } from "./context/viewModeContext";
import { ShowFiltersProvider } from "./context/showFiltersContext";
import Content from "./content";

const hHiasSans = localFont({
  src: "./fonts/Insanibc.ttf",
  variable: "--font-hias-sans",
});

const boldmarker = localFont({
  src: "./fonts/BoldMarker.ttf",
  variable: "--font-bold-marker",
});

const insanibu = localFont({
  src: "./fonts/Insanibc.ttf",
  variable: "--font-insanibu",
});

const insanibc = localFont({
  src: "./fonts/Insanibc.ttf",
  variable: "--font-insanibc",
});

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
      <body className={`${jost.variable} ${hHiasSans.variable} ${boldmarker.variable} ${insanibu.variable} ${insanibc.variable}flex bg-[#121212] min-h-screen`}>
        <ViewModeProvider>
          <ShowFiltersProvider>
            <Content children={children}/>
          </ShowFiltersProvider>
        </ViewModeProvider>
      </body>
    </html>
  );
}
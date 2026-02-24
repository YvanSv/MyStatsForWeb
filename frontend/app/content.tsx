"use client";
import { usePathname } from "next/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function Content({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProfilePage = pathname?.startsWith('/profile');
	return (
		<div className="flex-1 flex flex-col overflow-x-hidden">
			{!isProfilePage && (
			<div className="fixed inset-0 -z-10 pointer-events-none">
					<div className="absolute top-[20%] left-[-5%] h-[600px] w-[600px] animate-blob rounded-full bg-vert opacity-10 blur-[120px]" />
					<div className="absolute bottom-[10%] right-[-5%] h-[600px] w-[600px] animate-blob animation-delay-2000 rounded-full bg-purple-600 opacity-10 blur-[120px]" />
			</div>
			)}
			<Header/>
			{children}
			<Footer/>
			<SpeedInsights />
		</div>
	);
}
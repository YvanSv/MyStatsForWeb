"use client";

import Link from "next/link";
import { useLanguage } from "../context/languageContext";
import { FRONT_ROUTES } from "../constants/routes";
import { TECHNOS } from "../constants/technos";
import { PrimaryButton } from "../components/Atomic/Buttons";

export default function AboutPage() {
  const { t } = useLanguage();
  const dict = t.about;
  const features = [dict.feature1, dict.feature2, dict.feature3, dict.feature4];

  return (
    <main className="w-full max-w-3xl mx-auto px-6 py-12 flex flex-col gap-12">
      <header className="text-center">
        <h1 className="text-4xl font-black uppercase tracking-[0.3em] text-white mb-4">{dict.title}</h1>
        <p className="text-gray-500 font-jost tracking-wide">{dict.subtitle}</p>
      </header>

      <section className="flex flex-col gap-4">
        <p className="text1 leading-relaxed">{dict.intro1}</p>
        <p className="text3 leading-relaxed">{dict.intro2}</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">{dict.featuresTitle}</h2>
        <ul className="flex flex-col gap-3">
          {features.map((feature) => (
            <li key={feature} className="border border-white/5 bg-white/[0.02] rounded-xl p-4 text1">{feature}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">{dict.stackTitle}</h2>
        <ul className="flex flex-wrap gap-2">
          {TECHNOS.map((tech) => (
            <li key={tech} className="text3 text-xs border border-white/10 rounded-full px-4 py-1">{tech}</li>
          ))}
        </ul>
      </section>

      <footer className="flex flex-wrap items-center justify-center gap-6">
        <Link href={FRONT_ROUTES.HELP}>
          <PrimaryButton additional="px-8 py-3">{dict.faqLink}</PrimaryButton>
        </Link>
        <Link href={FRONT_ROUTES.ACCUEIL} className="text3 hover:underline">{dict.backHome}</Link>
      </footer>
    </main>
  );
}

import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

// Compile globals.css avec Tailwind, comme le fait Next : on vérifie ce qui est réellement généré
const file = path.resolve(import.meta.dirname, "globals.css");
let css = "";

beforeAll(async () => {
  const result = await postcss([tailwind()]).process(fs.readFileSync(file, "utf8"), { from: file });
  css = result.css;
}, 30000);

const rule = (selector: string) =>
  css.match(new RegExp(`${selector.replace(/[.\-]/g, "\\$&")}\\s*\\{[^}]*\\}`))?.[0] ?? "";
const keyframes = (name: string) => css.match(new RegExp(`@keyframes ${name}\\s*\\{`)) !== null;

describe("globals.css – animations des classes utilisées", () => {
  it.each(["shake", "progress-fast", "gradient-xy"])("animate-%s existe et référence un @keyframes défini", (name) => {
    expect(rule(`.animate-${name}`), `.animate-${name}`).toContain(`animation: var(--animate-${name})`);
    expect(css).toContain(`--animate-${name}: ${name} `);
    expect(keyframes(name), `@keyframes ${name}`).toBe(true);
  });

  it("l'animation de secousse est brève et ne se répète pas", () => {
    expect(css).toMatch(/--animate-shake: shake [0-9.]+s ease-in-out;/);
  });

  it("la barre de progression et le dégradé de l'avatar tournent en boucle", () => {
    expect(css).toMatch(/--animate-progress-fast:[^;]*infinite;/);
    expect(css).toMatch(/--animate-gradient-xy:[^;]*infinite;/);
  });

  it("le dégradé animé agrandit son fond (sinon rien ne bouge)", () => {
    const block = css.match(/@keyframes gradient-xy\s*\{[\s\S]*?\}\s*\}/)?.[0] ?? "";
    expect(block).toContain("background-size: 200% 200%");
    expect(block).toContain("background-position");
  });

  it("désactive ces animations pour prefers-reduced-motion", () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*animate-shake[\s\S]*animation: none/);
  });
});

describe("globals.css – police Hias Sans", () => {
  it("déclare le @font-face et la classe font-hias", () => {
    expect(css).toMatch(/@font-face\s*\{[^}]*Hias Sans/);
    expect(css).toContain("--font-hias: \"Hias Sans\"");
    expect(rule(".font-hias")).toContain("font-family: var(--font-hias)");
  });
});

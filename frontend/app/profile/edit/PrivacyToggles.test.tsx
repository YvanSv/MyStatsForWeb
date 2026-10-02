import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrivacyToggles } from "./PrivacyToggles";
import { ALL_PERMS } from "@/app/constants/validation";

const dict = {
  toggleProfile: "Profil", descProfile: "d1", toggleStats: "Stats", descStats: "d2", toggleFavs: "Favoris", descFavs: "d3",
  toggleHistory: "Historique", descHistory: "d4", toggleDash: "Dashboard", descDash: "d5",
};

describe("PrivacyToggles", () => {
  it("affiche les cinq réglages", () => {
    render(<PrivacyToggles perms={ALL_PERMS} onChange={() => {}} dict={dict}/>);
    for (const title of ["Profil", "Stats", "Favoris", "Historique", "Dashboard"]) expect(screen.getByText(title)).toBeInTheDocument();
  });

  it("désactive les autres réglages quand le profil est privé", () => {
    render(<PrivacyToggles perms={{ ...ALL_PERMS, profile: false }} onChange={() => {}} dict={dict}/>);
    expect(screen.getByText("Stats").closest("div[class*='pointer-events-none']")).not.toBeNull();
    expect(screen.getByText("Profil").closest("div[class*='pointer-events-none']")).toBeNull();
  });

  it("transmet la clé modifiée", async () => {
    const onChange = vi.fn();
    render(<PrivacyToggles perms={ALL_PERMS} onChange={onChange} dict={dict}/>);
    await userEvent.setup().click(screen.getAllByRole("switch")[1]);
    expect(onChange).toHaveBeenCalledWith("stats", false);
  });
});

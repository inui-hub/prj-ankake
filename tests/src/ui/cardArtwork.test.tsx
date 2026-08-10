import "@testing-library/jest-dom/vitest";
import { resolveCardArtworkSrc } from "@ankake/ui";

describe("card artwork", () => {
  it("resolves the generated dark resonance token artwork", () => {
    expect(resolveCardArtworkSrc("dark-resonance-token")).toBeTruthy();
  });
});

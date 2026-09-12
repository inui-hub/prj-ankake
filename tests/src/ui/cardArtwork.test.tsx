import "@testing-library/jest-dom/vitest";
import { CardArtwork, resolveCardArtworkSrc } from "@ankake/ui";
import { render, screen } from "@testing-library/react";

describe("card artwork", () => {
  it("resolves the canonical dark token artwork", () => {
    expect(resolveCardArtworkSrc("AK-T-002")).toBeTruthy();
  });

  it("localizes the fallback image accessible name", () => {
    const props = {
      attribute: "fire",
      catalogCardId: "missing-artwork",
      name: "Test Card",
      type: "creature"
    };
    const { rerender } = render(<CardArtwork {...props} locale="ja" />);

    expect(screen.getByRole("img")).toHaveAccessibleName("Test Card 画像を表示できません");

    rerender(<CardArtwork {...props} locale="en" />);
    expect(screen.getByRole("img")).toHaveAccessibleName("Test Card artwork unavailable");
  });
});

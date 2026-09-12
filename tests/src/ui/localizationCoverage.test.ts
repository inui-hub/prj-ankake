import {
  localizeBattleEvent,
  localizeBattleInstruction,
  localizeCardPresentation,
  type UiLocale
} from "@ankake/ui";
import type { BattleEventType } from "@ankake/domain";
import { localizeBattleView } from "../../../apps/web/src/i18n/cardLocalization";

const CARD_IDS = [
  ...Array.from({ length: 60 }, (_, index) => `AK-${String(index + 1).padStart(3, "0")}`),
  "AK-T-001",
  "AK-T-002"
];

const EVENT_TYPES: readonly BattleEventType[] = [
  "battle.started", "first-player.decided", "card.drawn", "card.overflowed", "card.played",
  "creature.summoned", "creature.moved", "spell.resolved", "effect.fizzled", "effect.partially-resolved",
  "resonance.changed", "resonance.effect-resolved", "phase.ended", "standby.resolved",
  "attack.phase-started", "attack.attacker-started", "attack.attacker-skipped", "attack.targeted",
  "attack.target-skipped", "creature.damaged", "creature.destroyed", "base.damaged", "base.captured",
  "attack.phase-ended", "deck-out.occurred", "cpu.processing-limit-reached", "battle.ended"
];

describe("localization coverage", () => {
  it("provides a non-fallback Japanese presentation for every normal card and token", () => {
    for (const id of CARD_IDS) {
      const card = localizeCardPresentation({ id, name: "English card", effectText: "English effect.", type: "creature", attribute: "fire" }, "ja");
      expect(card.name).not.toBe(`カード ${id}`);
      expect(card.effectText).not.toBe("効果テキストは日本語版カード一覧を参照");
    }
  });

  it("provides a complete English effect translation for every normal card and token", () => {
    for (const id of CARD_IDS) {
      const card = localizeCardPresentation({ id, name: "English card", effectText: "日本語のルール文", type: "creature", attribute: "fire" }, "en");
      expect(card.effectText).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);
      expect(card.effectText).not.toContain("placeholder");
      expect(card.effectText).not.toBe("Effect text is unavailable.");
    }
  });

  it("uses the canonical dark token name in Japanese", () => {
    expect(localizeCardPresentation({ id: "AK-T-002", name: "Shade Remnant", effectText: "No effect.", type: "creature-token", attribute: "dark" }, "ja").name)
      .toBe("冥影の残滓");
  });

  it("preserves the documented meaning in representative English effect translations", () => {
    expect(localizeCardPresentation({ id: "AK-012", name: "", effectText: "", type: "creature", attribute: "fire" }, "en").effectText)
      .toBe("On summon: Choose an enemy creature or attackable base. Deal 7 damage to it. If this destroys an enemy creature, deal 3 damage to all other enemy creatures in that creature's lane.");
    expect(localizeCardPresentation({ id: "AK-059", name: "", effectText: "", type: "spell", attribute: "dark" }, "en").effectText)
      .toBe("Choose 2 creature cards with original cost 5 or less in your graveyard. Choose 2 empty summonable squares. Summon one chosen card on each chosen square.");
  });

  it("localizes battle-hand and board-card effects for both locales", () => {
    const card = {
      instanceId: "ak-012-instance",
      catalogCardId: "AK-012",
      name: "獄炎竜ヴァルガス",
      effectText: "召喚時：敵クリーチャーまたは攻撃可能な拠点1つを選択する。その対象に7ダメージを与える。",
      type: "creature",
      attribute: "fire"
    };
    const view = {
      playerHand: [card],
      boardSquares: [{ occupant: card }]
    } as unknown as Parameters<typeof localizeBattleView>[0];

    const english = localizeBattleView(view, "en");
    expect(english.playerHand[0]!.effectText).toContain("Deal 7 damage");
    expect(english.boardSquares[0]!.occupant!.effectText).toContain("Deal 7 damage");
    expect(english.playerHand[0]!.effectText).not.toMatch(/[\u3040-\u30ff\u3400-\u9fff]/);

    const japanese = localizeBattleView(view, "ja");
    expect(japanese.playerHand[0]!.effectText).toContain("7ダメージ");
    expect(japanese.boardSquares[0]!.occupant!.effectText).toContain("7ダメージ");
  });

  it.each(["ja", "en"] satisfies readonly UiLocale[])("localizes every battle event and instruction in %s", (locale) => {
    for (const type of EVENT_TYPES) {
      expect(localizeBattleEvent(locale, { type, side: "player" })).not.toContain("The action could not be completed.");
      expect(localizeBattleEvent(locale, { type, side: "player" })).not.toContain("操作を実行できませんでした");
    }
    for (const key of ["idle", "move-start", "move-continue", "summon", "effect"] as const) {
      expect(localizeBattleInstruction(locale, key)).not.toHaveLength(0);
    }
  });
});

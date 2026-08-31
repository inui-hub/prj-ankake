export type AppLocale = "ja" | "en";

const JAPANESE: Record<string, string> = {
  "menu.language": "言語",
  "menu.japanese": "日本語",
  "menu.english": "English",
  "menu.kicker": "オリジナルDCG",
  "deck.sort": "並び順",
  "deck.cost-up": "コスト昇順",
  "deck.reset": "リセット",
  "battle.board": "盤面",
  "battle.resonance": "共鳴",
  "battle.resonance.inactive": "このレーンの水共鳴は有効ではありません",
  "battle.resonance.already-used": "このレーンの水共鳴はこのターンに使用済みです",
  "battle.resonance.no-target": "このレーンには水共鳴の対象がありません",
  "battle.resonance.unknown": "操作を実行できませんでした",
  "fatal.reload": "ページを再読み込み"
};

const ENGLISH: Record<string, string> = {
  "menu.language": "Language",
  "menu.japanese": "日本語",
  "menu.english": "English",
  "menu.kicker": "Original DCG",
  "deck.sort": "Sort",
  "deck.cost-up": "Cost up",
  "deck.reset": "Reset",
  "battle.board": "Board",
  "battle.resonance": "Resonance",
  "battle.resonance.inactive": "Water resonance is not active in this lane.",
  "battle.resonance.already-used": "Water resonance was already used in this lane this turn.",
  "battle.resonance.no-target": "There is no water resonance target in this lane.",
  "battle.resonance.unknown": "The action could not be completed.",
  "fatal.reload": "Reload page"
};

/** Resolves UI strings only; rules continue to use stable domain IDs and codes. */
export function translate(locale: AppLocale, key: string, fallback?: string): string {
  return (locale === "en" ? ENGLISH : JAPANESE)[key] ?? JAPANESE[key] ?? fallback ?? key;
}

export function battleValidationMessage(locale: AppLocale, code?: string): string {
  return translate(locale, code ?? "battle.resonance.unknown", JAPANESE["battle.resonance.unknown"]);
}

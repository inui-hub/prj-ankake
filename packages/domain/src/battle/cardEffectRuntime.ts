import { destroyCreature } from "./attack";
import { getAdjacentBoardCoordinates, getBoardSquare, getLane, isNormalBoardCoordinate, setBoardOccupant } from "./board";
import { createRngFromState } from "./rng";
import type { EffectContext } from "./effectTypes";
import type { BattleCardInstance, BattleEvent, BattleState } from "./types";

const SUPPORTED_CARD_SCRIPT_IDS = new Set([
  "AK-004", "AK-006", "AK-008", "AK-009", "AK-010", "AK-011", "AK-012", "AK-013", "AK-015", "AK-016", "AK-017", "AK-018", "AK-019", "AK-020", "AK-021", "AK-022", "AK-023", "AK-024", "AK-025", "AK-026", "AK-027", "AK-028", "AK-029", "AK-030", "AK-031", "AK-032", "AK-033", "AK-034", "AK-036", "AK-038", "AK-039", "AK-041", "AK-042", "AK-043", "AK-044", "AK-045", "AK-046", "AK-047", "AK-048", "AK-049", "AK-050", "AK-051", "AK-052", "AK-054", "AK-055", "AK-056", "AK-057", "AK-058", "AK-059", "AK-060"
]);

export function isCardEffectScriptSupported(cardId: string): boolean {
  return SUPPORTED_CARD_SCRIPT_IDS.has(cardId);
}

/**
 * State transitions shared by the catalog's card-script operations.  The
 * resolver owns transactionality; this module deliberately returns a staged
 * state and ordered events only.  Selection is re-read at resolution time,
 * therefore stale instance IDs simply fizzle rather than mutating state.
 */
export function resolveCardEffectScript(
  state: BattleState,
  context: EffectContext,
  cardId: string,
  firstSequence: number
): { readonly state: BattleState; readonly events: readonly BattleEvent[] } | undefined {
  const selected = selectedCreatures(state, context);
  switch (cardId) {
    case "AK-006": return withEvent(buffCreatures(state, selected.filter((card) => card.instanceId !== context.sourceInstanceId && card.controllerSide === context.controllerSide).slice(0, 1), { attack: 2 }), context, firstSequence, "Summon ally gained attack.");
    case "AK-015": return drawCards(buffCreatures(state, selected, { movement: 1 }), context, 1, firstSequence);
    case "AK-016": return drawCards(state, context, 1, firstSequence);
    case "AK-008": return withEvent(buffLaneAllies(state, context, { attack: 2 }), context, firstSequence, "Lane allies gained attack.");
    case "AK-011": return damageCreatures(state, context, creaturesInSelectedLane(state, context, "enemy"), 5, firstSequence);
    case "AK-012": return damageCreatures(state, context, selected.filter((card) => card.controllerSide !== context.controllerSide).slice(0, 1), 7, firstSequence);
    case "AK-017": return drawCards(state, context, 2, firstSequence);
    case "AK-018": return moveSelected(state, context, selected.filter((card) => card.instanceId !== context.sourceInstanceId && card.controllerSide === context.controllerSide).slice(0, 1), firstSequence);
    case "AK-023": return drawCards(setEnemyMovement(state, context, 0), context, 3, firstSequence);
    case "AK-024": return returnSelected(state, context, laneCreaturesExceptSource(state, context), firstSequence);
    case "AK-026": return drawMatchingDeckCard(state, context, (card) => isCreature(card), firstSequence);
    case "AK-027": return withEvent(increaseMaxPp(state, context, 1), context, firstSequence, "Maximum PP increased.");
    case "AK-029": return drawIfMaxPp(increaseMaxPp(state, context, 1), context, 7, firstSequence);
    case "AK-025": return withEvent(state.players[context.controllerSide].maxPp >= 5 ? buffCreatures(state, [state.cardInstances[context.sourceInstanceId]!], { attack: 1, health: 1 }) : state, context, firstSequence, "Conditional summon bonus resolved.");
    case "AK-030": return withEvent(state.players[context.controllerSide].maxPp >= 7 ? buffCreatures(state, [state.cardInstances[context.sourceInstanceId]!], { attack: 2, health: 2 }) : state, context, firstSequence, "Conditional summon bonus resolved.");
    case "AK-031": return drawMatchingDeckCard(state, context, (card) => isCreature(card) && card.cost >= 8, firstSequence, -3);
    case "AK-032": return withEvent(state.players[context.controllerSide].maxPp >= 8 ? buffCreatures(state, laneCreaturesExceptSource(state, context).filter((card) => card.controllerSide === context.controllerSide), { attack: 2, health: 2 }) : state, context, firstSequence, "Conditional lane bonus resolved.");
    case "AK-033": return discountHandCreatures(state, context, firstSequence);
    case "AK-034": return drawMatchingDeckCard(state, context, (card) => isCreature(card) && card.cost <= 4, firstSequence, undefined, 0);
    case "AK-039": return withEvent(buffCreatures(state, selected, { health: 4 }), context, firstSequence, "Sacred Shield reinforced its target.");
    case "AK-041": return withEvent(disableCreatures(state, selected), context, firstSequence, "Holy Silence disabled the target effect.");
    case "AK-038": case "AK-042": return summonTokens(state, context, "AK-T-001", selectedCoordinates(context).slice(0, 1), firstSequence);
    case "AK-044": return summonTokens(buffTokens(state, context, { health: 2 }), context, "AK-T-001", selectedCoordinates(context), firstSequence);
    case "AK-045": return withEvent(disableCreatures(state, laneCreaturesExceptSource(state, context).filter((card) => card.controllerSide !== context.controllerSide)), context, firstSequence, "Lane enemy effects were disabled.");
    case "AK-046": return summonTokens(state, context, "AK-T-001", selectedCoordinates(context).slice(0, 2), firstSequence);
    case "AK-048": return summonTokens(buffTokens(state, context, { attack: 3, health: 3 }), context, "AK-T-001", selectedCoordinates(context).slice(0, 3), firstSequence);
    case "AK-047": return withEvent(buffAllies(disableEnemies(state, context), context, { attack: 1, health: 4 }), context, firstSequence, "Divine Dominion resolved.");
    case "AK-050": return destroySelected(state, context, selected, 2, firstSequence);
    case "AK-055": return destroySelected(state, context, selected, 0, firstSequence);
    case "AK-019": return moveSelected(state, context, selected, firstSequence);
    case "AK-020": return returnSelected(state, context, selected, firstSequence);
    case "AK-022": return drawCards(state, context, 1, firstSequence);
    case "AK-054": return returnGraveyardCards(state, context, firstSequence);
    case "AK-057": return reviveSelected(state, context, firstSequence);
    case "AK-059": return reviveSelectedPair(state, context, firstSequence);
    case "AK-049": return drawCards(state, context, 1, firstSequence);
    case "AK-056": return withEvent(buffCreatures(state, [state.cardInstances[context.sourceInstanceId]!], { attack: 1, health: 1 }), context, firstSequence, "A fallen ally strengthened this creature.");
    case "AK-010": return destroyLaneBlast(state, context, firstSequence);
    case "AK-051": return summonAdjacentToken(state, context, "AK-T-002", firstSequence);
    case "AK-052": return buffAfterDestroyingSelected(state, context, selected.filter((card) => card.instanceId !== context.sourceInstanceId && card.controllerSide === context.controllerSide).slice(0, 1), firstSequence);
    case "AK-058": return reviveRandomAdjacent(state, context, firstSequence);
    case "AK-060": return destroyLaneAndGrowSource(state, context, firstSequence);
    // These effects are calculated by the relevant query/placement rules;
    // their program merely records that the already-applied intrinsic rule
    // has resolved.  Keeping them explicit is important: an unknown card ID
    // must never turn into a successful no-op effect.
    case "AK-004": case "AK-009": case "AK-013": case "AK-021":
    case "AK-028": case "AK-036": case "AK-043":
      return withEvent(state, context, firstSequence, `${cardId} intrinsic effect resolved.`);
    default:
      return undefined;
  }
}

function selectedCreatures(state: BattleState, context: EffectContext): readonly BattleCardInstance[] {
  const ids = context.selection.kind === "creatures" ? context.selection.instanceIds
    : context.selection.kind === "structured" ? context.selection.value.creatureIds ?? [] : [];
  return [...new Set(ids)].sort().map((id) => state.cardInstances[id]).filter((card): card is BattleCardInstance => Boolean(card && card.zone === "board"));
}
function selectedCoordinates(context: EffectContext) { return context.selection.kind === "structured" ? context.selection.value.coordinates ?? [] : []; }
function selectedLane(context: EffectContext) { return context.selection.kind === "structured" ? context.selection.value.lane : undefined; }
function buffCreatures(state: BattleState, cards: readonly BattleCardInstance[], bonus: { readonly attack?: number; readonly health?: number; readonly movement?: number }): BattleState {
  if (cards.length === 0) return state;
  return { ...state, cardInstances: { ...state.cardInstances, ...Object.fromEntries(cards.map((card) => [card.instanceId, {
    ...card,
    currentAttack: (card.currentAttack ?? card.attack ?? 0) + (bonus.attack ?? 0),
    maxHp: (card.maxHp ?? card.currentHp ?? 0) + (bonus.health ?? 0),
    currentHp: (card.currentHp ?? 0) + (bonus.health ?? 0),
    temporaryMovementBonus: (card.temporaryMovementBonus ?? 0) + (bonus.movement ?? 0)
  }])) } };
}
function setEnemyMovement(state: BattleState, context: EffectContext, movement: number): BattleState {
  return { ...state, cardInstances: Object.fromEntries(Object.entries(state.cardInstances).map(([id, card]) => [id, card.zone === "board" && card.controllerSide !== context.controllerSide ? { ...card, movementOverride: movement, movementOverrideExpiresOnSide: context.controllerSide } : card])) };
}
function increaseMaxPp(state: BattleState, context: EffectContext, amount: number): BattleState {
  const player = state.players[context.controllerSide];
  const maxPp = Math.min(10, player.maxPp + amount);
  return { ...state, players: { ...state.players, [context.controllerSide]: { ...player, maxPp } } };
}
function drawIfMaxPp(state: BattleState, context: EffectContext, threshold: number, sequence: number) { return state.players[context.controllerSide].maxPp >= threshold ? drawCards(state, context, 1, sequence) : withEvent(state, context, sequence, "Maximum PP condition was not met."); }
function drawCards(state: BattleState, context: EffectContext, amount: number, firstSequence: number): { readonly state: BattleState; readonly events: readonly BattleEvent[] } {
  let next = state; const events: BattleEvent[] = [];
  for (let index = 0; index < amount; index += 1) {
    const player = next.players[context.controllerSide]; const id = player.deckZone[0];
    if (!id) break;
    const overflow = player.handZone.length >= 9;
    next = { ...next, players: { ...next.players, [context.controllerSide]: { ...player, deckZone: player.deckZone.slice(1), handZone: overflow ? player.handZone : [...player.handZone, id], graveyardZone: overflow ? [...player.graveyardZone, id] : player.graveyardZone } }, cardInstances: { ...next.cardInstances, [id]: { ...next.cardInstances[id]!, zone: overflow ? "graveyard" : "hand" } } };
    events.push(event(context, firstSequence + events.length, overflow ? "card.overflowed" : "card.drawn", id, "Card effect drew a card."));
  }
  return events.length ? { state: next, events } : withEvent(next, context, firstSequence, "Card effect had no drawable cards.");
}
function drawMatchingDeckCard(state: BattleState, context: EffectContext, predicate: (card: BattleCardInstance) => boolean, sequence: number, costDelta?: number, setCost?: number): { readonly state: BattleState; readonly events: readonly BattleEvent[] } {
  const player = state.players[context.controllerSide]; const candidates = player.deckZone.filter((candidate) => predicate(state.cardInstances[candidate]!)).sort();
  const [choice, rng] = createRngFromState(state.metadata.rng).nextInt(candidates.length);
  const id = candidates[choice];
  if (!id) return withEvent(state, context, sequence, "No matching deck card was available.");
  const card = state.cardInstances[id]!;
  const currentCost = setCost ?? Math.max(0, card.currentCost + (costDelta ?? 0));
  return { state: { ...state, metadata: { ...state.metadata, rng: rng.state }, players: { ...state.players, [context.controllerSide]: { ...player, deckZone: player.deckZone.filter((candidate) => candidate !== id), handZone: [...player.handZone, id] } }, cardInstances: { ...state.cardInstances, [id]: { ...card, zone: "hand" as const, currentCost } } }, events: [event(context, sequence, "card.drawn", id, "Card effect added a matching card to hand.")] };
}
function discountHandCreatures(state: BattleState, context: EffectContext, sequence: number) { const player = state.players[context.controllerSide]; return withEvent({ ...state, cardInstances: Object.fromEntries(Object.entries(state.cardInstances).map(([id, card]) => [id, player.handZone.includes(id) && isCreature(card) ? { ...card, currentCost: Math.max(0, card.currentCost - 1) } : card])) }, context, sequence, "Reduced creature costs in hand."); }
function disableCreatures(state: BattleState, cards: readonly BattleCardInstance[]): BattleState { return { ...state, cardInstances: { ...state.cardInstances, ...Object.fromEntries(cards.map((card) => [card.instanceId, { ...card, effectsDisabled: true }])) } }; }
function disableEnemies(state: BattleState, context: EffectContext): BattleState { return disableCreatures(state, Object.values(state.cardInstances).filter((card) => card.zone === "board" && card.controllerSide !== context.controllerSide)); }
function buffAllies(state: BattleState, context: EffectContext, bonus: { attack: number; health: number }): BattleState { return buffCreatures(state, Object.values(state.cardInstances).filter((card) => card.zone === "board" && card.controllerSide === context.controllerSide), bonus); }
function destroySelected(state: BattleState, context: EffectContext, cards: readonly BattleCardInstance[], draws: number, sequence: number) { let next = state; const events: BattleEvent[] = []; for (const card of cards) { const result = destroyCreature(next, card.instanceId, sequence + events.length); next = result.state; events.push(...result.events); } const drawn = cards.length && draws ? drawCards(next, context, draws, sequence + events.length) : undefined; return drawn ? { state: drawn.state, events: [...events, ...drawn.events] } : events.length ? { state: next, events } : withEvent(next, context, sequence, "No selected creature could be destroyed."); }
function buffAfterDestroyingSelected(state: BattleState, context: EffectContext, cards: readonly BattleCardInstance[], sequence: number) {
  const destroyed = destroySelected(state, context, cards, 0, sequence);
  if (!destroyed.events.some((entry) => entry.type === "creature.destroyed")) return destroyed;
  const source = destroyed.state.cardInstances[context.sourceInstanceId];
  const buffedState = source ? buffCreatures(destroyed.state, [source], { attack: 3, health: 3 }) : destroyed.state;
  return { state: buffedState, events: [...destroyed.events, event(context, sequence + destroyed.events.length, "spell.resolved", context.sourceInstanceId, "Summoner gained strength after destroying an ally.")] };
}
function destroyLaneAndGrowSource(state: BattleState, context: EffectContext, sequence: number) {
  const source = state.cardInstances[context.sourceInstanceId];
  if (!source?.position || source.zone !== "board") return withEvent(state, context, sequence, "Source was no longer on the board.");
  const victims = [...laneCreaturesExceptSource(state, context)].sort((left, right) => left.instanceId.localeCompare(right.instanceId));
  let next = state;
  const events: BattleEvent[] = [];
  for (const victim of victims) {
    // Destruction is revalidated against the staged state so an earlier
    // effect can never cause a stale target to count towards the bonus.
    if (next.cardInstances[victim.instanceId]?.zone !== "board") continue;
    const destroyed = destroyCreature(next, victim.instanceId, sequence + events.length);
    next = destroyed.state;
    events.push(...destroyed.events);
  }
  const grownSource = next.cardInstances[context.sourceInstanceId];
  if (grownSource?.zone === "board" && events.filter((entry) => entry.type === "creature.destroyed").length > 0) {
    const destroyedCount = events.filter((entry) => entry.type === "creature.destroyed").length;
    next = buffCreatures(next, [grownSource], { attack: destroyedCount, health: destroyedCount });
    events.push(event(context, sequence + events.length, "spell.resolved", grownSource.instanceId, `Destroyed ${destroyedCount} lane creature(s); source gained +${destroyedCount}/+${destroyedCount}.`));
  }
  return events.length ? { state: next, events } : withEvent(next, context, sequence, "No other lane creatures could be destroyed.");
}
function damageCreatures(state: BattleState, context: EffectContext, cards: readonly BattleCardInstance[], amount: number, sequence: number) {
  let next = state; const events: BattleEvent[] = [];
  for (const source of cards) { const card = next.cardInstances[source.instanceId]; if (!card || card.zone !== "board") continue; const currentHp = Math.max(0, (card.currentHp ?? card.maxHp ?? 0) - amount); next = { ...next, cardInstances: { ...next.cardInstances, [card.instanceId]: { ...card, currentHp } } }; events.push(event(context, sequence + events.length, "creature.damaged", card.instanceId, `Card effect dealt ${amount} damage.`)); if (currentHp === 0) { const destroyed = destroyCreature(next, card.instanceId, sequence + events.length); next = destroyed.state; events.push(...destroyed.events); } }
  return events.length ? { state: next, events } : withEvent(next, context, sequence, "No damage targets were legal.");
}
function creaturesInSelectedLane(state: BattleState, context: EffectContext, relation: "ally" | "enemy") { const lane = selectedLane(context); return lane ? Object.values(state.cardInstances).filter((card) => card.zone === "board" && card.position && getLane(card.position.column) === lane && (relation === "ally" ? card.controllerSide === context.controllerSide : card.controllerSide !== context.controllerSide)) : []; }
function laneCreaturesExceptSource(state: BattleState, context: EffectContext): readonly BattleCardInstance[] {
  const source = state.cardInstances[context.sourceInstanceId];
  if (!source?.position) return [];
  const lane = getLane(source.position.column);
  return Object.values(state.cardInstances).filter((card) => card.zone === "board" && card.position && card.instanceId !== source.instanceId && getLane(card.position.column) === lane);
}
function buffLaneAllies(state: BattleState, context: EffectContext, bonus: { attack: number }) { return buffCreatures(state, creaturesInSelectedLane(state, context, "ally"), bonus); }
function moveSelected(state: BattleState, context: EffectContext, cards: readonly BattleCardInstance[], sequence: number) {
  const card = cards[0]; const destination = selectedCoordinates(context)[0];
  if (!card?.position || !destination || !isNormalBoardCoordinate(destination) || getBoardSquare(state.board, destination)?.occupantId || getLane(card.position.column) !== getLane(destination.column)) return withEvent(state, context, sequence, "No legal movement destination was selected.");
  return { state: { ...state, board: setBoardOccupant(setBoardOccupant(state.board, card.position, undefined), destination, card.instanceId), cardInstances: { ...state.cardInstances, [card.instanceId]: { ...card, position: destination, movedThisTurn: true } } }, events: [event(context, sequence, "creature.moved", card.instanceId, "Card effect moved a creature.")] };
}
function returnSelected(state: BattleState, context: EffectContext, cards: readonly BattleCardInstance[], sequence: number) {
  let next = state; const events: BattleEvent[] = [];
  for (const card of cards) { if (!card.position) continue; const player = next.players[card.ownerSide]; next = { ...next, board: setBoardOccupant(next.board, card.position, undefined), players: { ...next.players, [card.ownerSide]: { ...player, handZone: [...player.handZone, card.instanceId] } }, cardInstances: { ...next.cardInstances, [card.instanceId]: { ...card, zone: "hand", position: undefined, boardEntrySequence: undefined, effectsDisabled: undefined, temporaryAttackBonus: undefined, temporaryHealthBonus: undefined } } }; events.push(event(context, sequence + events.length, "spell.resolved", card.instanceId, "Card effect returned a creature to hand.")); }
  return events.length ? { state: next, events } : withEvent(state, context, sequence, "No selected creature could be returned.");
}
function returnGraveyardCards(state: BattleState, context: EffectContext, sequence: number) {
  const ids = context.selection.kind === "structured" ? context.selection.value.graveyardCardIds ?? [] : []; const player = state.players[context.controllerSide]; const valid = [...new Set(ids)].filter((id) => player.graveyardZone.includes(id) && isCreature(state.cardInstances[id]!)).slice(0, 2);
  if (valid.length !== 2) return withEvent(state, context, sequence, "Two creature cards from graveyard are required.");
  return { state: { ...state, players: { ...state.players, [context.controllerSide]: { ...player, graveyardZone: player.graveyardZone.filter((id) => !valid.includes(id)), handZone: [...player.handZone, ...valid] } }, cardInstances: { ...state.cardInstances, ...Object.fromEntries(valid.map((id) => [id, { ...state.cardInstances[id]!, zone: "hand" as const }])) } }, events: valid.map((id, index) => event(context, sequence + index, "card.drawn", id, "Card effect returned a graveyard card to hand.")) };
}
function reviveSelected(state: BattleState, context: EffectContext, sequence: number): { readonly state: BattleState; readonly events: readonly BattleEvent[] } {
  const id = context.selection.kind === "structured" ? context.selection.value.graveyardCardIds?.[0] : undefined; const destination = selectedCoordinates(context)[0]; const card = id ? state.cardInstances[id] : undefined; const player = state.players[context.controllerSide];
  if (!card || !player.graveyardZone.includes(card.instanceId) || !isCreature(card) || card.cost > 3 || !destination || !isNormalBoardCoordinate(destination) || getBoardSquare(state.board, destination)?.occupantId) return withEvent(state, context, sequence, "No legal revival was selected.");
  return { state: { ...state, board: setBoardOccupant(state.board, destination, card.instanceId), players: { ...state.players, [context.controllerSide]: { ...player, graveyardZone: player.graveyardZone.filter((candidate) => candidate !== card.instanceId) } }, cardInstances: { ...state.cardInstances, [card.instanceId]: { ...card, zone: "board" as const, position: destination, currentHp: card.maxHp, summonedThisTurn: true, boardEntrySequence: sequence } } }, events: [event(context, sequence, "creature.summoned", card.instanceId, "Card effect revived a creature.")] };
}
function reviveSelectedPair(state: BattleState, context: EffectContext, sequence: number): { readonly state: BattleState; readonly events: readonly BattleEvent[] } {
  const selection = context.selection.kind === "structured" ? context.selection.value : undefined;
  const ids = selection?.graveyardCardIds ?? [];
  const coordinates = selection?.coordinates ?? [];
  const player = state.players[context.controllerSide];
  if (new Set(ids).size !== 2 || new Set(coordinates.map((coordinate) => `${coordinate.column}:${coordinate.row}`)).size !== 2 || ids.length !== 2 || coordinates.length !== 2) {
    return withEvent(state, context, sequence, "Two distinct creature cards and two distinct destinations are required.");
  }
  const cards = ids.map((id) => state.cardInstances[id]);
  if (cards.some((card) => !card || !player.graveyardZone.includes(card.instanceId) || !isCreature(card) || card.cost > 5) || coordinates.some((coordinate) => !isNormalBoardCoordinate(coordinate) || getBoardSquare(state.board, coordinate)?.occupantId)) {
    return withEvent(state, context, sequence, "No legal pair of revivals was selected.");
  }
  let next = state;
  const events: BattleEvent[] = [];
  for (const [index, card] of cards.entries()) {
    const creature = card!;
    const destination = coordinates[index]!;
    const currentPlayer = next.players[context.controllerSide];
    const revived: BattleCardInstance = { ...creature, zone: "board", position: destination, currentHp: creature.maxHp, summonedThisTurn: true, movedThisTurn: false, boardEntrySequence: sequence + events.length, effectsDisabled: undefined, temporaryAttackBonus: undefined, temporaryHealthBonus: undefined };
    next = { ...next, board: setBoardOccupant(next.board, destination, creature.instanceId), players: { ...next.players, [context.controllerSide]: { ...currentPlayer, graveyardZone: currentPlayer.graveyardZone.filter((id) => id !== creature.instanceId) } }, cardInstances: { ...next.cardInstances, [creature.instanceId]: revived } };
    events.push(event(context, sequence + events.length, "creature.summoned", creature.instanceId, "Card effect revived a creature."));
  }
  return { state: next, events };
}
function summonTokens(state: BattleState, context: EffectContext, tokenCardId: string, coordinates: readonly { readonly column: number; readonly row: number }[], sequence: number) {
  let next = state; const events: BattleEvent[] = []; for (const coordinate of coordinates) { if (!isNormalBoardCoordinate(coordinate) || getBoardSquare(next.board, coordinate)?.occupantId) continue; const id = `${tokenCardId}:${context.sourceInstanceId}:${sequence + events.length}`; const token: BattleCardInstance = { instanceId: id, catalogCardId: tokenCardId, ownerSide: context.controllerSide, controllerSide: context.controllerSide, zone: "board", name: tokenCardId === "AK-T-001" ? "Luminous Wall" : "Shade Remnant", type: "creature-token", attribute: tokenCardId === "AK-T-001" ? "light" : "dark", cost: 1, currentCost: 1, attack: 1, currentAttack: 1, health: tokenCardId === "AK-T-001" ? 3 : 1, currentHp: tokenCardId === "AK-T-001" ? 3 : 1, maxHp: tokenCardId === "AK-T-001" ? 3 : 1, movement: 1, isToken: true, effectText: "", effectIds: [], position: coordinate, boardEntrySequence: sequence + events.length, summonedThisTurn: true, movedThisTurn: false }; next = { ...next, board: setBoardOccupant(next.board, coordinate, id), cardInstances: { ...next.cardInstances, [id]: token } }; events.push(event(context, sequence + events.length, "creature.summoned", id, "Card effect summoned a token.")); }
  return events.length ? { state: next, events } : withEvent(state, context, sequence, "No token destination was legal.");
}
function destroyLaneBlast(state: BattleState, context: EffectContext, sequence: number) {
  const coordinate = selectedCoordinates(context)[0];
  if (!coordinate) return withEvent(state, context, sequence, "Destroyed creature location was unavailable.");
  const lane = getLane(coordinate.column);
  return damageCreatures(state, context, Object.values(state.cardInstances).filter((card) => card.zone === "board" && card.controllerSide !== context.controllerSide && card.position && getLane(card.position.column) === lane), 2, sequence);
}
function summonAdjacentToken(state: BattleState, context: EffectContext, tokenCardId: string, sequence: number) {
  const origin = selectedCoordinates(context)[0];
  const coordinate = origin ? getAdjacentBoardCoordinates(origin).filter((candidate) => isNormalBoardCoordinate(candidate) && !getBoardSquare(state.board, candidate)?.occupantId).sort((a, b) => a.column - b.column || a.row - b.row)[0] : undefined;
  return coordinate ? summonTokens(state, context, tokenCardId, [coordinate], sequence) : withEvent(state, context, sequence, "No adjacent token destination was legal.");
}
function reviveRandomAdjacent(state: BattleState, context: EffectContext, sequence: number): { readonly state: BattleState; readonly events: readonly BattleEvent[] } {
  const origin = selectedCoordinates(context)[0];
  if (!origin) return withEvent(state, context, sequence, "Destroyed creature location was unavailable.");
  const player = state.players[context.controllerSide];
  const card = player.graveyardZone.map((id) => state.cardInstances[id]!).filter((candidate) => isCreature(candidate) && candidate.cost <= 5).sort((a, b) => a.instanceId.localeCompare(b.instanceId))[0];
  const destination = getAdjacentBoardCoordinates(origin).filter((candidate) => isNormalBoardCoordinate(candidate) && !getBoardSquare(state.board, candidate)?.occupantId).sort((a, b) => a.column - b.column || a.row - b.row)[0];
  if (!card || !destination) return withEvent(state, context, sequence, "No eligible revival was available.");
  const revived: BattleCardInstance = { ...card, zone: "board", position: destination, currentHp: card.maxHp, summonedThisTurn: true, movedThisTurn: false, boardEntrySequence: sequence };
  return { state: { ...state, board: setBoardOccupant(state.board, destination, card.instanceId), players: { ...state.players, [context.controllerSide]: { ...player, graveyardZone: player.graveyardZone.filter((id) => id !== card.instanceId) } }, cardInstances: { ...state.cardInstances, [card.instanceId]: revived } }, events: [event(context, sequence, "creature.summoned", card.instanceId, "Destroyed effect revived a creature.")] };
}
function buffTokens(state: BattleState, context: EffectContext, bonus: { readonly attack?: number; readonly health?: number }) { return buffCreatures(state, Object.values(state.cardInstances).filter((card) => card.zone === "board" && card.controllerSide === context.controllerSide && card.isToken), bonus); }
function withEvent(state: BattleState, context: EffectContext, sequence: number, message: string) { return { state, events: [event(context, sequence, "spell.resolved", context.sourceInstanceId, message)] }; }
function event(context: EffectContext, sequence: number, type: BattleEvent["type"], instanceId: string, message: string): BattleEvent { return { sequence, type, side: context.controllerSide, instanceId, message, data: { effectId: context.effect.effectId } }; }
function isCreature(card: BattleCardInstance): boolean { return card.type === "creature" || card.type === "creature-token"; }

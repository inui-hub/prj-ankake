import { getShortestMovementPaths } from "./movement";
import { getLane } from "./board";
import { getSummonDestinations, getSummonRangeCoordinates } from "./summon";
import { validateBattleCommand } from "./validation";
import { getExecutablePlayEffects } from "./effectPrograms";
import { getLegalEffectTargets } from "./effectResolver";
import type { BattleCardInstance, BattleCommand, BattleSide, BattleState, LegalAction, PublicEffectCandidate, PublicEffectChoice } from "./types";

export function generateLegalActions(state: BattleState, side: BattleSide): readonly LegalAction[] {
  if (state.phase !== "play" || state.activeSide !== side || state.terminalResult) {
    return [];
  }

  const actions: LegalAction[] = [];
  const player = state.players[side];

  for (const instanceId of player.handZone) {
    const card = state.cardInstances[instanceId];
    if (!card) {
      continue;
    }

    if (card.type === "creature" || card.type === "creature-token") {
      for (const destination of getSummonDestinations(state, side, instanceId)) {
        const selection = summonEffectSelection(state, side, card, destination);
        const command: BattleCommand = {
          type: "summonCreature",
          side,
          handInstanceId: instanceId,
          destination, ...(selection ? { effectSelection: selection } : {})
        };
        if (validateBattleCommand(state, command).length === 0) {
          actions.push({
            command,
            label: `Summon ${card.name}`,
            scoreHint: card.currentAttack ?? 1
          });
        }
      }
    } else if (card.type === "spell") {
      actions.push(...spellActions(state, side, card));
    }
  }

  for (const card of Object.values(state.cardInstances)) {
    if (card.zone !== "board" || card.controllerSide !== side || !card.position) {
      continue;
    }

    for (const path of getShortestMovementPaths(state, side, card.instanceId)) {
      const command: BattleCommand = {
        type: "moveCreature",
        side,
        creatureInstanceId: card.instanceId,
        origin: card.position,
        path
      };
      if (validateBattleCommand(state, command).length === 0) {
        actions.push({
          command,
          label: `Move ${card.name}`,
          scoreHint: 1
        });
      }
    }
  }

  actions.push({
    command: {
      type: "endPlayPhase",
      side,
      reason: side === "cpu" ? "cpu" : "manual"
    },
    label: "End play phase",
    scoreHint: 0
  });

  return actions;
}

function summonEffectSelection(state: BattleState, side: BattleSide, card: BattleCardInstance, destination: import("./types").BoardCoordinate): import("./types").BattleEffectSelection | undefined {
  const count: Readonly<Record<string, number>> = { "AK-038": 1, "AK-042": 1, "AK-046": 2, "AK-048": 3, "AK-057": 1 };
  const needed = count[card.catalogCardId]; if (!needed) return undefined;
  const cells = state.board.squares.filter((square) => square.terrain === "normal" && !square.occupantId && !(square.coordinate.column === destination.column && square.coordinate.row === destination.row) && (["AK-038", "AK-057"].includes(card.catalogCardId) ? Math.abs(square.coordinate.column - destination.column) <= 1 && Math.abs(square.coordinate.row - destination.row) <= 1 : square.lane === getLane(destination.column))).slice(0, needed).map((square) => square.coordinate);
  if (cells.length !== needed) return { coordinates: [] };
  if (card.catalogCardId !== "AK-057") return { coordinates: cells };
  const grave = state.players[side].graveyardZone.find((id) => { const target = state.cardInstances[id]; return Boolean(target && (target.type === "creature" || target.type === "creature-token") && target.cost <= 3); });
  return grave ? { coordinates: cells, graveyardCardIds: [grave] } : { coordinates: [] };
}

/** Shared candidate source for projections, CPU action generation, and engine revalidation. */
export function getPublicEffectChoices(state: BattleState, side: BattleSide): readonly PublicEffectChoice[] {
  if (state.phase !== "play" || state.activeSide !== side || state.terminalResult) return [];
  return state.players[side].handZone.flatMap((instanceId) => {
    const card = state.cardInstances[instanceId];
    if (!card || card.type !== "spell") return [];
    const scripted = scriptedChoice(state, side, card);
    if (scripted) return [scripted];
    return getExecutablePlayEffects(card).flatMap((effect) => {
      const operation = effect.operations[0];
      if (!operation) return [];
      const candidates = getLegalEffectTargets(state, side, operation).map((target) => target.kind === "creature"
        ? { kind: "creature" as const, id: target.instanceId, label: state.cardInstances[target.instanceId]?.name ?? target.instanceId }
        : { kind: "base" as const, id: target.baseId, label: target.baseId });
      return [{ effectId: effect.effectId, sourceInstanceId: card.instanceId, selectionKinds: [...new Set(candidates.map((candidate) => candidate.kind))], candidates, minimumTargets: operation.minimumTargets, maximumTargets: operation.maximumTargets }];
    });
  });
}

function scriptedChoice(state: BattleState, side: BattleSide, card: BattleCardInstance): PublicEffectChoice | undefined {
  const config: Readonly<Record<string, { kinds: readonly ("lane" | "coordinate" | "graveyard")[]; min: number; max: number }>> = {
    "AK-011": { kinds: ["lane"], min: 1, max: 1 }, "AK-019": { kinds: ["coordinate"], min: 2, max: 2 },
    "AK-044": { kinds: ["lane", "coordinate"], min: 4, max: 4 }, "AK-054": { kinds: ["graveyard"], min: 2, max: 2 },
    "AK-059": { kinds: ["graveyard", "coordinate"], min: 4, max: 4 }
  };
  const rule = config[card.catalogCardId]; if (!rule) return undefined;
  const candidates = structuredCandidates(state, side, card);
  return { effectId: card.effectIds[0] ?? card.catalogCardId, sourceInstanceId: card.instanceId, selectionKinds: [...new Set(candidates.map((candidate) => candidate.kind))], candidates, minimumTargets: rule.min, maximumTargets: rule.max };
}

/** Candidate filtering is deliberately shared by the public projection and
 * CPU action generation.  Each candidate participates in at least one fully
 * legal selection; callers must still keep coupled choices in the same lane. */
function structuredCandidates(state: BattleState, side: BattleSide, card: BattleCardInstance): readonly PublicEffectCandidate[] {
  const emptyNormal = state.board.squares.filter((square) => square.terrain === "normal" && !square.occupantId);
  const coordinate = (square: typeof emptyNormal[number]): PublicEffectCandidate => ({ kind: "coordinate", id: `${square.coordinate.column}:${square.coordinate.row}`, label: `Cell ${square.coordinate.column},${square.coordinate.row}` });
  if (card.catalogCardId === "AK-019") {
    const viable = Object.values(state.cardInstances).filter((candidate) => candidate.zone === "board" && candidate.position && emptyNormal.some((square) => square.lane === getLane(candidate.position!.column)));
    const lanes = new Set(viable.map((candidate) => getLane(candidate.position!.column)));
    return [
      ...viable.map((candidate, index) => ({ kind: "creature" as const, id: candidate.instanceId, label: candidate.controllerSide === side ? candidate.name : `Opponent creature ${index + 1}` })),
      ...emptyNormal.filter((square) => lanes.has(square.lane)).map(coordinate)
    ];
  }
  if (card.catalogCardId === "AK-044") {
    const lanes = (["left", "center", "right"] as const).filter((lane) => emptyNormal.filter((square) => square.lane === lane).length >= 3);
    return [...lanes.map((id) => ({ kind: "lane" as const, id, label: `${id} lane` })), ...emptyNormal.filter((square) => lanes.includes(square.lane)).map(coordinate)];
  }
  if (card.catalogCardId === "AK-054" || card.catalogCardId === "AK-059") {
    const eligibleGraveyard = state.players[side].graveyardZone.filter((id) => {
      const target = state.cardInstances[id];
      return Boolean(target && (target.type === "creature" || target.type === "creature-token") && (card.catalogCardId !== "AK-059" || target.cost <= 5));
    });
    const graves = eligibleGraveyard.map((id, index) => ({ kind: "graveyard" as const, id, label: `Graveyard card ${index + 1}` }));
    if (card.catalogCardId === "AK-054") return graves;
    const summonSquares = getSummonRangeCoordinates(state, side)
      .filter((cell) => !state.board.squares.find((square) => square.coordinate.column === cell.column && square.coordinate.row === cell.row)?.occupantId)
      .map((cell) => ({ kind: "coordinate" as const, id: `${cell.column}:${cell.row}`, label: `Cell ${cell.column},${cell.row}` }));
    return eligibleGraveyard.length >= 2 && summonSquares.length >= 2 ? [...graves, ...summonSquares] : [];
  }
  if (card.catalogCardId === "AK-011") return (["left", "center", "right"] as const).map((id) => ({ kind: "lane" as const, id, label: `${id} lane` }));
  return [];
}

function spellActions(state: BattleState, side: BattleSide, card: BattleCardInstance): readonly LegalAction[] {
  const choices = getPublicEffectChoices(state, side).filter((choice) => choice.sourceInstanceId === card.instanceId);
  if (choices.length === 0) return legalSpellAction(state, { type: "castSpell", side, handInstanceId: card.instanceId }, card);
  const structured = choices[0];
  if (structured && structured.candidates.some((candidate) => candidate.kind === "lane" || candidate.kind === "coordinate" || candidate.kind === "graveyard")) {
    const take = (kind: PublicEffectCandidate["kind"], count: number) => structured.candidates.filter((candidate) => candidate.kind === kind).slice(0, count).map((candidate) => candidate.id);
    const lane = take("lane", 1)[0]; const creatures = take("creature", 1); const graves = take("graveyard", card.catalogCardId === "AK-054" || card.catalogCardId === "AK-059" ? 2 : 0);
    const coordinateCandidates = structured.candidates.filter((candidate) => candidate.kind === "coordinate");
    const selectedCreature = creatures[0] ? state.cardInstances[creatures[0]] : undefined;
    const compatible = card.catalogCardId === "AK-019" && selectedCreature?.position ? coordinateCandidates.filter((candidate) => getLane(Number(candidate.id.split(":")[0])) === getLane(selectedCreature.position!.column)) : coordinateCandidates.filter((candidate) => !lane || getLane(Number(candidate.id.split(":")[0])) === lane);
    const coordinates = compatible.slice(0, card.catalogCardId === "AK-044" ? 3 : card.catalogCardId === "AK-059" ? 2 : 1).map((candidate) => { const [column, row] = candidate.id.split(":").map(Number); return { column: column!, row: row! }; });
    return legalSpellAction(state, { type: "castSpell", side, handInstanceId: card.instanceId, effectSelection: { ...(lane ? { lane: lane as never } : {}), ...(creatures.length ? { creatureIds: creatures } : {}), ...(graves.length ? { graveyardCardIds: graves } : {}), ...(coordinates.length ? { coordinates } : {}) } }, card);
  }
  return choices.flatMap((choice) => choice.candidates.flatMap((candidate) => legalSpellAction(state, {
    type: "castSpell", side, handInstanceId: card.instanceId,
    ...(candidate.kind === "creature" ? { targetInstanceId: candidate.id } : { targetBaseId: candidate.id as import("./types").BattleBaseId })
  }, card)));
}

function legalSpellAction(state: BattleState, command: Extract<BattleCommand, { type: "castSpell" }>, card: BattleCardInstance): readonly LegalAction[] {
  return validateBattleCommand(state, command).length === 0 ? [{ command, label: `Cast ${card.name}`, scoreHint: Math.max(1, card.currentCost) }] : [];
}

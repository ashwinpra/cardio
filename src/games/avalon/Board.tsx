import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import RulesButton from '../../components/RulesButton';
import type { AvalonState, AvalonRole, AvalonPlayer } from './types';

// ─── Role display helpers ──────────────────────────────────────────────────

const ROLE_LABELS: Record<AvalonRole, string> = {
  MERLIN: 'Merlin',
  PERCIVAL: 'Percival',
  LOYAL_SERVANT: 'Loyal Servant',
  ASSASSIN: 'Assassin',
  MORGANA: 'Morgana',
  MORDRED: 'Mordred',
  OBERON: 'Oberon',
  MINION_OF_MORDRED: 'Minion of Mordred',
};

const ROLE_FACTION: Record<AvalonRole, 'good' | 'evil'> = {
  MERLIN: 'good',
  PERCIVAL: 'good',
  LOYAL_SERVANT: 'good',
  ASSASSIN: 'evil',
  MORGANA: 'evil',
  MORDRED: 'evil',
  OBERON: 'evil',
  MINION_OF_MORDRED: 'evil',
};

function roleColor(role?: AvalonRole) {
  if (!role) return 'text-on-surface-variant';
  return ROLE_FACTION[role] === 'good' ? 'text-secondary' : 'text-error';
}

// ─── Quest tracker ─────────────────────────────────────────────────────────

function QuestTracker({
  playerCount,
  currentQuest,
  questHistory,
  successfulQuests,
  failedQuests,
}: {
  playerCount: number;
  currentQuest: number;
  questHistory: AvalonState['questHistory'];
  successfulQuests: number;
  failedQuests: number;
}) {
  const QUEST_SIZES: Record<number, number[]> = {
    5:  [2, 3, 2, 3, 3],
    6:  [2, 3, 4, 3, 4],
    7:  [2, 3, 3, 4, 4],
    8:  [3, 4, 4, 5, 5],
    9:  [3, 4, 4, 5, 5],
    10: [3, 4, 4, 5, 5],
  };
  const sizes = QUEST_SIZES[playerCount] ?? [2, 3, 2, 3, 3];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="font-label-md text-[12px] text-on-surface-variant uppercase tracking-widest">Quest Track</span>
        <span className="text-xs text-on-surface-variant">{successfulQuests}✓ {failedQuests}✗</span>
      </div>
      <div className="flex gap-2">
        {sizes.map((size, i) => {
          const result = questHistory.find((q) => q.questIndex === i);
          const isCurrent = i === currentQuest && !result;
          const isDoubleFailQuest = i === 3 && playerCount >= 7;

          return (
            <div
              key={i}
              className={`flex-1 flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all
                ${result?.success ? 'bg-secondary/20 border-secondary' : ''}
                ${result && !result.success ? 'bg-error/20 border-error' : ''}
                ${isCurrent ? 'border-primary bg-primary/10 shadow-[0_0_16px_rgba(249,115,22,0.2)] scale-105' : ''}
                ${!result && !isCurrent ? 'border-outline-variant bg-surface' : ''}
              `}
            >
              <span className="font-label-md text-[10px] uppercase text-on-surface-variant">Q{i + 1}</span>
              <span className={`font-headline-sm text-lg ${isCurrent ? 'text-primary' : result ? (result.success ? 'text-secondary' : 'text-error') : 'text-on-surface-variant'}`}>
                {result ? (result.success ? '✓' : '✗') : size}
              </span>
              {isDoubleFailQuest && (
                <span className="text-[8px] text-amber-400 font-label-md uppercase leading-none text-center">2★</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Player card ───────────────────────────────────────────────────────────

function PlayerCard({
  player,
  isMe,
  isLeader,
  isOnTeam,
  isAssassinTarget,
  visibleInfo,
  onSelect,
  selectable,
}: {
  player: AvalonPlayer & { knownAs?: string };
  isMe: boolean;
  isLeader: boolean;
  isOnTeam: boolean;
  isAssassinTarget: boolean;
  visibleInfo?: string;
  onSelect?: () => void;
  selectable: boolean;
}) {
  const initials = player.name.slice(0, 2).toUpperCase();

  return (
    <div
      onClick={selectable ? onSelect : undefined}
      className={`relative flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all duration-200
        ${selectable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg active:scale-95' : ''}
        ${isLeader ? 'border-primary bg-primary/10' : ''}
        ${isOnTeam ? 'border-secondary bg-secondary/10' : ''}
        ${isAssassinTarget ? 'border-error bg-error/10 ring-2 ring-error/50' : ''}
        ${!isLeader && !isOnTeam && !isAssassinTarget ? 'border-outline-variant bg-surface-container-lowest' : ''}
        ${!player.isConnected ? 'opacity-50' : ''}
      `}
    >
      {isLeader && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">👑</span>
      )}
      {isOnTeam && !isLeader && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">⚔️</span>
      )}

      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-headline-sm text-lg mb-2
        ${isLeader ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}
      `}>
        {initials}
      </div>

      <span className="font-label-md text-sm text-on-surface line-clamp-1 w-full">
        {player.name} {isMe && '(You)'}
      </span>

      {/* Role info */}
      {isMe && player.role && (
        <span className={`text-[11px] font-label-md mt-1 ${roleColor(player.role)}`}>
          {ROLE_LABELS[player.role]}
        </span>
      )}
      {!isMe && visibleInfo && (
        <span className="text-[11px] font-label-md mt-1 text-amber-400">
          {visibleInfo === 'EVIL_PLAYER' ? '⚫ Evil' : visibleInfo === 'MERLIN_CANDIDATE' ? '✦ Merlin?' : visibleInfo}
        </span>
      )}
      {!isMe && !visibleInfo && (
        <span className="text-[11px] font-label-md mt-1 text-on-surface-variant/50">Unknown</span>
      )}

      {!player.isConnected && (
        <span className="absolute top-2 right-2 text-[10px] font-label-md text-error bg-error-container px-1 py-0.5 rounded uppercase">
          Away
        </span>
      )}
    </div>
  );
}

// ─── Main Board ────────────────────────────────────────────────────────────

export default function AvalonBoard() {
  const { gameState: baseState, myPlayerId, sendMessage, clearSession } = useGame();
  const gameState = baseState as AvalonState & {
    myTeamVote?: string | null;
    myQuestVote?: string | null;
    visibleRoles?: Array<{ playerId: string; knownAs: string }>;
  };

  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [assassinTarget, setAssassinTarget] = useState<string | null>(null);

  if (!gameState || !myPlayerId) return null;

  const me = gameState.players.find((p) => p.id === myPlayerId) as (AvalonPlayer & { knownAs?: string }) | undefined;
  const leader = gameState.players[gameState.leaderIndex];
  const isLeader = leader?.id === myPlayerId;
  const myRole = me?.role as AvalonRole | undefined;
  const isAssassin = myRole === 'ASSASSIN';

  const visibleRolesMap = new Map(
    (gameState.visibleRoles ?? []).map((v) => [v.playerId, v.knownAs]),
  );

  const requiredTeamSize = (() => {
    const QUEST_SIZES: Record<number, number[]> = {
      5:  [2, 3, 2, 3, 3],
      6:  [2, 3, 4, 3, 4],
      7:  [2, 3, 3, 4, 4],
      8:  [3, 4, 4, 5, 5],
      9:  [3, 4, 4, 5, 5],
      10: [3, 4, 4, 5, 5],
    };
    return QUEST_SIZES[gameState.players.length]?.[gameState.currentQuest] ?? 2;
  })();

  const sendAction = (action: string, payload: Record<string, unknown> = {}) => {
    sendMessage({ type: 'AVALON_ACTION', action, ...payload });
  };

  const toggleTeamMember = (playerId: string) => {
    setSelectedTeam((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : prev.length < requiredTeamSize
          ? [...prev, playerId]
          : prev,
    );
  };

  const submitTeamProposal = () => {
    if (selectedTeam.length !== requiredTeamSize) return;
    sendAction('PROPOSE_TEAM', { teamIds: selectedTeam });
    setSelectedTeam([]);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col">
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5 max-w-6xl mx-auto w-full">

        {/* Header */}
        <header className="flex justify-between items-start border-b border-outline-variant pb-4">
          <div>
            <span className="font-label-md text-[11px] text-amber-400 uppercase tracking-widest mb-1 block">The Resistance</span>
            <h1 className="font-headline-md text-xl text-on-surface">Avalon <span className="text-on-surface-variant text-sm font-body-md">#{gameState.sessionId}</span></h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            {myRole && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-label-md
                ${ROLE_FACTION[myRole] === 'good'
                  ? 'bg-secondary/10 border-secondary/30 text-secondary'
                  : 'bg-error/10 border-error/30 text-error'}
              `}>
                <span>👁</span>
                <span>{ROLE_LABELS[myRole]}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <RulesButton />
              <button
                onClick={() => confirm('Leave this session?') && clearSession()}
                className="text-error hover:text-on-error hover:bg-error px-2 py-1 rounded text-xs transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </header>

        {/* Role reveal panel (shown after game starts and role is known) */}
        {myRole && gameState.phase !== 'LOBBY' && (gameState.visibleRoles?.length ?? 0) > 0 && (
          <div className={`rounded-xl border p-4 text-sm
            ${ROLE_FACTION[myRole] === 'good'
              ? 'bg-secondary/5 border-secondary/30'
              : 'bg-error/5 border-error/30'}
          `}>
            <p className="font-label-md text-[11px] uppercase tracking-widest text-on-surface-variant mb-2">Your Knowledge</p>
            <div className="flex flex-wrap gap-2">
              {(gameState.visibleRoles ?? []).map((v) => {
                const target = gameState.players.find((p) => p.id === v.playerId);
                return (
                  <span key={v.playerId} className={`px-2 py-1 rounded-lg text-xs font-label-md
                    ${v.knownAs === 'EVIL_PLAYER' ? 'bg-error/20 text-error' : 'bg-amber-400/20 text-amber-400'}
                  `}>
                    {target?.name ?? v.playerId}: {v.knownAs === 'EVIL_PLAYER' ? '⚫ Evil' : '✦ Merlin?'}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Quest tracker + proposal counter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 bg-surface-container-lowest rounded-xl p-4 border border-outline-variant">
            <QuestTracker
              playerCount={gameState.players.length}
              currentQuest={gameState.currentQuest}
              questHistory={gameState.questHistory}
              successfulQuests={gameState.successfulQuests}
              failedQuests={gameState.failedQuests}
            />
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant flex flex-col justify-between gap-3">
            <div>
              <p className="font-label-md text-[11px] uppercase tracking-widest text-on-surface-variant mb-1">Proposal</p>
              <div className="flex gap-2 items-center">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all
                      ${i < gameState.proposalNumber ? 'bg-error scale-90' : ''}
                      ${i === gameState.proposalNumber ? 'bg-amber-400 scale-110 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : ''}
                      ${i > gameState.proposalNumber ? 'bg-outline-variant' : ''}
                    `}
                  />
                ))}
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                {gameState.proposalNumber}/5 — 5 rejections = Evil wins
              </p>
            </div>
            <div>
              <p className="font-label-md text-[11px] uppercase tracking-widest text-on-surface-variant mb-1">Leader</p>
              <p className="font-headline-sm text-base text-on-surface">
                👑 {leader?.name ?? '—'} {leader?.id === myPlayerId && '(You)'}
              </p>
            </div>
          </div>
        </div>

        {/* Central action area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Phase-specific action panel */}
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-5 border border-outline-variant relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <span className="inline-block font-label-md text-[11px] uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
              {gameState.phase.replaceAll('_', ' ')}
            </span>

            {/* TEAM_PROPOSAL */}
            {gameState.phase === 'TEAM_PROPOSAL' && isLeader && (
              <div className="space-y-4">
                <h2 className="font-headline-md text-xl text-on-surface">Propose Your Team</h2>
                <p className="text-on-surface-variant text-sm">
                  Quest {gameState.currentQuest + 1} needs <strong className="text-primary">{requiredTeamSize} players</strong>. Select them below.
                </p>
                <p className="text-xs text-on-surface-variant">
                  Selected: {selectedTeam.length}/{requiredTeamSize}
                </p>
                <button
                  disabled={selectedTeam.length !== requiredTeamSize}
                  onClick={submitTeamProposal}
                  className={`w-full py-3 rounded-xl font-label-md uppercase tracking-wider transition-all
                    ${selectedTeam.length === requiredTeamSize
                      ? 'bg-primary text-on-primary hover:bg-primary/90 shadow-[0_4px_20px_rgba(249,115,22,0.3)] active:scale-95'
                      : 'bg-surface-variant text-on-surface-variant cursor-not-allowed'}
                  `}
                >
                  Propose Team →
                </button>
              </div>
            )}

            {gameState.phase === 'TEAM_PROPOSAL' && !isLeader && (
              <div>
                <h2 className="font-headline-md text-xl text-on-surface">Waiting for Leader</h2>
                <p className="text-on-surface-variant text-sm mt-2">
                  <strong>{leader?.name}</strong> is selecting a team of {requiredTeamSize} for Quest {gameState.currentQuest + 1}.
                </p>
              </div>
            )}

            {/* TEAM_VOTE */}
            {gameState.phase === 'TEAM_VOTE' && (
              <div className="space-y-4">
                <h2 className="font-headline-md text-xl text-on-surface">Team Vote</h2>
                <p className="text-on-surface-variant text-sm">
                  {leader?.name}'s proposed team:{' '}
                  <strong className="text-on-surface">
                    {gameState.currentTeam.map((id) => gameState.players.find((p) => p.id === id)?.name).join(', ')}
                  </strong>
                </p>
                <p className="text-xs text-on-surface-variant">
                  Votes in: {gameState.teamVotesRevealed.length}/{gameState.players.length}
                </p>

                {gameState.myTeamVote ? (
                  <div className={`p-4 rounded-xl text-center font-headline-sm
                    ${gameState.myTeamVote === 'APPROVE' ? 'bg-secondary/20 text-secondary border border-secondary/30' : 'bg-error/20 text-error border border-error/30'}
                  `}>
                    You voted {gameState.myTeamVote === 'APPROVE' ? '✓ Approve' : '✗ Reject'}
                    <p className="text-sm font-body-md mt-1 text-on-surface-variant">Waiting for others...</p>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => sendAction('TEAM_VOTE', { vote: 'APPROVE' })}
                      className="flex-1 bg-secondary text-on-secondary font-headline-sm py-4 rounded-xl hover:bg-secondary/90 transition-all active:scale-95 shadow-md"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => sendAction('TEAM_VOTE', { vote: 'REJECT' })}
                      className="flex-1 bg-error text-on-error font-headline-sm py-4 rounded-xl hover:bg-error/90 transition-all active:scale-95 shadow-md"
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}

                {/* Show revealed votes after all are in */}
                {gameState.teamVotesRevealed.length === gameState.players.length && (
                  <div className="mt-4 p-3 bg-surface-container-low rounded-lg">
                    <p className="text-xs text-on-surface-variant mb-2 uppercase font-label-md">Vote Results</p>
                    <div className="flex flex-wrap gap-2">
                      {gameState.teamVotesRevealed.map((rv, i) => {
                        const voter = gameState.players.find((p) => p.id === rv.playerId);
                        return (
                          <span key={i} className={`px-2 py-1 rounded text-xs font-label-md
                            ${rv.vote === 'APPROVE' ? 'bg-secondary/20 text-secondary' : 'bg-error/20 text-error'}
                          `}>
                            {voter?.name ?? '?'}: {rv.vote === 'APPROVE' ? '✓' : '✗'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* QUEST_VOTE */}
            {gameState.phase === 'QUEST_VOTE' && (() => {
              const isOnTeam = gameState.currentTeam.includes(myPlayerId);
              const evilFactions: AvalonRole[] = ['ASSASSIN', 'MORGANA', 'MORDRED', 'OBERON', 'MINION_OF_MORDRED'];
              const canFail = myRole && evilFactions.includes(myRole);

              return (
                <div className="space-y-4">
                  <h2 className="font-headline-md text-xl text-on-surface">Quest Vote</h2>
                  <p className="text-on-surface-variant text-sm">
                    {isOnTeam
                      ? 'You are on this quest. Submit your card secretly.'
                      : 'You are not on this quest. Waiting for the quest team to vote...'}
                  </p>

                  {isOnTeam && !gameState.myQuestVote && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => sendAction('QUEST_VOTE', { vote: 'SUCCESS' })}
                        className="flex-1 bg-secondary text-on-secondary font-headline-sm py-4 rounded-xl hover:bg-secondary/90 transition-all active:scale-95 shadow-md"
                      >
                        ✓ Success
                      </button>
                      {canFail && (
                        <button
                          onClick={() => sendAction('QUEST_VOTE', { vote: 'FAIL' })}
                          className="flex-1 bg-error text-on-error font-headline-sm py-4 rounded-xl hover:bg-error/90 transition-all active:scale-95 shadow-md"
                        >
                          ✗ Fail
                        </button>
                      )}
                    </div>
                  )}

                  {isOnTeam && gameState.myQuestVote && (
                    <div className={`p-4 rounded-xl text-center font-headline-sm
                      ${gameState.myQuestVote === 'SUCCESS' ? 'bg-secondary/20 text-secondary border border-secondary/30' : 'bg-error/20 text-error border border-error/30'}
                    `}>
                      Card submitted: {gameState.myQuestVote}
                      <p className="text-sm font-body-md mt-1 text-on-surface-variant">Waiting for teammates...</p>
                    </div>
                  )}

                  <p className="text-xs text-on-surface-variant">
                    Votes in: {
                      // Show count without revealing who — derive from questVotesRevealed which is empty during voting
                      // Count players who have voted by tracking state
                      '?'
                    }/{gameState.currentTeam.length}
                  </p>
                </div>
              );
            })()}

            {/* ASSASSINATION */}
            {gameState.phase === 'ASSASSINATION' && (
              <div className="space-y-4">
                <h2 className="font-headline-md text-xl text-on-surface">
                  {isAssassin ? '⚔️ Choose Your Target' : '⏳ Assassination Phase'}
                </h2>
                <p className="text-on-surface-variant text-sm">
                  {isAssassin
                    ? 'Good has completed 3 quests. Identify Merlin to win for Evil.'
                    : 'The Assassin is identifying Merlin. The fate of the realm hangs in the balance...'}
                </p>

                {isAssassin && (
                  <>
                    <p className="text-xs text-on-surface-variant">
                      Selected: {assassinTarget ? gameState.players.find((p) => p.id === assassinTarget)?.name : 'None'}
                    </p>
                    <button
                      disabled={!assassinTarget}
                      onClick={() => {
                        if (assassinTarget && confirm(`Assassinate ${gameState.players.find((p) => p.id === assassinTarget)?.name}?`)) {
                          sendAction('ASSASSINATE', { targetId: assassinTarget });
                        }
                      }}
                      className={`w-full py-3 rounded-xl font-label-md uppercase tracking-wider transition-all
                        ${assassinTarget
                          ? 'bg-error text-on-error hover:bg-error/90 shadow-[0_4px_20px_rgba(186,26,26,0.4)] active:scale-95'
                          : 'bg-surface-variant text-on-surface-variant cursor-not-allowed'}
                      `}
                    >
                      🗡️ Assassinate
                    </button>
                  </>
                )}
              </div>
            )}

            {/* GAME_OVER */}
            {gameState.phase === 'GAME_OVER' && (
              <div className="space-y-4">
                <h2 className="font-headline-lg text-2xl text-on-surface">Game Over</h2>
                <p className={`font-headline-sm text-2xl ${gameState.winner === 'GOOD' ? 'text-secondary' : 'text-error'}`}>
                  {gameState.winner === 'GOOD' ? '✨ Good Wins!' : '⚫ Evil Wins!'}
                </p>
                <p className="text-on-surface-variant text-sm p-3 bg-surface-container-low rounded-lg">
                  {gameState.winnerReason}
                </p>
                {/* Reveal all roles */}
                <div className="mt-4">
                  <p className="font-label-md text-[11px] uppercase tracking-widest text-on-surface-variant mb-2">Role Reveal</p>
                  <div className="flex flex-wrap gap-2">
                    {gameState.players.map((p) => {
                      const r = (p as any).role as AvalonRole | undefined;
                      return (
                        <span key={p.id} className={`px-2 py-1 rounded-lg text-xs font-label-md
                          ${r && ROLE_FACTION[r] === 'good' ? 'bg-secondary/20 text-secondary' : 'bg-error/20 text-error'}
                        `}>
                          {p.name}: {r ? ROLE_LABELS[r] : '?'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: recent event */}
          <div className="flex flex-col gap-4">
            <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant">
              <h3 className="font-label-md text-[11px] text-on-surface-variant uppercase mb-2">Recent Event</h3>
              {gameState.lastMove ? (
                <p className={`text-sm ${gameState.lastMove.success ? 'text-on-surface-variant' : 'text-error'}`}>
                  {gameState.lastMove.details}
                </p>
              ) : (
                <p className="text-sm text-on-surface-variant italic">Game started.</p>
              )}
            </div>

            {/* Quest vote reveal (after quest resolves) */}
            {gameState.questVotesRevealed.length > 0 && (
              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant">
                <h3 className="font-label-md text-[11px] text-on-surface-variant uppercase mb-2">Last Quest Cards</h3>
                <div className="flex gap-2 flex-wrap">
                  {gameState.questVotesRevealed.map((v, i) => (
                    <span key={i} className={`px-2 py-1 rounded-lg text-xs font-label-md font-bold
                      ${v === 'SUCCESS' ? 'bg-secondary/20 text-secondary' : 'bg-error/20 text-error'}
                    `}>
                      {v === 'SUCCESS' ? '✓' : '✗'} {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Player grid */}
        <section>
          <h2 className="font-headline-sm text-lg text-on-surface mb-3">
            Players
            {gameState.phase === 'TEAM_PROPOSAL' && isLeader && (
              <span className="text-sm font-body-md text-primary ml-2">(Click to select team members)</span>
            )}
            {gameState.phase === 'ASSASSINATION' && isAssassin && (
              <span className="text-sm font-body-md text-error ml-2">(Click to select assassination target)</span>
            )}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {gameState.players.map((p, idx) => {
              const playerWithKnownAs = p as AvalonPlayer & { knownAs?: string };
              const isOnCurrentTeam = gameState.currentTeam.includes(p.id);
              const isSelectedForProposal = selectedTeam.includes(p.id);

              // Selectable in team proposal (only leader, not yourself)
              const selectableForTeam =
                gameState.phase === 'TEAM_PROPOSAL' && isLeader;

              // Selectable for assassination (only Assassin, not yourself)
              const selectableForAssassination =
                gameState.phase === 'ASSASSINATION' && isAssassin && p.id !== myPlayerId;

              const selectable = selectableForTeam || selectableForAssassination;

              const handleSelect = () => {
                if (selectableForTeam) toggleTeamMember(p.id);
                if (selectableForAssassination) setAssassinTarget(p.id === assassinTarget ? null : p.id);
              };

              return (
                <div key={p.id} className="relative">
                  {isSelectedForProposal && (
                    <div className="absolute -top-2 -right-2 z-10 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-on-primary text-[10px] font-bold shadow">
                      {selectedTeam.indexOf(p.id) + 1}
                    </div>
                  )}
                  <PlayerCard
                    player={playerWithKnownAs}
                    isMe={p.id === myPlayerId}
                    isLeader={idx === gameState.leaderIndex}
                    isOnTeam={isOnCurrentTeam || isSelectedForProposal}
                    isAssassinTarget={p.id === assassinTarget}
                    visibleInfo={visibleRolesMap.get(p.id)}
                    onSelect={handleSelect}
                    selectable={selectable}
                  />
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}

import { useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import type { Party, Policy, SecretHitlerState } from './types';

function badgeColor(party: Party) {
  return party === 'LIBERAL' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800';
}

export default function SecretHitlerBoard() {
  const { gameState: baseState, myPlayerId, sendMessage, clearSession } = useGame();
  const gameState = baseState as SecretHitlerState;

  if (!gameState || !myPlayerId) return null;

  const me = gameState.players.find((p) => p.id === myPlayerId);
  const president = gameState.players.find((p) => p.id === gameState.presidentId);
  const nominated = gameState.players.find((p) => p.id === gameState.nominatedChancellorId);
  const isPresident = gameState.presidentId === myPlayerId;
  const isChancellor = gameState.nominatedChancellorId === myPlayerId;

  const canVote =
    gameState.phase === 'VOTING' &&
    !!me?.isAlive &&
    !gameState.votes[myPlayerId];

  const roleInfo = useMemo(() => {
    if (!me?.role) return 'Role hidden until game starts.';
    return `You are ${me.role}. Party: ${me.partyMembership}.`;
  }, [me?.partyMembership, me?.role]);

  const actionPlayers = gameState.players.filter((p) => p.isAlive && p.id !== myPlayerId);

  const sendAction = (action: string, payload: Record<string, unknown> = {}) => {
    sendMessage({ type: 'SECRET_HITLER_ACTION', action, ...payload });
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-[#edeeef] p-5 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#6c7a71]">Secret Hitler</p>
            <h1 className="text-2xl font-bold text-[#191c1d]">Session {gameState.sessionId}</h1>
            <p className="text-sm text-[#6c7a71] mt-1">Phase: {gameState.phase.replaceAll('_', ' ')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => confirm('Leave this session?') && clearSession()}
              className="px-4 py-2 text-sm rounded-lg bg-rose-50 border border-rose-100 text-rose-600 font-semibold"
            >
              Leave
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <StatCard label="Liberal Policies" value={`${gameState.liberalPolicies}/5`} tone="blue" />
          <StatCard label="Fascist Policies" value={`${gameState.fascistPolicies}/6`} tone="red" />
          <StatCard label="Election Tracker" value={`${gameState.electionTracker}/3`} tone="gray" />
        </div>

        <div className="bg-white rounded-2xl border border-[#edeeef] p-5">
          <p className="text-sm font-semibold text-[#191c1d] mb-1">Your secret info</p>
          <p className="text-sm text-[#6c7a71]">{roleInfo}</p>
          {!!gameState.investigateResults[myPlayerId] && (
            <p className="text-sm mt-2">
              Last investigation: {gameState.investigateResults[myPlayerId]?.targetName} is{' '}
              <span className={`px-2 py-0.5 rounded ${badgeColor(gameState.investigateResults[myPlayerId]!.party)}`}>
                {gameState.investigateResults[myPlayerId]?.party}
              </span>
            </p>
          )}
          {isPresident && gameState.executiveAction === 'POLICY_PEEK' && gameState.policyPeek && (
            <p className="text-sm mt-2 text-[#6c7a71]">Policy peek: {gameState.policyPeek.join(', ')}</p>
          )}
        </div>

        {gameState.phase === 'NOMINATE_CHANCELLOR' && isPresident && (
          <div className="bg-white rounded-2xl border border-[#edeeef] p-5">
            <p className="font-semibold mb-3">Nominate a Chancellor</p>
            <div className="flex flex-wrap gap-2">
              {actionPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => sendAction('NOMINATE_CHANCELLOR', { targetId: p.id })}
                  className="px-3 py-2 rounded-lg border border-[#edeeef] bg-[#f3f4f5] text-sm font-semibold"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState.phase === 'VOTING' && (
          <div className="bg-white rounded-2xl border border-[#edeeef] p-5">
            <p className="text-sm text-[#6c7a71] mb-2">
              President: <strong>{president?.name}</strong> nominated <strong>{nominated?.name}</strong>
            </p>
            {canVote ? (
              <div className="flex gap-2">
                <button onClick={() => sendAction('CAST_VOTE', { vote: 'JA' })} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold">
                  Ja
                </button>
                <button onClick={() => sendAction('CAST_VOTE', { vote: 'NEIN' })} className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold">
                  Nein
                </button>
              </div>
            ) : (
              <p className="text-sm text-[#6c7a71]">Waiting for all votes...</p>
            )}
          </div>
        )}

        {gameState.phase === 'LEGISLATIVE_PRESIDENT' && isPresident && (
          <PolicySelector
            title="President: discard one policy"
            policies={gameState.presidentCards}
            onPick={(policy) => sendAction('PRESIDENT_DISCARD_POLICY', { policy })}
          />
        )}

        {gameState.phase === 'LEGISLATIVE_CHANCELLOR' && isChancellor && (
          <div className="space-y-3">
            <PolicySelector
              title="Chancellor: enact one policy"
              policies={gameState.chancellorCards}
              onPick={(policy) => sendAction('CHANCELLOR_ENACT_POLICY', { policy })}
            />
            {gameState.fascistPolicies >= 5 && (
              <div className="bg-white rounded-2xl border border-[#edeeef] p-5">
                <p className="text-sm text-[#6c7a71] mb-2">Veto power is unlocked. You may request veto from the president.</p>
                <button
                  onClick={() => sendAction('CHANCELLOR_REQUEST_VETO')}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold"
                >
                  Request Veto
                </button>
              </div>
            )}
          </div>
        )}

        {gameState.phase === 'VETO_RESPONSE' && isPresident && (
          <div className="bg-white rounded-2xl border border-[#edeeef] p-5">
            <p className="font-semibold mb-2">Chancellor requested a veto.</p>
            <p className="text-sm text-[#6c7a71] mb-3">Accepting discards both policies and advances election tracker by 1.</p>
            <div className="flex gap-2">
              <button
                onClick={() => sendAction('PRESIDENT_VETO_RESPONSE', { accept: true })}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold"
              >
                Accept Veto
              </button>
              <button
                onClick={() => sendAction('PRESIDENT_VETO_RESPONSE', { accept: false })}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold"
              >
                Reject Veto
              </button>
            </div>
          </div>
        )}

        {gameState.phase === 'EXECUTIVE_ACTION' && isPresident && (
          <div className="bg-white rounded-2xl border border-[#edeeef] p-5">
            <p className="font-semibold mb-3">Executive Action: {gameState.executiveAction}</p>
            <div className="flex flex-wrap gap-2">
              {actionPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => sendAction('PRESIDENT_EXECUTIVE_ACTION', { targetId: p.id })}
                  className="px-3 py-2 rounded-lg border border-[#edeeef] bg-[#f3f4f5] text-sm font-semibold"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {!!gameState.lastMove && (
          <div className="bg-white rounded-2xl border border-[#edeeef] p-5">
            <p className="text-xs uppercase tracking-wider text-[#6c7a71] mb-2">Latest Move</p>
            <p className="text-sm text-[#191c1d]">{gameState.lastMove.details}</p>
          </div>
        )}

        {gameState.phase === 'GAME_OVER' && (
          <div className="bg-white rounded-2xl border border-[#edeeef] p-6 text-center">
            <h2 className="text-2xl font-bold text-[#191c1d]">Game Over</h2>
            <p className="text-sm text-[#6c7a71] mt-2">
              Winner: <strong>{gameState.winner}</strong> - {gameState.winnerReason}
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#edeeef] p-5">
          <p className="font-semibold mb-3">Players</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {gameState.players.map((p) => (
              <div key={p.id} className="rounded-xl border border-[#edeeef] p-3">
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-xs text-[#6c7a71]">{p.isAlive ? 'Alive' : 'Eliminated'}</p>
                {gameState.presidentId === p.id && <p className="text-xs mt-1 text-emerald-700">President</p>}
                {gameState.nominatedChancellorId === p.id && <p className="text-xs mt-1 text-blue-700">Chancellor nominee</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'red' | 'gray' }) {
  const toneClass = tone === 'blue' ? 'bg-blue-50' : tone === 'red' ? 'bg-rose-50' : 'bg-slate-50';
  return (
    <div className={`rounded-2xl border border-[#edeeef] p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wider text-[#6c7a71]">{label}</p>
      <p className="text-2xl font-bold text-[#191c1d]">{value}</p>
    </div>
  );
}

function PolicySelector({
  title,
  policies,
  onPick,
}: {
  title: string;
  policies: Policy[];
  onPick: (policy: Policy) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#edeeef] p-5">
      <p className="font-semibold mb-3">{title}</p>
      <div className="flex gap-2">
        {policies.map((policy, idx) => (
          <button
            key={`${policy}-${idx}`}
            onClick={() => onPick(policy)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              policy === 'LIBERAL' ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {policy}
          </button>
        ))}
      </div>
    </div>
  );
}

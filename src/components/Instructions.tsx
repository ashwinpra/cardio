import { GAME_RULES } from '../constants/rules';

export default function Instructions({ 
  gameId, 
  onBack, 
  onStart 
}: { 
  gameId: string, 
  onBack: () => void, 
  onStart?: () => void 
}) {
  const rules = GAME_RULES[gameId] || {
    title: 'Unknown Game',
    description: 'Rules for this game are not available.',
    playerCount: '',
    objective: 'Win the game.',
    setup: [],
    steps: [],
    tips: []
  };

  return (
    <div className="flex flex-col font-body-md text-on-surface w-full h-full bg-surface">
      <header className="flex items-center justify-between p-4 border-b border-outline-variant bg-surface-container-lowest w-full sticky top-0 z-10 shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-primary hover:text-surface-tint font-label-md text-sm px-3 py-2 rounded-lg hover:bg-primary-container/10 transition-colors">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back
        </button>
        {onStart && (
          <button onClick={onStart} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md text-sm hover:opacity-90 transition-opacity active:scale-95 shadow-sm">
            Start Game
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-12 w-full custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          {/* Title & Description */}
          <div className="mb-12">
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">{rules.title}</h1>
            {rules.playerCount && (
              <span className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant bg-surface-container px-3 py-1 rounded-full border border-outline-variant/30 mb-4">
                <span className="material-symbols-outlined text-[16px]">group</span>
                {rules.playerCount}
              </span>
            )}
            <p className="text-body-lg text-on-surface-variant leading-relaxed mt-3">
              {rules.description}
            </p>
          </div>

          {/* Objective */}
          <section className="mb-10 p-6 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary mb-3">Objective</h2>
            <p className="text-body-md text-on-surface">{rules.objective}</p>
          </section>

          {/* Setup */}
          {rules.setup.length > 0 && (
            <section className="mb-10">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Setup</h2>
              <div className="grid gap-3">
                {rules.setup.map((step: string, index: number) => (
                  <div key={index} className="flex gap-4 p-4 rounded-xl bg-surface-container border border-outline-variant/50">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-tertiary-container/20 text-tertiary flex items-center justify-center font-headline-sm text-sm border border-tertiary/20">
                      {index + 1}
                    </div>
                    <p className="text-body-md text-on-surface leading-relaxed pt-1">{step}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* How to Play */}
          <section className="mb-10">
            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">How to Play</h2>
            <div className="grid gap-4">
              {rules.steps.map((step: string, index: number) => (
                <div key={index} className="flex gap-4 p-4 rounded-xl bg-surface-container border border-outline-variant/50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-container/20 text-primary flex items-center justify-center font-headline-sm text-sm border border-primary/20">
                    {index + 1}
                  </div>
                  <p className="text-body-md text-on-surface leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Game-specific reference tables */}
          {gameId === 'COUP' && (
            <section className="mb-10">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Character Reference</h2>
              <div className="overflow-x-auto rounded-xl border border-outline-variant">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface">
                      <th className="p-4 border-b border-outline-variant font-label-md">Character</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Action</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Effect</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Can Block</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-container-lowest text-body-md text-on-surface-variant">
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-tertiary">Duke</td>
                      <td className="p-4">Tax</td>
                      <td className="p-4">Take 3 coins from the treasury</td>
                      <td className="p-4">Blocks Foreign Aid</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-on-surface">Assassin</td>
                      <td className="p-4">Assassinate</td>
                      <td className="p-4">Pay 3 coins to force a player to lose an influence</td>
                      <td className="p-4 text-outline-variant">—</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-primary">Captain</td>
                      <td className="p-4">Steal</td>
                      <td className="p-4">Take 2 coins from another player</td>
                      <td className="p-4">Blocks Stealing</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-secondary">Ambassador</td>
                      <td className="p-4">Exchange</td>
                      <td className="p-4">Draw 2 cards from the deck, choose which to keep</td>
                      <td className="p-4">Blocks Stealing</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-error">Contessa</td>
                      <td className="p-4 text-outline-variant">—</td>
                      <td className="p-4 text-outline-variant">—</td>
                      <td className="p-4">Blocks Assassination</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2 className="font-headline-sm text-headline-sm text-on-surface mt-8 mb-4">General Actions</h2>
              <div className="overflow-x-auto rounded-xl border border-outline-variant">
                <table className="w-full text-left border-collapse min-w-[400px]">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface">
                      <th className="p-4 border-b border-outline-variant font-label-md">Action</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Effect</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Blockable?</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-container-lowest text-body-md text-on-surface-variant">
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-on-surface">Income</td>
                      <td className="p-4">Take 1 coin</td>
                      <td className="p-4 text-outline-variant">No</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-on-surface">Foreign Aid</td>
                      <td className="p-4">Take 2 coins</td>
                      <td className="p-4">Yes (by Duke)</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-on-surface">Coup</td>
                      <td className="p-4">Pay 7 coins to force a player to lose an influence</td>
                      <td className="p-4 text-outline-variant">No</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {gameId === 'LOVE_LETTER' && (
            <section className="mb-10">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Card Reference</h2>
              <div className="overflow-x-auto rounded-xl border border-outline-variant">
                <table className="w-full text-left border-collapse min-w-[550px]">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface">
                      <th className="p-4 border-b border-outline-variant font-label-md w-16">Value</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Card</th>
                      <th className="p-4 border-b border-outline-variant font-label-md w-12">Qty</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Effect</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-container-lowest text-body-md text-on-surface-variant">
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-primary">1</td>
                      <td className="p-4 font-bold">Guard</td>
                      <td className="p-4">×5</td>
                      <td className="p-4">Name a non-Guard card and choose a player. If they hold it, they're eliminated.</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-primary">2</td>
                      <td className="p-4 font-bold">Priest</td>
                      <td className="p-4">×2</td>
                      <td className="p-4">Secretly look at another player's hand.</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-primary">3</td>
                      <td className="p-4 font-bold">Baron</td>
                      <td className="p-4">×2</td>
                      <td className="p-4">Compare hands with a player; lower card is eliminated.</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-primary">4</td>
                      <td className="p-4 font-bold">Handmaid</td>
                      <td className="p-4">×2</td>
                      <td className="p-4">You are immune to all effects until your next turn.</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-primary">5</td>
                      <td className="p-4 font-bold">Prince</td>
                      <td className="p-4">×2</td>
                      <td className="p-4">A player (or yourself) discards their hand and draws a new card.</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-primary">6</td>
                      <td className="p-4 font-bold">King</td>
                      <td className="p-4">×1</td>
                      <td className="p-4">Trade hands with another player.</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-primary">7</td>
                      <td className="p-4 font-bold">Countess</td>
                      <td className="p-4">×1</td>
                      <td className="p-4">Must be played if you also hold the King or Prince. No effect.</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-primary">8</td>
                      <td className="p-4 font-bold">Princess</td>
                      <td className="p-4">×1</td>
                      <td className="p-4">If you play or discard this card, you are eliminated. Highest value.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {gameId === 'HANABI' && (
            <section className="mb-10">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Card Distribution</h2>
              <div className="overflow-x-auto rounded-xl border border-outline-variant">
                <table className="w-full text-left border-collapse min-w-[400px]">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface">
                      <th className="p-4 border-b border-outline-variant font-label-md">Number</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Copies per Color</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Rarity</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-container-lowest text-body-md text-on-surface-variant">
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-on-surface">1</td>
                      <td className="p-4">3 copies</td>
                      <td className="p-4">Common — safe to discard one</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-on-surface">2</td>
                      <td className="p-4">2 copies</td>
                      <td className="p-4">Moderate — be cautious</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-on-surface">3</td>
                      <td className="p-4">2 copies</td>
                      <td className="p-4">Moderate — be cautious</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-on-surface">4</td>
                      <td className="p-4">2 copies</td>
                      <td className="p-4">Moderate — be cautious</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-error">5</td>
                      <td className="p-4">1 copy</td>
                      <td className="p-4 font-semibold text-error">Unique — never discard!</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {gameId === 'SECRET_HITLER' && (
            <section className="mb-10">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Role Distribution</h2>
              <div className="overflow-x-auto rounded-xl border border-outline-variant">
                <table className="w-full text-left border-collapse min-w-[400px]">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface">
                      <th className="p-4 border-b border-outline-variant font-label-md">Players</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Liberals</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Fascists</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Hitler Knows Fascists?</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-container-lowest text-body-md text-on-surface-variant">
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-on-surface">5–6</td>
                      <td className="p-4">3–4</td>
                      <td className="p-4">1 + Hitler</td>
                      <td className="p-4">Yes</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-on-surface">7–8</td>
                      <td className="p-4">4–5</td>
                      <td className="p-4">2 + Hitler</td>
                      <td className="p-4">No</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-on-surface">9–10</td>
                      <td className="p-4">5–6</td>
                      <td className="p-4">3 + Hitler</td>
                      <td className="p-4">No</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Tips & Strategy */}
          {rules.tips.length > 0 && (
            <section className="mb-10">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">
                <span className="inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary-container text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
                  Tips & Strategy
                </span>
              </h2>
              <div className="grid gap-3">
                {rules.tips.map((tip: string, index: number) => (
                  <div key={index} className="flex gap-3 p-4 rounded-xl bg-tertiary-container/5 border border-tertiary-container/20">
                    <span className="material-symbols-outlined text-tertiary-container text-lg flex-shrink-0 mt-0.5">tips_and_updates</span>
                    <p className="text-body-md text-on-surface leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

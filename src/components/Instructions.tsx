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
    objective: 'Win the game.',
    steps: []
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
          <div className="mb-12">
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-4">{rules.title}</h1>
            <p className="text-body-lg text-on-surface-variant leading-relaxed">
              {rules.description}
            </p>
          </div>

          <section className="mb-10 p-6 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary mb-3">Objective</h2>
            <p className="text-body-md text-on-surface">{rules.objective}</p>
          </section>

          <section className="space-y-6">
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

          {gameId === 'COUP' && (
            <section className="mt-10 mb-10">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Character Actions & Blocks</h2>
              <div className="overflow-x-auto rounded-xl border border-outline-variant">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface">
                      <th className="p-4 border-b border-outline-variant font-label-md">Character</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Action</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Effect</th>
                      <th className="p-4 border-b border-outline-variant font-label-md">Counteraction</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-container-lowest text-body-md text-on-surface-variant">
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-tertiary">Duke</td>
                      <td className="p-4">Tax</td>
                      <td className="p-4">Take 3 coins</td>
                      <td className="p-4">Blocks Foreign Aid</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-on-surface">Assassin</td>
                      <td className="p-4">Assassinate</td>
                      <td className="p-4">Pay 3 coins to assassinate a player</td>
                      <td className="p-4 text-outline-variant">-</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-primary">Captain</td>
                      <td className="p-4">Steal</td>
                      <td className="p-4">Take 2 coins from another player</td>
                      <td className="p-4">Blocks Steal</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-secondary">Ambassador</td>
                      <td className="p-4">Exchange</td>
                      <td className="p-4">Draw 2 cards, exchange up to 2</td>
                      <td className="p-4">Blocks Steal</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-error">Contessa</td>
                      <td className="p-4 text-outline-variant">-</td>
                      <td className="p-4 text-outline-variant">-</td>
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
                    </tr>
                  </thead>
                  <tbody className="bg-surface-container-lowest text-body-md text-on-surface-variant">
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-on-surface">Income</td>
                      <td className="p-4">Take 1 coin</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-on-surface">Foreign Aid</td>
                      <td className="p-4">Take 2 coins (can be blocked by Duke)</td>
                    </tr>
                    <tr className="border-b border-outline-variant/50">
                      <td className="p-4 font-bold text-on-surface">Coup</td>
                      <td className="p-4">Pay 7 coins to force a player to lose an influence</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

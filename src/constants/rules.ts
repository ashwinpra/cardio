export const GAME_RULES: Record<string, {
  title: string;
  description: string;
  playerCount: string;
  objective: string;
  setup: string[];
  steps: string[];
  tips: string[];
}> = {
  'SECRET_HITLER': {
    title: 'Secret Hitler',
    description: 'A dramatic game of political intrigue and betrayal set in 1930s Germany. Players are secretly divided into two teams — Liberals and Fascists. The Fascists know each other and must sow distrust, while the Liberals must work together to root out the hidden threat. One Fascist is secretly Hitler, and their identity is the key to the entire game.',
    playerCount: '5–10 players',
    objective: 'Liberals win by enacting 5 Liberal Policies or by assassinating Hitler. Fascists win by enacting 6 Fascist Policies or by electing Hitler as Chancellor after 3 or more Fascist Policies have already been enacted.',
    setup: [
      'Each player is secretly assigned a role: Liberal, Fascist, or Hitler. The number of Fascists scales with the player count.',
      'At the start, all players close their eyes. Fascists (except Hitler) open their eyes to see each other. Hitler raises a thumb so the Fascists can identify them, but Hitler does not know who the other Fascists are (in games of 7+ players).',
      'The Policy deck is shuffled. It contains 6 Liberal and 11 Fascist Policy tiles — the deck is intentionally stacked against the Liberals.',
      'A random player is chosen as the first Presidential Candidate.'
    ],
    steps: [
      'Election Phase: The current Presidential Candidate nominates another player to be their Chancellor. Players cannot nominate the previous President or Chancellor (term limits).',
      'Voting: All players simultaneously vote "Ja!" (yes) or "Nein!" (no). A simple majority passes the government. If the vote fails, the presidency moves clockwise and the Election Tracker advances by one.',
      'Election Tracker: If three governments fail in a row, the top Policy card is automatically enacted with no discussion — this can be devastating.',
      'Legislative Session: If the government is elected, the President draws 3 Policy tiles, secretly discards one, and passes the remaining 2 to the Chancellor. The Chancellor then discards one and enacts the other. Both players may lie about what they saw.',
      'Executive Actions: Certain Fascist Policy slots on the board grant the President a special power — such as investigating a player\'s party loyalty, choosing the next Presidential Candidate, or executing a player. If Hitler is executed, Liberals win immediately.',
      'Fascist Victory by Election: At any point after 3 Fascist Policies have been enacted, if Hitler is elected Chancellor, the Fascists immediately win. This makes late-game Chancellor nominations extremely tense.'
    ],
    tips: [
      'As a Liberal, pay close attention to what Presidents and Chancellors claim about the policies they drew. Inconsistencies reveal Fascists.',
      'As a Fascist, blend in with the Liberals. Accuse others and build trust before striking.',
      'Track voting patterns — players who consistently vote for suspicious governments may be Fascists.',
      'The Policy deck is heavily Fascist-leaning (11 Fascist vs 6 Liberal), so enacting Fascist policies doesn\'t always mean the government is evil.'
    ]
  },
  'COUP': {
    title: 'Coup',
    description: 'You are the head of a family in an Italian city-state, a society run by a weak and corrupt court. You need to manipulate, bluff, and bribe your way to power. Your object is to destroy the influence of all the other families, forcing them into exile. Only one family will survive.',
    playerCount: '2–6 players',
    objective: 'Be the last player with at least one face-down influence card (character). Eliminate all other players by forcing them to lose both of their influence cards.',
    setup: [
      'The deck contains 3 copies each of 5 characters: Duke, Assassin, Captain, Ambassador, and Contessa (15 cards total).',
      'Each player is dealt 2 face-down cards — these are your "influences." You may look at your own cards at any time, but keep them hidden from others.',
      'Each player starts with 2 coins. The remaining coins form the treasury.'
    ],
    steps: [
      'On your turn, choose exactly one action. You may take a General Action (Income, Foreign Aid, or Coup) or claim a Character Action (Tax, Assassinate, Steal, or Exchange).',
      'Income: Take 1 coin from the treasury. This cannot be challenged or blocked.',
      'Foreign Aid: Take 2 coins from the treasury. Cannot be challenged, but any player can block it by claiming to have the Duke.',
      'Coup: Pay 7 coins to force any player to lose one influence (flip a card face-up). This cannot be challenged or blocked. If you have 10+ coins at the start of your turn, you must Coup.',
      'Character Actions: You can claim any character to use its action, even if you don\'t actually have that card. Duke (Tax) = take 3 coins. Assassin (Assassinate) = pay 3 coins to force a player to lose an influence. Captain (Steal) = take 2 coins from another player. Ambassador (Exchange) = draw 2 cards from the deck and swap with your hand.',
      'Challenges: Any player can challenge an action or a block. If challenged, you must prove you have the claimed character by revealing it. If you do have it, the challenger loses an influence and your card is reshuffled into the deck (you draw a new one). If you don\'t have it, you lose an influence and your action fails.',
      'Blocks: Some actions can be blocked. Duke blocks Foreign Aid. Contessa blocks Assassination. Captain or Ambassador blocks Stealing. A block can itself be challenged.',
      'When you lose an influence, flip one of your face-down cards face-up. It remains visible for the rest of the game. If both your cards are face-up, you are eliminated.'
    ],
    tips: [
      'Bluffing is the core of the game — you don\'t need to have a character to claim its action, but getting caught is costly.',
      'If you have 10+ coins, you must Coup. Don\'t let opponents accumulate coins unchecked.',
      'Challenging is risky but powerful. If you suspect a bluff, a well-timed challenge can turn the game.',
      'Pay attention to what characters have been revealed — if two Dukes are face-up, someone claiming Duke is more likely bluffing.'
    ]
  },
  'LOVE_LETTER': {
    title: 'Love Letter',
    description: 'In Love Letter, you are a suitor trying to get your love letter delivered to the Princess. Each round, you draw a card and play a card, using its effect to try to eliminate your rivals or deduce their hands. The game is quick, elegant, and full of deduction.',
    playerCount: '2–4 players',
    objective: 'Win the round by either being the last player standing or by holding the highest-value card when the deck runs out. Win enough rounds to earn the required number of tokens of affection.',
    setup: [
      'The deck has 16 cards: five Guards (1), two Priests (2), two Barons (3), two Handmaids (4), two Princes (5), one King (6), one Countess (7), and one Princess (8).',
      'Shuffle the deck and remove 1 card face-down (no one may look at it). This ensures no one can have perfect information.',
      'Deal 1 card face-down to each player. The remaining cards form the draw pile.'
    ],
    steps: [
      'On your turn, draw 1 card from the deck so you have 2 cards in hand. Then choose 1 to play face-up and resolve its effect. You keep the other card.',
      'Guard (1): Name a non-Guard card and choose a player. If that player holds the named card, they are eliminated. The most common card and your primary weapon for elimination.',
      'Priest (2): Choose a player and secretly look at their hand. This gives you powerful information for future turns.',
      'Baron (3): Choose a player and privately compare hands. The player with the lower-value card is eliminated. If tied, nothing happens.',
      'Handmaid (4): You are protected from all card effects until your next turn. No one can target you.',
      'Prince (5): Choose any player (including yourself) to discard their hand and draw a new card. If the discarded card is the Princess, that player is eliminated.',
      'King (6): Choose another player and trade hands with them.',
      'Countess (7): If you hold the King or Prince alongside the Countess, you must play the Countess. She has no effect, but her high value makes her strong at end of round.',
      'Princess (8): If you ever play or discard the Princess (for any reason), you are immediately eliminated. She has the highest value, so hold her to win — but she makes you a target.',
      'The round ends when the deck is empty or only one player remains. If multiple players survive, the one holding the highest card wins the round and earns a token of affection.'
    ],
    tips: [
      'Guards are your bread and butter — use information from Priests and process of elimination to make accurate Guard guesses.',
      'The Handmaid is extremely powerful when you\'re holding a high card. Play her to protect yourself for a full round.',
      'If someone plays a Handmaid, they likely have something worth protecting.',
      'Track which cards have been played to narrow down what opponents might be holding.'
    ]
  },
  'AVALON': {
    title: 'The Resistance: Avalon',
    description: 'Avalon is a hidden-role social deduction game for 5–10 players set in the world of Arthurian legend. Players are secretly divided into Good (Loyal Servants of Arthur) and Evil (Minions of Mordred). Good players must complete quests; Evil players must sabotage them — but nobody knows who to trust.',
    playerCount: '5–10 players',
    objective: 'Good wins by successfully completing 3 quests AND correctly surviving the Assassination phase. Evil wins by failing 3 quests, causing 5 consecutive rejected team proposals, or successfully assassinating Merlin.',
    setup: [
      'Each player is secretly assigned a hidden role. Key special roles: Merlin (Good, sees Evil), Percival (Good, sees Merlin & Morgana), Assassin (Evil, targets Merlin at game end), Morgana (Evil, disguised as Merlin to Percival), Mordred (Evil, hidden from Merlin), Oberon (Evil, unknown to other Evil players).',
      'At game start, players close their eyes. Evil players (except Oberon) open their eyes to see each other. Merlin opens their eyes to see Evil players (except Mordred). Percival opens their eyes to see two candidates — one is Merlin, one may be Morgana.',
      'A random player begins as the first Leader (indicated by the Leader crown).'
    ],
    steps: [
      'Team Proposal: The current Leader selects the required number of players for the quest (shown in the Quest Tracker). Team size varies by quest and player count.',
      'Team Vote: ALL players simultaneously vote Approve or Reject. If strictly more than half approve, the team goes on the quest. If rejected, the Leader passes clockwise and a new proposal is made. If 5 consecutive proposals are rejected, Evil wins immediately.',
      'Quest Vote: Only the selected team members secretly vote Success or Fail. Good players MUST vote Success. Evil players may vote either. Votes are shuffled and revealed anonymously — no one knows who played which card.',
      'Quest Resolution: One or more Fail cards = quest fails (in 7+ player games, Quest 4 requires 2 Fail cards to fail). The result is recorded and the game advances to the next quest.',
      'Assassination (if Good completes 3 quests): The Assassin gets one chance to identify and eliminate Merlin. If they succeed, Evil wins despite Good\'s three quest victories. If they miss, Good wins.'
    ],
    tips: [
      'As Merlin, share information subtly — if Evil identifies you, you lose. Act confused sometimes even when you know the truth.',
      'As Evil, vote strategically on team proposals. Consistent REJECT votes make you look suspicious.',
      'Track who proposes who for quests. Evil players often protect each other.',
      'Percival: watch how Merlin reacts to votes and proposals — their behavior under pressure is a clue to their true identity.',
      'If only 1 Fail card appears on a quest, at least one Evil player was on that team. Work backward from who was proposed.'
    ]
  },
  'HANABI': {
    title: 'Hanabi',
    description: 'Hanabi (Japanese for "fireworks") is a cooperative card game where you and your team work together to put on a spectacular fireworks show. The twist: you can see everyone\'s cards except your own. You must rely on your teammates\' hints to figure out what to play.',
    playerCount: '2–5 players',
    objective: 'Collaboratively build five fireworks displays (one per color: Red, Blue, Green, Yellow, White), each in ascending order from 1 to 5. The maximum score is 25 points (one point per successfully played card).',
    setup: [
      'The deck has 50 cards: 5 colors × 10 cards each. Per color, there are three 1s, two 2s, two 3s, two 4s, and one 5.',
      'Deal cards face-out to each player (they hold cards so they CANNOT see their own hand, but CAN see everyone else\'s). With 2–3 players: 5 cards each. With 4–5 players: 4 cards each.',
      'Place 8 Hint tokens and 3 Fuse (mistake) tokens in the center of the table.'
    ],
    steps: [
      'On your turn, you must perform exactly one of three actions: Give a Hint, Discard a Card, or Play a Card.',
      'Give a Hint: Spend 1 Hint token and tell one other player about all cards in their hand that match a single color OR a single number. You must point out ALL matching cards — partial hints are not allowed. (Example: "These two cards are Blue" or "This card is a 3.")',
      'Discard a Card: Choose a card from your hand to discard. This recovers 1 Hint token. Then draw a new card (face-out, so you can\'t see it). Be careful — some cards are irreplaceable (especially 5s, of which there is only one per color).',
      'Play a Card: Choose a card from your hand and attempt to add it to the matching firework stack. If it\'s the correct next number (e.g., a Blue 3 on a Blue 2), it\'s placed successfully. If not, it\'s discarded and 1 Fuse token is lost.',
      'Bonus: Successfully playing a 5 (completing a firework) recovers 1 Hint token.',
      'If all 3 Fuse tokens are lost, the game ends immediately in a loss. Otherwise, the game ends when the deck runs out (each player gets one more turn) or all 25 cards are played (perfect score!).'
    ],
    tips: [
      'The 5s are unique — there\'s only one of each color. Never discard a 5 unless you\'re certain it\'s not needed.',
      'Hint tokens are precious. Discard cards you know are useless to recover them.',
      'Pay attention to what hints your teammates give you. The timing and choice of hint often carry implicit information.',
      'Before giving a hint, consider whether your teammate might misinterpret it and play the wrong card.'
    ]
  },
  'LITERATURE': {
    title: 'Literature',
    description: 'Literature is a team-based card game of memory, deduction, and strategy. Two teams race to collect "books" — complete half-suits of cards. The game rewards careful observation: every question asked reveals information, and a sharp team can piece together the entire puzzle.',
    playerCount: '6 or 8 players (two equal teams)',
    objective: 'Claim more books than the opposing team. With 6 players there are 9 books; with 8 players there are 8 books. The team with the majority wins.',
    setup: [
      'Use a standard 52-card deck with all four 8s removed, leaving 48 cards. Players sit in alternating team order (Team A, Team B, Team A, Team B, ...).',
      'The 48 cards form 9 "books" (half-suits). Low books contain 2, 3, 4, 5, 6, 7 of each suit. High books contain 9, 10, J, Q, K, A of each suit. The 9th book is a special Joker book (if playing with 6 players).',
      'All cards are dealt evenly to all players. With 6 players, each gets 8 cards. With 8 players, each gets 6 cards.'
    ],
    steps: [
      'On your turn, ask any player on the opposing team for a specific card (e.g., "Do you have the 5 of Hearts?"). You must hold at least one card from the same book to ask, and you cannot ask for a card you already have.',
      'If the opponent has the card, they must give it to you. Your turn continues — you may ask again (same or different opponent).',
      'If the opponent does not have the card, your turn ends immediately and it becomes that opponent\'s turn.',
      'Claiming a Book: At any point during your turn, if you believe your team collectively holds all cards of a book, you may attempt to claim it. You must declare exactly which teammate holds each card of the book.',
      'If your claim is correct, your team wins the book. If any part of the claim is wrong, the opposing team is awarded the book instead — so be certain before claiming!',
      'The game ends when all books have been claimed. The team with more books wins.'
    ],
    tips: [
      'Every question reveals information — even failed ones. If Alice asks Bob for the 3 of Spades, you now know Alice has at least one card in the Low Spades book.',
      'Remember what cards have been transferred. Keeping a mental map of who has what is the key skill in this game.',
      'Communicate with your teammates through your questions — a well-chosen ask can signal what you have without saying it directly.',
      'Don\'t wait too long to claim a book. If an opponent claims it first (correctly), you lose it even if your team held the cards.',
      'If you lose all your cards, you can no longer ask or be asked, but your team can still claim books that include cards you previously transferred.'
    ]
  },
  'SPADES': {
    title: 'Spades',
    description: 'Spades is a classic trick-taking partnership game played with a standard 52-card deck. Partners sit across from each other and must accurately predict how many tricks they will win each round. Spades are always trump, making them the most powerful suit.',
    playerCount: '4 players (2 teams of 2)',
    objective: 'Be the first team to reach 500 points. Score points by accurately bidding and winning tricks. Avoid accumulating too many "bags" (overtricks), which result in a penalty.',
    setup: [
      'Four players sit in two partnerships, with partners seated across from each other.',
      'All 52 cards are dealt out evenly — each player receives 13 cards.',
      'Cards rank from Ace (high) down to 2 (low) within each suit. Spades always beat non-Spade suits (trump).'
    ],
    steps: [
      'Bidding: After looking at your hand, each player bids the number of tricks they expect to win (1 through 13). Your team\'s bids are added together to form the team contract. For example, if you bid 4 and your partner bids 3, your team must win at least 7 tricks.',
      'Playing Tricks: The player to the dealer\'s left leads the first trick. Each player plays one card clockwise. You must follow the suit that was led if you can. If you cannot follow suit, you may play any card, including a Spade.',
      'Breaking Spades: Spades cannot be led until they have been "broken" — meaning a Spade has been played on a previous trick (because someone couldn\'t follow suit). Exception: if your hand contains only Spades, you may lead one.',
      'Winning a Trick: The highest Spade played wins the trick. If no Spades were played, the highest card of the led suit wins. The winner of each trick leads the next one.',
      'Scoring — Making Your Bid: If your team wins at least as many tricks as your combined bid, you score 10 points per trick bid. Any extra tricks beyond the bid are called "bags" and are worth 1 point each.',
      'Bag Penalty: If your team accumulates 10 bags across multiple rounds, you lose 100 points and the bag counter resets. This discourages reckless overbidding.',
      'Scoring — Failing Your Bid: If your team wins fewer tricks than your combined bid, you score nothing for that round and lose 10 points per trick bid. For example, a team that bid 5 but only won 4 tricks loses 50 points.'
    ],
    tips: [
      'Bid accurately — overbidding leads to penalties, but underbidding wastes potential points.',
      'Aces and Kings in long suits are usually safe bids. Short suits give you opportunities to trump with Spades.',
      'Pay attention to which cards have been played. Counting Spades is especially important.',
      'Communicate through your plays — leading a high card in a suit signals strength, while a low lead may signal weakness.'
    ]
  }
};

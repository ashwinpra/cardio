export const GAME_RULES: Record<string, { title: string; description: string; objective: string; steps: string[] }> = {
  'SECRET_HITLER': {
    title: 'Secret Hitler',
    description: 'A dramatic game of political intrigue and betrayal set in 1930s Germany. Players are secretly divided into two teams - Liberals and Fascists. Known only to each other, the Fascists coordinate to sow distrust and install their cold-blooded leader.',
    objective: 'Liberals win by enacting 5 Liberal Policies or assassinating Secret Hitler. Fascists win by enacting 6 Fascist Policies or electing Secret Hitler as Chancellor after 3 Fascist Policies have been enacted.',
    steps: [
      'Each round, the President selects a Chancellor candidate.',
      'The government is voted on by all players.',
      'If the government passes, the President draws 3 policies, discards 1, and gives 2 to the Chancellor.',
      'The Chancellor discards 1 policy and enacts the other.',
      'Fascist policies may grant the President special powers (e.g., examine allegiance, assassinate a player).'
    ]
  },
  'COUP': {
    title: 'Coup',
    description: 'You are head of a family in an Italian city-state run by a weak and corrupt court. You need to manipulate, bluff and bribe your way to power.',
    objective: 'Destroy the influence of all other families, forcing them into exile. Only one family will survive.',
    steps: [
      'You start with two coins and two influence (face-down character cards).',
      'On your turn, you can take any action (Income, Foreign Aid, Coup, or a Character Action).',
      'You can claim to have any character card to take its action. Other players can challenge you.',
      'If you are challenged and cannot reveal the claimed character, you lose an influence.',
      'If you successfully prove you have the character, the challenger loses an influence.',
      'A Coup costs 7 coins and forces another player to lose an influence.'
    ]
  },
  'LOVE_LETTER': {
    title: 'Love Letter',
    description: 'Your goal is to get your love letter into Princess Annette\'s hands while deflecting the letters from competing suitors.',
    objective: 'Have the highest value card in your hand at the end of the round, or be the last player remaining in the round.',
    steps: [
      'Each player starts with one card in their hand.',
      'On your turn, draw one card and play one card from your hand, applying its effect.',
      'Card effects allow you to guess others\' cards, compare hands, or protect yourself.',
      'If you are knocked out of the round, you cannot win.',
      'The round ends when the deck is empty. The highest card wins a token of affection.'
    ]
  },
  'HANABI': {
    title: 'Hanabi',
    description: 'A cooperative card game in which players try to create the perfect fireworks show by placing the cards on the table in the right order.',
    objective: 'Play cards of all 5 colors in order from 1 to 5 to score the maximum 25 points.',
    steps: [
      'You cannot see your own hand of cards. You can only see other players\' hands.',
      'On your turn, you must either give a hint, discard a card, or play a card.',
      'To give a hint, spend a hint token and tell one player all cards in their hand of one color or one number.',
      'Discarding a card recovers a hint token.',
      'Playing a card adds it to the fireworks. If it does not fit the sequence, you gain a mistake token.',
      'Three mistakes end the game immediately.'
    ]
  },
  'LITERATURE': {
    title: 'Literature',
    description: 'A competitive card game where two teams race to collect "books" (half-suits of cards). It requires memory, deduction, and teamwork.',
    objective: 'Collect more books than the opposing team. There are 9 total books.',
    steps: [
      'The deck is dealt completely to all players. Players are split into two teams.',
      'On your turn, you can ask any opponent for a specific card, provided you have at least one card of that same book.',
      'If they have it, they must give it to you and your turn continues.',
      'If they do not have it, your turn ends and it becomes their turn.',
      'When your team holds all cards of a book, you must "Claim" it. If you claim incorrectly, the other team gets the book.'
    ]
  },
  'SPADES': {
    title: 'Spades',
    description: 'A classic trick-taking game played in partnerships where Spades are always trump.',
    objective: 'Accurately bid the number of tricks you will take and win exactly that many to reach 500 points.',
    steps: [
      'Each round, players bid the number of tricks they expect to take. Team bids are combined.',
      'Players must follow the suit led if possible. If not, they may play a Spade or another suit.',
      'Spades trump all other suits. The highest card of the led suit wins, unless a Spade is played.',
      'Winning exactly your bid scores 10 points per trick. Extra tricks ("bags") score 1 point but penalize you if you accumulate 10.',
      'Failing to meet your bid results in a penalty of 10 times the bid.'
    ]
  }
};

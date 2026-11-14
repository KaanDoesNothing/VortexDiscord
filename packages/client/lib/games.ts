// Game rules for /slots, /blackjack and /highlow, kept free of Discord code so they can be tested.
// Payouts are tuned so the house keeps a small edge; otherwise players could farm infinite coins.

// ---------- Slots ----------

// Symbol weights: higher = more common. Three of a kind pays `pays` × bet, two cherries pay 1.5×,
// and any other pair gives half the bet back. Expected return is about 0.93 per coin bet.
export const SLOT_SYMBOLS = [
    { emoji: "🍒", weight: 30, pays: 5 },
    { emoji: "🍋", weight: 25, pays: 10 },
    { emoji: "🍇", weight: 20, pays: 12 },
    { emoji: "🔔", weight: 13, pays: 30 },
    { emoji: "⭐", weight: 8, pays: 60 },
    { emoji: "💎", weight: 4, pays: 250 }
] as const;
const SLOT_TOTAL = SLOT_SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
export const CHERRY_PAIR_PAYS = 1.5;
export const OTHER_PAIR_PAYS = 0.5;

export function spinReel(rand = Math.random) {
    let roll = rand() * SLOT_TOTAL;
    for (const symbol of SLOT_SYMBOLS) {
        if ((roll -= symbol.weight) < 0) return symbol;
    }
    return SLOT_SYMBOLS[0];
}

// Returns the three reels and the payout multiplier (0 = lose).
export function playSlots(rand = Math.random) {
    const reels = [spinReel(rand), spinReel(rand), spinReel(rand)];
    const [a, b, c] = reels;
    let multiplier = 0;
    if (a!.emoji === b!.emoji && b!.emoji === c!.emoji) multiplier = a!.pays;
    else if (reels.filter((r) => r.emoji === "🍒").length === 2) multiplier = CHERRY_PAIR_PAYS;
    else if (a!.emoji === b!.emoji || b!.emoji === c!.emoji || a!.emoji === c!.emoji) multiplier = OTHER_PAIR_PAYS;
    return { reels: reels.map((r) => r.emoji), multiplier };
}

// ---------- Blackjack ----------

export interface Card { rank: string; value: number; suit: string }

export function newDeck(rand = Math.random): Card[] {
    const suits = ["♠", "♥", "♦", "♣"];
    const ranks: [string, number][] = [["A", 11], ["2", 2], ["3", 3], ["4", 4], ["5", 5], ["6", 6], ["7", 7], ["8", 8], ["9", 9], ["10", 10], ["J", 10], ["Q", 10], ["K", 10]];
    const deck = suits.flatMap((suit) => ranks.map(([rank, value]) => ({ rank, value, suit })));
    // Fisher–Yates shuffle.
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }
    return deck;
}

// Best hand total, counting aces as 1 when 11 would bust.
export function handValue(hand: Card[]) {
    let total = hand.reduce((sum, c) => sum + c.value, 0);
    let aces = hand.filter((c) => c.rank === "A").length;
    while (total > 21 && aces-- > 0) total -= 10;
    return total;
}

export const isBlackjack = (hand: Card[]) => hand.length === 2 && handValue(hand) === 21;
export const showHand = (hand: Card[]) => hand.map((c) => `\`${c.rank}${c.suit}\``).join(" ");

// Dealer draws to 17 (stands on all 17s).
export function playDealer(dealer: Card[], deck: Card[]) {
    while (handValue(dealer) < 17) dealer.push(deck.pop()!);
}

export type BlackjackOutcome = "blackjack" | "win" | "push" | "lose" | "bust";

// Settles a finished hand. Returns the outcome and how much of the bet is paid back (stake included).
export function settleBlackjack(player: Card[], dealer: Card[]): { outcome: BlackjackOutcome; returnMultiplier: number } {
    const p = handValue(player), d = handValue(dealer);
    if (p > 21) return { outcome: "bust", returnMultiplier: 0 };
    if (isBlackjack(player) && !isBlackjack(dealer)) return { outcome: "blackjack", returnMultiplier: 2.5 };
    if (isBlackjack(dealer) && !isBlackjack(player)) return { outcome: "lose", returnMultiplier: 0 };
    if (d > 21 || p > d) return { outcome: "win", returnMultiplier: 2 };
    if (p === d) return { outcome: "push", returnMultiplier: 1 };
    return { outcome: "lose", returnMultiplier: 0 };
}

// ---------- High / low ----------

// The hidden number is 1-100. The payout for a guess is based on its real odds with a 5% edge,
// so a "safe" guess pays little and a risky one pays a lot. Equal numbers refund the bet.
export const HIGHLOW_MAX = 100;
const HOUSE = 0.95;

export function highLowOdds(shown: number) {
    const higher = (HIGHLOW_MAX - shown) / (HIGHLOW_MAX - 1);
    const lower = (shown - 1) / (HIGHLOW_MAX - 1);
    // Multiplier is the total returned (stake included); floored to 2 decimals.
    const mult = (p: number) => (p > 0 ? Math.floor((HOUSE / p) * 100) / 100 : 0);
    return { higher: mult(higher), lower: mult(lower) };
}

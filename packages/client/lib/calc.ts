// A small, safe math expression evaluator for /calc. No eval: the input is tokenized and parsed
// with a recursive-descent parser, so only numbers, operators and the functions below are possible.
//
// Supports: + - * / % ^ (power), parentheses, unary minus, implicit multiplication like 2pi or 3(4+1),
// constants pi, e, tau, and functions sqrt cbrt abs round floor ceil sin cos tan asin acos atan
// log (base 10) ln log2 exp min max.

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil,
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    log: Math.log10, ln: Math.log, log2: Math.log2, exp: Math.exp, min: Math.min, max: Math.max
};
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

type Token = { type: "num"; value: number } | { type: "id"; value: string } | { type: "op"; value: string };

export class CalcError extends Error {}

function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    // Friendly aliases.
    const src = input.toLowerCase().replace(/×/g, "*").replace(/÷/g, "/").replace(/\*\*/g, "^").replace(/π/g, "pi");
    let i = 0;

    while (i < src.length) {
        const ch = src[i]!;
        if (/\s/.test(ch)) { i++; continue; }

        if (/[\d.]/.test(ch)) {
            const m = /^\d*\.?\d+(e[+-]?\d+)?|^\d+\.?/.exec(src.slice(i))!;
            tokens.push({ type: "num", value: Number(m[0]) });
            i += m[0].length;
            continue;
        }
        if (/[a-z]/.test(ch)) {
            const m = /^[a-z][a-z0-9]*/.exec(src.slice(i))!;
            tokens.push({ type: "id", value: m[0] });
            i += m[0].length;
            continue;
        }
        if ("+-*/%^()".includes(ch) || ch === ";") {
            tokens.push({ type: "op", value: ch === ";" ? "," : ch });
            i++;
            continue;
        }
        if (ch === ",") { tokens.push({ type: "op", value: "," }); i++; continue; }
        throw new CalcError(`Unexpected character "${ch}"`);
    }
    return tokens;
}

export function evaluate(input: string): number {
    if (input.length > 300) throw new CalcError("Expression is too long");
    const tokens = tokenize(input);
    let pos = 0;

    const peek = () => tokens[pos];
    const isOp = (v: string) => peek()?.type === "op" && peek()!.value === v;
    const expect = (v: string) => {
        if (!isOp(v)) throw new CalcError(`Expected "${v}"`);
        pos++;
    };

    // expression := term (("+" | "-") term)*
    function expression(): number {
        let value = term();
        while (isOp("+") || isOp("-")) {
            const op = tokens[pos++]!.value;
            value = op === "+" ? value + term() : value - term();
        }
        return value;
    }

    // term := power (("*" | "/" | "%") power | implicit-multiplication)*
    function term(): number {
        let value = unary();
        for (;;) {
            if (isOp("*") || isOp("/") || isOp("%")) {
                const op = tokens[pos++]!.value;
                const rhs = unary();
                if ((op === "/" || op === "%") && rhs === 0) throw new CalcError("Division by zero");
                value = op === "*" ? value * rhs : op === "/" ? value / rhs : value % rhs;
            } else if (peek() && (peek()!.type !== "op" || isOp("("))) {
                // "2pi", "3(4+1)", "2 sqrt(4)"
                value *= unary();
            } else break;
        }
        return value;
    }

    // unary := ("-" | "+") unary | power
    function unary(): number {
        if (isOp("-")) { pos++; return -unary(); }
        if (isOp("+")) { pos++; return unary(); }
        return power();
    }

    // power := primary ("^" unary)?   (right-associative: 2^3^2 = 2^9)
    function power(): number {
        const base = primary();
        if (isOp("^")) { pos++; return base ** unary(); }
        return base;
    }

    function primary(): number {
        const t = peek();
        if (!t) throw new CalcError("Unexpected end of expression");

        if (t.type === "num") { pos++; return t.value; }

        if (t.type === "id") {
            pos++;
            if (t.value in CONSTANTS) return CONSTANTS[t.value]!;
            const fn = FUNCTIONS[t.value];
            if (!fn) throw new CalcError(`Unknown name "${t.value}"`);

            expect("(");
            const args = [expression()];
            while (isOp(",")) { pos++; args.push(expression()); }
            expect(")");
            return fn(...args);
        }

        if (isOp("(")) {
            pos++;
            const value = expression();
            expect(")");
            return value;
        }

        throw new CalcError(`Unexpected "${t.value}"`);
    }

    if (!tokens.length) throw new CalcError("Empty expression");
    const result = expression();
    if (pos < tokens.length) throw new CalcError(`Unexpected "${tokens[pos]!.value}"`);
    if (!Number.isFinite(result)) throw new CalcError("The result isn't a finite number");
    return result;
}

// Pretty-prints a result: up to 10 significant digits, no floating-point noise like 0.30000000000000004.
export const formatResult = (n: number) => (Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-6 && n !== 0) ? n.toExponential(6) : Number(n.toPrecision(12)).toLocaleString("en-US", { maximumFractionDigits: 10 }));

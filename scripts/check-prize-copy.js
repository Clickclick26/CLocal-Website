#!/usr/bin/env node
/**
 * Blocks two copy mistakes that have each shipped more than once.
 *
 * 1. Prize copy that promises everybody a prize. The first cut of the
 *    Glandore video said "For Glandore members" over a picture of a voucher,
 *    which reads as a voucher each. It was rewritten. Then the partner pack
 *    said "giving away several brunch vouchers to people who join before the
 *    end of the month", which reads the same way, and that shipped too.
 *    A partner whose members all turn up at General Merchants expecting
 *    brunch is a partner we never get a second ask from.
 *
 * 2. A fixed count of winners. There are SEVERAL vouchers and one VIP year.
 *    The rules page, the hero prize card and the partner pack all said "one
 *    winner" or "two winners" at once, which understated the odds on three
 *    public pages and made the rules page wrong about its own draw.
 *
 * 3. "an app for finding independent places", which describes a directory.
 *    The two things that are ours are that it is video-first, and that you
 *    support local businesses and get rewarded for it.
 *
 * Run over everything: node scripts/check-prize-copy.js
 * Run over named files:  node scripts/check-prize-copy.js a.html b.html
 * The pre-commit hook runs it over staged files.
 */

const fs = require("fs");
const path = require("path");

const RULES = [
  {
    id: "prize-for-everyone",
    // "giving away <prize> to people who join" and friends. The tell is a
    // giving verb with no draw word anywhere near it.
    re: /\b(giving away|give away|get|gets|receive|receives)\b[^.!?]{0,120}\b(voucher|vouchers|VIP)\b[^.!?]{0,120}\b(everyone|every member|all members|people who join|anyone who joins|when you join)\b/gi,
    why: 'Reads as though everybody who joins gets a prize. Say "prize draw" and "to be won".',
  },
  {
    id: "prize-for-everyone-reverse",
    re: /\b(everyone|every member|all members|people who join|anyone who joins)\b[^.!?]{0,120}\b(giving away|gets a|get a|receives a|receive a)\b[^.!?]{0,60}\b(voucher|VIP)\b/gi,
    why: 'Reads as though everybody who joins gets a prize. Say "prize draw" and "to be won".',
  },
  {
    id: "prize-with-no-draw-word",
    // The subtle one, and the one that actually shipped: "giving away brunch
    // vouchers ... while the waitlist is open" names no recipient at all, so
    // none of the patterns above catch it, and it still reads as a handout.
    // A sentence that gives a prize has to also say it is won.
    sentence: true,
    needs: /\b(giving away|give away|handing out|free (?:brunch )?vouchers?)\b/i,
    and: /\b(voucher|vouchers|VIP)\b/i,
    unless: /\b(draw|to be won|chance|win|wins|winner|winners|entered|enter)\b/i,
    why: 'Gives a prize without saying it is won. Add "prize draw" or "to be won".',
  },
  {
    id: "fixed-winner-count",
    re: /\b(one winner|two winners|both winners|a single winner|one person wins)\b/gi,
    why: "There are several vouchers plus one VIP year. Do not state a winner count.",
  },
  {
    id: "directory-positioning",
    re: /\bapp for finding\b/gi,
    why: 'Describes a directory. Use video-first, and supporting local businesses while getting rewarded for it.',
  },
];

/** Files whose copy actually reaches a reader. */
const EXTS = new Set([".html", ".js", ".md", ".txt"]);
const SKIP_DIRS = new Set([".git", "node_modules", "assets", "images", "r", "win", "academy"]);
// This file quotes every banned phrase on purpose, as does the rules page's
// own explanation of how the draw works.
const SKIP_FILES = new Set(["scripts/check-prize-copy.js"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".githooks") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (EXTS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

const argFiles = process.argv.slice(2).filter((f) => fs.existsSync(f));
const files = (argFiles.length ? argFiles : walk("."))
  .map((f) => path.relative(".", f))
  .filter((f) => !SKIP_FILES.has(f) && EXTS.has(path.extname(f)));

let found = 0;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  for (const rule of RULES) {
    if (rule.sentence) {
      // Sentence-level: a clause that gives a prize must also say it is won.
      // Split on sentence ends AND on the literal \n escapes that live inside
      // the page's own JS string concatenations, or a whole caption counts as
      // one sentence and any stray "win" elsewhere in it excuses the lot.
      // Blank the HTML tags before splitting, keeping every character
      // position: "...is open.</p>" has no whitespace after the full stop, so
      // a plain sentence split swallowed the next paragraph whole and any
      // stray "winner" in it excused the sentence before. Tags become spaces
      // of the same length, so offsets and line numbers stay exact.
      const flat = text.replace(/<[^>]+>/g, (t) => " ".repeat(t.length));
      let offset = 0;
      for (const part of flat.split(/(?<=[.!?])\s+|\\n/)) {
        const at = flat.indexOf(part, offset);
        offset = at + part.length;
        if (!rule.needs.test(part) || !rule.and.test(part)) continue;
        if (rule.unless.test(part)) continue;
        const line = flat.slice(0, at).split("\n").length;
        found++;
        console.error(`\n${file}:${line}  [${rule.id}]`);
        console.error(`  ${part.trim().slice(0, 160)}`);
        console.error(`  ${rule.why}`);
      }
      continue;
    }
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text)) !== null) {
      const line = text.slice(0, m.index).split("\n").length;
      found++;
      console.error(`\n${file}:${line}  [${rule.id}]`);
      console.error(`  ${lines[line - 1].trim().slice(0, 160)}`);
      console.error(`  ${rule.why}`);
    }
  }
}

if (found) {
  console.error(`\n${found} prize/positioning copy problem(s). Fix them or add a deliberate exception to scripts/check-prize-copy.js.\n`);
  process.exit(1);
}
console.log(`✓ Prize and positioning copy clean (${files.length} files).`);

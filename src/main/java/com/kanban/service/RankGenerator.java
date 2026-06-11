package com.kanban.service;

import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

/**
 * Fractional lexicographic rank generator.
 *
 * Ranks are arbitrary-length lowercase strings ('a'–'z'). Lexicographic
 * order equals display order, so a reorder is always a single-row UPDATE
 * on the moved item — siblings are never renumbered.
 *
 * Invariants:
 *   between(lo, hi) returns r such that lo < r < hi  (both may be null)
 *   between(null, x) → something before x
 *   between(x, null) → something after x  (simply x + 'n')
 *   between(null, null) → "n"
 *
 * When two ranks become lexicographically adjacent (no room between them),
 * an IllegalStateException is thrown — the caller must invoke
 * rebalanceColumn() to regenerate evenly-spaced ranks.
 */
@Component
public class RankGenerator {

    static final char FIRST = 'a';   // minimum character
    static final char LAST  = 'z';   // maximum character
    static final char MID   = 'n';   // (0+25)/2 = 12 → 'a'+13 = 'n'

    /**
     * Returns a rank strictly between lo and hi.
     * Pass null for lo to mean "before all existing ranks".
     * Pass null for hi to mean "after all existing ranks".
     */
    public String between(@Nullable String lo, @Nullable String hi) {
        if (lo == null && hi == null) return String.valueOf(MID);
        if (lo == null)  return beforeStr(hi);
        if (hi == null)  return lo + MID;   // appending any char preserves lex order

        if (lo.compareTo(hi) >= 0) {
            throw new IllegalArgumentException(
                "lo must be strictly less than hi; got lo='" + lo + "' hi='" + hi + "'");
        }
        return midStr(lo, hi);
    }

    // ---- private helpers ------------------------------------------------

    /** Returns a string strictly less than hi. */
    private String beforeStr(String hi) {
        for (int i = 0; i < hi.length(); i++) {
            char c = hi.charAt(i);
            if (c > FIRST) {
                // halve the gap between FIRST and c at position i
                char half = (char) (FIRST + (c - FIRST) / 2);
                return hi.substring(0, i) + half;
            }
            // c == FIRST: the result must share this prefix, keep scanning
        }
        // hi consists entirely of 'a' — nothing can precede it in this alphabet
        throw new IllegalStateException(
            "Cannot rank before minimum rank '" + hi + "'; call rebalanceColumn() first.");
    }

    /** Returns the lexicographic midpoint between a and b where a < b. */
    private String midStr(String a, String b) {
        // Case: b starts with a as a prefix → b = a + firstSuffix + …
        if (b.startsWith(a)) {
            char firstSuffix = b.charAt(a.length());
            if (firstSuffix > FIRST) {
                // Insert minimum char: a + FIRST is between a and a+firstSuffix
                return a + FIRST;
            }
            // firstSuffix == FIRST → b = a + 'a' + rest; no room at this level
            throw new IllegalStateException(
                "Ranks '" + a + "' and '" + b + "' are too close; call rebalanceColumn() first.");
        }

        // Find first position where a and b differ
        int i = 0;
        while (i < a.length() && i < b.length() && a.charAt(i) == b.charAt(i)) i++;

        // a[i] < b[i] is guaranteed since a < b and they share prefix a[0..i-1]
        char ac = a.charAt(i);
        char bc = b.charAt(i);

        if (bc - ac > 1) {
            // Direct midpoint character available at position i
            return a.substring(0, i) + (char) (ac + (bc - ac) / 2);
        }

        // bc == ac + 1 (adjacent chars): append the midpoint char to a
        // Result is a + MID, which is > a (longer string) and < b (starts with ac < bc)
        return a + MID;
    }

    /**
     * Stubs out rank regeneration for a column.
     * TODO: implement — redistribute all cards in the column with evenly-spaced ranks
     * (e.g. "a","f","k","p","u"…) whenever {@link #between} throws for that column.
     */
    public void rebalanceColumn(java.util.UUID columnId) {
        throw new UnsupportedOperationException(
            "rebalanceColumn not yet implemented for column " + columnId);
    }
}
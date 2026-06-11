package com.kanban;

import com.kanban.service.RankGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RankGeneratorTest {

    private RankGenerator gen;

    @BeforeEach
    void setUp() { gen = new RankGenerator(); }

    // ---- null-bound cases ----

    @Test
    void bothNull_returnsMid() {
        assertEquals("n", gen.between(null, null));
    }

    @Test
    void nullLo_returnsBeforeHi() {
        String r = gen.between(null, "n");
        assertTrue(r.compareTo("n") < 0, "expected r < 'n', got: " + r);
        assertFalse(r.isEmpty());
    }

    @Test
    void nullHi_returnsAfterLo() {
        String r = gen.between("n", null);
        assertTrue(r.compareTo("n") > 0, "expected r > 'n', got: " + r);
    }

    @Test
    void nullHi_appendsMidChar() {
        // between(x, null) = x + 'n' — deterministic
        assertEquals("an", gen.between("a", null));
        assertEquals("zn", gen.between("z", null));
    }

    // ---- basic midpoint cases ----

    @Test
    void basicMidpoint_az() {
        String r = gen.between("a", "z");
        assertTrue("a".compareTo(r) < 0, "r must be > 'a'");
        assertTrue(r.compareTo("z") < 0, "r must be < 'z'");
    }

    @Test
    void basicMidpoint_directGap() {
        // 'a'(0) and 'c'(2) — midpoint is 'b'(1)
        assertEquals("b", gen.between("a", "c"));
    }

    @Test
    void adjacentChars_appendsMid() {
        // 'a' and 'b' are adjacent → result is "an" (a + mid)
        String r = gen.between("a", "b");
        assertTrue("a".compareTo(r) < 0);
        assertTrue(r.compareTo("b") < 0);
    }

    @Test
    void longerLo_adjacentAtRoot() {
        // lo="an", hi="b" → 'a' and 'b' adjacent at root → "an" + mid
        String r = gen.between("an", "b");
        assertTrue("an".compareTo(r) < 0);
        assertTrue(r.compareTo("b") < 0);
    }

    // ---- prefix edge case ----

    @Test
    void hiStartsWithLo_roomAvailable() {
        // "nb" starts with "n" + 'b' (> 'a') → insert "na"
        String r = gen.between("n", "nb");
        assertTrue("n".compareTo(r) < 0);
        assertTrue(r.compareTo("nb") < 0);
    }

    @Test
    void hiStartsWithLo_tooClose_throws() {
        // "na" starts with "n" + 'a' (== FIRST) → no room
        assertThrows(IllegalStateException.class, () -> gen.between("n", "na"));
    }

    @Test
    void nullLoBeforeMinimum_throws() {
        // "a" is the minimum rank — nothing can precede it
        assertThrows(IllegalStateException.class, () -> gen.between(null, "a"));
    }

    @Test
    void invalidOrder_throws() {
        assertThrows(IllegalArgumentException.class, () -> gen.between("z", "a"));
        assertThrows(IllegalArgumentException.class, () -> gen.between("n", "n"));
    }

    // ---- successive inserts (the most important real-world test) ----

    @Test
    void manySuccessiveInsertsAtEnd() {
        // Keep inserting after the last rank (null hi = unbounded above)
        String lo = "n";
        for (int i = 0; i < 30; i++) {
            String r = gen.between(lo, null);
            assertTrue(lo.compareTo(r) < 0, "rank must grow: got " + r + " after " + lo);
            lo = r;
        }
    }

    @Test
    void manySuccessiveInsertsAtBeginning() {
        // n→g→d→b→a exhausts the single-char space; 4 is the safe limit before
        // rebalanceColumn() would be required.
        String hi = "n";
        for (int i = 0; i < 4; i++) {
            String r = gen.between(null, hi);
            assertTrue(r.compareTo(hi) < 0, "rank must shrink: got " + r + " before " + hi);
            hi = r;
        }
    }

    @Test
    void manyInsertsBetweenSamePair_remainsOrdered() {
        // Insert repeatedly between "a" and "b", driving lo forward each time
        String lo = "a", hi = "b";
        List<String> ranks = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            String r = gen.between(lo, hi);
            assertTrue(lo.compareTo(r) < 0, "r=" + r + " must be > lo=" + lo);
            assertTrue(r.compareTo(hi)  < 0, "r=" + r + " must be < hi=" + hi);
            ranks.add(r);
            lo = r; // move lower bound forward
        }
        // All generated ranks must be distinct
        assertEquals(ranks.size(), ranks.stream().distinct().count());
        // And already sorted (since each was inserted at the "lo" end)
        List<String> sorted = new ArrayList<>(ranks);
        Collections.sort(sorted);
        assertEquals(sorted, ranks);
    }

    @Test
    void insertBetweenEachPair_preservesOrder() {
        // Simulate a 5-column board insertion test
        List<String> ranks = new ArrayList<>(List.of("e", "j", "n", "s", "x"));
        // Insert between each adjacent pair
        for (int i = 0; i < ranks.size() - 1; i++) {
            String r = gen.between(ranks.get(i), ranks.get(i + 1));
            ranks.add(i + 1, r);
            i++; // skip the newly inserted element in outer loop
        }
        List<String> sorted = new ArrayList<>(ranks);
        Collections.sort(sorted);
        assertEquals(sorted, ranks, "All ranks must remain in sorted order after interleaving");
    }
}
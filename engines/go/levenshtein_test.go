package main

import (
	"testing"
)

func TestDistance(t *testing.T) {
	cases := []struct {
		a, b string
		want int
	}{
		{"cat", "cat", 0},
		{"cat", "Cat", 0},  // case-insensitive
		{"cat", "bat", 1},  // substitution
		{"cat", "ca", 1},   // deletion
		{"cat", "cart", 1}, // insertion
		{"", "abc", 3},
		{"abc", "", 3},
		{"", "", 0},
		{"kitten", "sitting", 3}, // classic example
		{"saturday", "sunday", 3},
	}

	for _, c := range cases {
		got := distance(c.a, c.b)
		if got != c.want {
			t.Errorf("distance(%q, %q) = %d, want %d", c.a, c.b, got, c.want)
		}
	}
}

func TestSearch(t *testing.T) {
	dict := []string{"bat", "hat", "sat", "cat", "car", "bar", "dog", "log", "fog"}

	t.Run("exact delta=1 from cat", func(t *testing.T) {
		res := Search("cat", 1, 10, dict)
		want := map[string]bool{"bat": true, "hat": true, "sat": true, "car": true}
		if len(res.Words) != len(want) {
			t.Fatalf("got %v, want %v", res.Words, want)
		}
		for _, w := range res.Words {
			if !want[w] {
				t.Errorf("unexpected result %q", w)
			}
		}
	})

	t.Run("limit is respected", func(t *testing.T) {
		res := Search("cat", 1, 2, dict)
		if len(res.Words) != 2 {
			t.Errorf("got %d results, want 2", len(res.Words))
		}
	})

	t.Run("no results", func(t *testing.T) {
		res := Search("zzz", 1, 10, dict)
		if len(res.Words) != 0 {
			t.Errorf("expected no results, got %v", res.Words)
		}
	})

	t.Run("delta=0 returns only exact match", func(t *testing.T) {
		res := Search("cat", 0, 10, dict)
		if len(res.Words) != 1 || res.Words[0] != "cat" {
			t.Errorf("got %v, want [cat]", res.Words)
		}
	})

	t.Run("case-insensitive match", func(t *testing.T) {
		mixedDict := []string{"Bat", "HAT", "sat"}
		res := Search("cat", 1, 10, mixedDict)
		if len(res.Words) != 3 {
			t.Errorf("got %v, want [Bat HAT sat]", res.Words)
		}
	})
}

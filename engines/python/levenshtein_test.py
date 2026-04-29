import unittest
from levenshtein import distance, main
import sys
from io import StringIO
from unittest.mock import patch

# cd engines/python && python3 -m unittest levenshtein_test -v

class TestDistance(unittest.TestCase):

    def test_identical(self):
        self.assertEqual(distance("cat", "cat"), 0)

    def test_case_insensitive(self):
        self.assertEqual(distance("cat", "Cat"), 0)
        self.assertEqual(distance("CAT", "cat"), 0)

    def test_substitution(self):
        self.assertEqual(distance("cat", "bat"), 1)

    def test_deletion(self):
        self.assertEqual(distance("cat", "ca"), 1)

    def test_insertion(self):
        self.assertEqual(distance("cat", "cart"), 1)

    def test_empty_strings(self):
        self.assertEqual(distance("", ""), 0)
        self.assertEqual(distance("", "abc"), 3)
        self.assertEqual(distance("abc", ""), 3)

    def test_classic_kitten_sitting(self):
        self.assertEqual(distance("kitten", "sitting"), 3)

    def test_saturday_sunday(self):
        self.assertEqual(distance("saturday", "sunday"), 3)


class TestMain(unittest.TestCase):

    def _run(self, word, delta, limit, candidates):
        stdin = "\n".join(candidates) + "\n"
        with patch("sys.argv", ["levenshtein.py", word, str(delta), str(limit)]):
            with patch("sys.stdin", StringIO(stdin)):
                with patch("sys.stdout", new_callable=StringIO) as mock_out:
                    main()
                    return mock_out.getvalue()

    def _results(self, word, delta, limit, candidates):
        import json
        return json.loads(self._run(word, delta, limit, candidates))["results"]

    def test_basic_delta1(self):
        candidates = ["bat", "hat", "sat", "cat", "car", "bar", "dog"]
        results = self._results("cat", 1, 10, candidates)
        self.assertCountEqual(results, ["bat", "hat", "sat", "car"])

    def test_limit_respected(self):
        candidates = ["bat", "hat", "sat", "car"]
        results = self._results("cat", 1, 2, candidates)
        self.assertEqual(len(results), 2)

    def test_no_results(self):
        results = self._results("zzzzqqqq", 1, 10, ["cat", "dog", "bat"])
        self.assertEqual(results, [])

    def test_delta_zero_exact_match_only(self):
        candidates = ["cat", "bat", "hat"]
        results = self._results("cat", 0, 10, candidates)
        self.assertEqual(results, ["cat"])

    def test_case_insensitive_candidates(self):
        candidates = ["Bat", "HAT", "sat"]
        results = self._results("cat", 1, 10, candidates)
        self.assertCountEqual(results, ["Bat", "HAT", "sat"])

    def test_duration_ms_present(self):
        import json
        out = self._run("cat", 1, 5, ["bat", "hat"])
        data = json.loads(out)
        self.assertIn("duration_ms", data)
        self.assertIsInstance(data["duration_ms"], int)


if __name__ == "__main__":
    unittest.main()

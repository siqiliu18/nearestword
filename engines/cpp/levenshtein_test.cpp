#include <iostream>
#include <string>
#include <cstdlib>
#include "distance.h"

static int passed = 0;

void check(const std::string& name, int got, int want) {
    if (got != want) {
        std::cerr << "FAIL " << name << ": got " << got << ", want " << want << "\n";
        std::exit(1);
    }
    std::cout << "PASS " << name << "\n";
    passed++;
}

int main() {
    check("identical",          distance("cat", "cat"),       0);
    check("case_insensitive",   distance("cat", "Cat"),       0);
    check("case_insensitive_2", distance("CAT", "cat"),       0);
    check("substitution",       distance("cat", "bat"),       1);
    check("deletion",           distance("cat", "ca"),        1);
    check("insertion",          distance("cat", "cart"),      1);
    check("empty_a",            distance("", "abc"),          3);
    check("empty_b",            distance("abc", ""),          3);
    check("both_empty",         distance("", ""),             0);
    check("kitten_sitting",     distance("kitten", "sitting"),3);
    check("saturday_sunday",    distance("saturday", "sunday"),3);

    std::cout << "\n" << passed << " tests passed.\n";
    return 0;
}

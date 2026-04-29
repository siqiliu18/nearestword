SDK      := $(shell xcrun --show-sdk-path)
CXX      := clang++
CXXFLAGS := -O2 -std=c++17 -Wall \
             -I$(SDK)/usr/include/c++/v1 \
             -I$(SDK)/usr/include

.PHONY: all test clean

all: levenshtein

levenshtein: levenshtein.cpp distance.h
	$(CXX) $(CXXFLAGS) -o levenshtein levenshtein.cpp

levenshtein_test: levenshtein_test.cpp distance.h
	$(CXX) $(CXXFLAGS) -o levenshtein_test levenshtein_test.cpp

test: levenshtein_test
	./levenshtein_test

clean:
	rm -f levenshtein levenshtein_test

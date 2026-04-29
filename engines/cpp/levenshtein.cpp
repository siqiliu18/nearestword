#include <iostream>
#include <string>
#include <vector>
#include <chrono>
#include <cstdlib>
#include "distance.h"

int main(int argc, char* argv[]) {
    if (argc != 4) {
        std::cerr << "usage: levenshtein <word> <delta> <limit>\n";
        return 1;
    }

    std::string word = argv[1];
    int delta = std::stoi(argv[2]);
    int limit = std::stoi(argv[3]);
    int wordLen = static_cast<int>(word.size());

    auto start = std::chrono::high_resolution_clock::now();

    std::vector<std::string> results;
    std::string line;
    while (static_cast<int>(results.size()) < limit && std::getline(std::cin, line)) {
        if (line.empty()) continue;
        int len = static_cast<int>(line.size());
        if (std::abs(len - wordLen) <= delta && distance(word, line) == delta)
            results.push_back(line);
    }

    auto end = std::chrono::high_resolution_clock::now();
    long long ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

    std::cout << "{\"duration_ms\":" << ms << ",\"results\":[";
    for (size_t i = 0; i < results.size(); i++) {
        if (i > 0) std::cout << ",";
        std::cout << "\"" << results[i] << "\"";
    }
    std::cout << "]}" << std::endl;

    return 0;
}

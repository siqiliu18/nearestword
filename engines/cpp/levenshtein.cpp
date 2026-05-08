#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include <chrono>
#include <cstdlib>
#include <cctype>

inline int distance(const std::string& a, const std::string& b) {
    int m = a.size(), n = b.size();
    std::vector<int> prev(n + 1), curr(n + 1);
    for (int j = 0; j <= n; j++) prev[j] = j;
    for (int i = 1; i <= m; i++) {
        curr[0] = i;
        for (int j = 1; j <= n; j++) {
            if (std::tolower((unsigned char)a[i-1]) == std::tolower((unsigned char)b[j-1]))
                curr[j] = prev[j-1];
            else
                curr[j] = 1 + std::min({prev[j], curr[j-1], prev[j-1]});
        }
        std::swap(prev, curr);
    }
    return prev[n];
}

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
    while ((limit <= 0 || static_cast<int>(results.size()) < limit) && std::getline(std::cin, line)) {
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

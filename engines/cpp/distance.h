#pragma once
#include <string>
#include <vector>
#include <algorithm>
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

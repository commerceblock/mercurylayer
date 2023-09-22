#pragma once

#ifndef BITCOIN_UTIL_STRENCODINGS_H
#define BITCOIN_UTIL_STRENCODINGS_H

#include <cstddef>
#include <stdint.h>
#include <string_view>
#include <vector>
#include <iomanip>
#include <string>

/** Parse the hex string into bytes (uint8_t or std::byte). Ignores whitespace. */
template <typename Byte = uint8_t>
std::vector<Byte> ParseHex(std::string_view str);

bool hex_to_bytes(const std::string& hex, unsigned char* output);
std::string key_to_string(const unsigned char* key, size_t keylen);

#endif // BITCOIN_UTIL_STRENCODINGS_H
#include "strencodings.h"

const signed char p_util_hexdigit[256] =
{ -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  0,1,2,3,4,5,6,7,8,9,-1,-1,-1,-1,-1,-1,
  -1,0xa,0xb,0xc,0xd,0xe,0xf,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,0xa,0xb,0xc,0xd,0xe,0xf,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
  -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1, };

signed char HexDigit(char c)
{
    return p_util_hexdigit[(unsigned char)c];
}

constexpr inline bool IsSpace(char c) noexcept {
    return c == ' ' || c == '\f' || c == '\n' || c == '\r' || c == '\t' || c == '\v';
}

template <typename Byte>
std::vector<Byte> ParseHex(std::string_view str)
{
    std::vector<Byte> vch;
    auto it = str.begin();
    while (it != str.end() && it + 1 != str.end()) {
        if (IsSpace(*it)) {
            ++it;
            continue;
        }
        auto c1 = HexDigit(*(it++));
        auto c2 = HexDigit(*(it++));
        if (c1 < 0 || c2 < 0) break;
        vch.push_back(Byte(c1 << 4) | Byte(c2));
    }
    return vch;
}

template std::vector<std::byte> ParseHex(std::string_view);
template std::vector<uint8_t> ParseHex(std::string_view);

bool hex_to_bytes(const std::string& hex, unsigned char* output) {
    if (hex.size() % 2 != 0) {
        return false;
    }

    size_t len = hex.length();
    for (size_t i = 0; i < len; i += 2) {
        unsigned int byte;
        std::stringstream ss;
        ss << std::hex << hex.substr(i, 2);
        ss >> byte;
        output[i / 2] = static_cast<unsigned char>(byte);
    }

    return true;
}

std::string key_to_string(const unsigned char* key, size_t keylen) {
    std::stringstream sb;
    sb << "0x";
    for (int i = 0; i < keylen; i++)
        sb << std::hex << std::setw(2) << std::setfill('0') << (int)key[i];
    return sb.str();
}
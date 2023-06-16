Mercury layer

=====================================
MercuryLayer is a Bitcoin Layer protocol that allows the offchain transfer of UTXOs.

Ownership of deposited Bitcoin (or Elements based) UTXOs can be transferred between parties without performing on-chain transactions. This allows for near instant payments, increased privacy and novation of DLCs/Lightning Channels.

Swaps are a method of performing many off-chain transfers atomically. The number of participants in a swap is unlimited. If `n` participants take part in a swap with one distinct UTXO each they receive back ownership of any one of the `n` UTXOs of the same value. 

This implementation is fully blinded meaning that their is no Bitcoin UTXO address stored in the server.

This repository contains the Server and Client implementation for the protocol. For more information on the components of Mercury see their respective crates.


# License

Mercury Layer is released under the terms of the GNU General Public License. See for more information https://opensource.org/licenses/GPL-3.0

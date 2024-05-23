# Blinded two-party Musig

Proposal for a an implimentation of the Musig Schnorr multisig protocol where there are 2 parties but where one of the co-signing parties does not learn of 1) The full shared public key or 2) The final signature generated. 

In the folllowing descrption, private keys (field elements) are denoted using lower case letters, and elliptic curve points as uppercase letters. `G` is the generator point and point multiplication denoted as `X = xG` and point addition as `A = G + G`. 

`H()` is a secure hash function. 

## Schnorr signature

In the standard Schnorr signature protocol, the signer generated a private key (field element) `x` and corresponding public key `X = xG`. 

To sign a message `m`, the signer generates an ephemeral key/nonce (field element) `r` and corresponding public point `R = rG`. 

Signer calculates `e = H(X||R||m)` and `s = e.x + r`. The signature is the pair `(R,s)`. 

## 2-Party Musig

The 2-party Musig protocol works as follows:

Party 1 generates private key `x1` and public key `X1 = x1G`. Party 2 generates private key `x2` and public key `X2 = x2G`. The set of pubkeys is `L = {X1,X2}`. The key aggregation coefficient is `KeyAggCoef(L,X) = H(L,X)`. The shared (aggregate) public key `X = a1X1 + a2X2` where `a1 = KeyAggCoef(L,X1)` and `a2 = KeyAggCoef(L,X2)`. 

To sign a message `m`, party 1 generates nonce `r1` and `R1 = r1G`. Party 2 generates nonce `r2` and `R2 = r2G`. These are aggreagted into `R = R1 + R2`. 

Party 1 then computes `c = H(X||R||m)` and `s1 = c.a1.x1 + r1`. 
Party 2 then computes `c = H(X||R||m)` and `s2 = c.a2.x2 + r2`. 

The final signature is then `(R,s1+s2)`. 

## Blinded 2-Party Musig2

To prevent party 1 from learning the full public key:

1) Key aggregation is performed only by party 2. Party 1 just sends `X1` to party 2. 

In order to update the server (party 1) keyshare when a statecoin is transferred between users, the key aggregation coefficient must be set to 1 for each key. The purpose of this coefficient in the Musig2 protocol is to prevent 'rogue key attacks' where one party can choose a public key derived from both their own secret key and the inverse of the other party's public key giving them the ability to unilaterally produce a valid signature over the aggregate key. However this can be prevented by the party 2 producing a proof of knowledge of the private key corresponding to their supplied public key. This can be a signature, which is produced in any case by signing the statechain state in the mercury protocol. This signature must be verified by the receiver of a coin (who must also verify the server pubkey combines with the sender pubkey to get the coin address) which proves that the server is required to co-sign to generate any signature for this address.

To prevent party 1 from learning the full signature:

1) Nonce aggregation is performed only by party 2. Party 1 sends `R1` to party 2.
2) Party 2 generates a blinding nonce `f`
3) Party 2 computes `c = H(X||R||m)` where `X = X1 + X2` and `R = R1 + R2 + fG`.
4) Party 2 computes the blinded challenge `e = c + f` and sends to party 1. 
5) Party 1 computes `s1 = e.x1 + r1` and sends to party 2. 

Party 1 never learns the final value of `(R,s)` or `m` (where `s = s1 + s2`).  

This is vulnerable to the Wagner attack by allowing party 2 to choose the value of `r2` to derive an additional signature from a series of challenge values. Essentially, the attack is possible because the server cannot verify that the blinded challenge (c) value it has been sent by the user has been computed honestly (i.e. `e = f + SHA256(X1 + X2, R1 + R2 + fG, m)` ), however this CAN be verified by each new owner of a statecoin for all the previous signatures. 

Each time an owner cooperates with the server to generate a signature on a backup tx, the server will require that the owner send a commitment to their `R2` value and `f` value: e.g. `SHA256(R2)` and `SHA256(f)`. The server will store this value before responding with it's `R1` value. This way, the owner cannot choose the value of `R2` (and hence `c`). 

So in the modified signing process:

1) Party 2 generates a blinding nonce `f` and `R2 = r2G`
2) Party 2 sends commitments `H(f)` and `H(R2)` to party 1
3) Party 1 sends `R1` to party 2.
4) Party 2 computes `c = H(X||R||m)` where `X = X1 + X2` and `R = R1 + R2 + fG`.
5) Party 2 computes the blinded challenge `e = c + f` and sends to party 1. 
6) Party 1 computes `s1 = e.x1 + r1` and sends to party 2. 

When the signature is verified, the verifier must also perform the following checks:

1) Receive `R2` and `f` and from the signer.
2) Receive `H(f)`, `H(R2)`, `R1` and `e` from party 1.
3) Verify that `e = f + H(X||R1 + R2 + fG||m)` and `H(f)` and `H(R2)`

## Key update

In order to update the server (party 1) keyshare when a statecoin is transferred between users, the key aggregation coefficient must be set to 1 for each key. The purpose of this coefficient in the Musig2 protocol is to prevent 'rogue key attacks' where one party can choose a public key derived from both their own secret key and the inverse of the other party's public key giving them the ability to unilaterally produce a valid signature over the aggregate key. However this can be prevented (as specified in the musig2 paper) by the party producing a proof of knowledge of the private key corresponding to their supplied public key. This can be provided simply in the form of a signature, which is produced in any case by signing the statechain state in the mercury protocol. 

When receiving a statecoin, in order to verify that the coin address (i.e. aggregate public key) is shared correctly between the previous owner and the server, the client must verify the following:

1) Retrieve the CURRENT public key (share) from the server for this coin `X1`.
2) Retrieve the public key (share) of the sender `X2`.
3) Verify that `X1 + X2 = P` the address of the statecoin.
4) Verify that the sender has the private key used to generate `X2`: this is done by verifying the statechain signature over the receiver's public key `X3` from `X2`. 

This proves that the address `P` was generated (aggregated) with the server and can only be signed with cooperation with the server, i.e. no previous owner can hold the full key. 

In order to update the key shares, the following protocol can be used:

1. Server (party 1) generates a random blinding nonce `b` and sends to client (party 2).
2. Client performs `transfer_sender` and adds their private key the nonce: `t1 = b + x2`
3. Client sends `t1` to the receiver as part of `transfer_msg_3` (encrypted with the receiver public key `X3 = x3G`).
4. Receiver client decrypts `t1` and then subtracts their private key `x3`: `t2 = b + x2 - x3`.
5. Receiver client sends `t2` to the server as part of `transfer_receiver`.
6. Server the updates the private key share `x1_2 = x1 + t2 - b = x1 + b + x2 - x3 -b = x1 + x2 - x3`.
   So now, `x1_2 + x3` (the aggregation of the new server key share with the new client key share) is equal to `x1 + x2` (the aggregation of the old server key share with the old client key share). 
7. The server deletes `x1`. 

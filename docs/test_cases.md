# Test Cases

## Basic Workflow

### TB01 - Simple transfer

01. Create wallet 1 and 2
02. Create a token
03. Generate wallet 1 deposit address with this token
04. Confirm the intial state of the coin is `INITIALISED`
05. Confirm the amount is correct
06. Confirm there is a statechain id
07. Send funds to the address of the new coin
08. Wait for Electrs to index this deposit transaction
09. Confirm that the coin status changed to `IN_MEMPOOL` status
11. Try to transfer the coin. It must fail.
12. Generate a new block
13. Confirm that the coin status changed to `UNCONFIRMED` status
14. Try to transfer the coin. It must fail.
15. Generate blocks enough to confirm the coin (according to the client's Settings.toml)
16. Confirm that the coin status changed to `CONFIRMED` status
17. Try to transfer the coin. This time, it must work.
18. Wallet 2 generates a new transfer address.
19. Wallet 1 sends the coin to this wallet 2's address
20. Confirm that the coin status changed to `IN_TRANSFER` status in wallet 1
21. Wallet 2 executes `transfer-receive`
22. Confirm that the coin status changed to `TRANSFERRED` status in wallet 1
23. Confirm that the coin status changed to `CONFIRMED` status in wallet 2
24. Wallet 2 withdraws the coin
25. Confirm that the coin status changed to `WITHDRAWING` status in wallet 2
26. Generate blocks enough to confirm the withdrawal (according to the client's Settings.toml)
25. Confirm that the coin status changed to `WITHDRAWN` status in wallet 2

### TB02 - Transfer Address Reuse

01. Create wallet 1 and 2
02. Create a token
03. Generate wallet 1 deposit address with this token (2x)
04. Send funds to the address of the new coin (2x)
05. Generate blocks enough to confirm the coin (according to the client's Settings.toml)
06. Wait for Electrs to index this deposit transaction
07. Confirm wallet 1 has two coins
08. Confirm these two coins have the `CONFIRMED` status 
09. Wallet 2 generates a new transfer address.
10. Wallet 1 sends the two coins to this same wallet 2's address
11. Wallet 2 executes `transfer-receive` and stores the received statechain ids
12. Confirm wallet 2 now has two coins
13. Confirm those coins have the status `CONFIRMED`
14. Confirm the coins have the received statechain ids
15. Confirm those two coins have same `user_privkey`, `auth_privkey` and `address`
16. Confirm those two coins have different `server_pubkey`, `statechain_id` and `aggregated_address`
17. Wallet 2 withdraws the first coin
18. Confirm that the coin status changed to `WITHDRAWING` status in wallet 2
19. Generate blocks enough to confirm the withdrawal (according to the client's Settings.toml)
20. Confirm that the coin status changed to `WITHDRAWN` status in wallet 2
21. Wallet 1 generates a new transfer address.
22. Wallet 2 sends the second coin to this wallet 1's address
23. Confirm that the coin status changed to `TRANSFERRED` status in wallet 2
24. Confirm that the coin status changed to `WITHDRAWING` status in wallet 1
25. Generate blocks enough to confirm the withdrawal (according to the client's Settings.toml)
26. Confirm that the coin status changed to `WITHDRAWN` status in wallet 1

## Malicious Workflow

### TM01 - Sender Double Spends

01. Create wallet 1, 2 and 3
02. Create a token
03. Generate wallet 1 deposit address with this token
04. Generate blocks enough to confirm the coin (according to the client's Settings.toml)
05. Wait for Electrs to index this deposit transaction
06. Confirm that there is a coin in `CONFIRMED` status in wallet 1
07. Wallet 2 generates a new transfer address.
08. Wallet 1 sends the coin to this wallet 2's address.
09. Wallet 3 generates a new transfer address.
10. Wallet 1 sends the coin to this wallet 3's address.
11. Wallet 3 executes `transfer-receive`. This must succeed.
12. Wallet 1 tries to send the coin to this wallet 2's address again.
13. This time, the server must not allow it because the wallet 3 has already received the coin.
14. Update wallet 1
15. Wallet 1 tries to send the coin to this wallet 2's address again.
16. This time, the client must not allow it because coin is in the `TRANSFERRED` state.

# Mercury Layer coinswap protocol

The Mercury layer server API supports atomic bacth transfers where two (or more parties) agree to a process where two (or more) coins are transfered to new specified addresses in a single operation, where either they all complete the transfer or none of them do. 

This atomic transfer API can be used to enable two (or more) statecoin owners to swap their coins. In order to perform a swap of two coins, the following events must occur:

1. The two coin owners must be made aware of each others desire to swap and to communicate. This is achieved via nostr messages. 
2. One user will be the `proposer` and the other the `taker`. 
3. The proposer will broadcast a message labeled as a swap request with a randomly generated `batch_id` and the coin amount and their `sc` address. 
4. The `taker` will query the relay node for any message labeled as a swap request for a specified amount. 
5. When the `taker` sees the swap request, then broadcast a message with the same `batch_id` and their own `sc` address. 
6. Any other potential `taker` will see there are more than one message with the same `batch_id` and ignore them (as they are already paired). 
7. Once the `proposer` sees the `taker` message (sharing the same `batch_id`), they both then commence the atomic transfer to the new `sc` address. 
8. This starts the atomic transfer timeout, and once comlplete either both coins are transfered to the new address, or neither are. 

## Nostr protocol

The proposer generates a key pair for the nostr event. 
The `proposer` generates a nostr *event* with a `kind` that is a mercury swap event (e.g. `4521`).

```
{
  "id": "4376c65d2f232afbe9b882a35baa4f6fe8667c4e684749af565f981833ed6a65",
  "pubkey": "6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93",
  "created_at": 1673347337,
  "kind": 4521,
  "content": "Mercury swap request",
  "tags": [
    ["address", "sc1qd8tt2cme0heruuf9zlxeygq96lum7qzl4tf32hnkyvlta9gqvumud8su7pvdzelx5ku2hrggwhuv5v3x824re8gcjl7yhq4quhtf5vfgwszp5"],
    ["amount", "500000"],
    ["batch_id"], "b94cba9b-93f8-419f-8adb-a943125a20f8"]
  ],
  "sig": "908a15e46fb4d8675bab026fc230a0e3542bfade63da02d542fb78b2a8513fcd0092619a2c8c1221e581946e0191f2af505dfdf8657a414dbca329186f009262"
}
```

This event to sent to the relay. 

The `taker` via the relay checks for any messages with the `"kind": 4521` and specified amount they want to swap `["amount", "500000"]`. They check for any events that there is a unique `batch_id`. They can also apply filtering based on the `created_at` timestamp (to ignore any very old events for example). 

They then reply with their own event message with the same `batch_id` and address. They also initiate `transfer/sender` paying to the specified address with `batch_id`. 

```
{
  "id": "a3e88f9f13ef06cd35ac55d2c34c8ce2e8874cccb50e2545975f046f7acee8f1",
  "pubkey": "84fa1bd2ff0fb9bd5ee4256671c4f6a40dca311e5301668b282dbf66a6bedcc6100p",
  "created_at": 1673347337,
  "kind": 4521,
  "content": "Mercury swap request",
  "tags": [
    ["address", "sc1qd8tt2cme0heruuf9zlxeygq96lum7qzl4tf32hnkyvlta9gqvumud8su7pvdzelx5ku2hrggwhuv5v3x824re8gcjl7yhq4quhtf5vfgwszp5"],
    ["amount", "500000"],
    ["batch_id"], "b94cba9b-93f8-419f-8adb-a943125a20f8"]
  ],
  "sig": "908a15e46fb4d8675bab026fc230a0e3542bfade63da02d542fb78b2a8513fcd0092619a2c8c1221e581946e0191f2af505dfdf8657a414dbca329186f009262"
}
```

The proposer listens for any events of `"kind": 4521`, and if the `batch_id` matches, then they also initiate `transfer/sender` paying to the specified address with `batch_id`. 

The swap then completes. If either party fail to complete, the coins can revert to the original owners. 
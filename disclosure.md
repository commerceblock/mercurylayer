# Mercury Layer Bug Bounties and Responsible Disclosure

If you discover a bug or vulnerability in any part of the Mercury Layer system, we strongly urge you to report it to us. We will collaborate with you closely to investigate and fix the issue.

The following codebases and repositories are in scope for the bug bounty program:

```
github.com/commerceblock/enclave
github.com/commerceblock/server
github.com/commerceblock/token-server
github.com/commerceblock/clients
github.com/commerceblock/lib
github.com/commerceblock/wasm
```

## Out of scope

The following items are considered out of scope for the bug bounty program:

- Bitcoin: anything related the Bitcoin blockchain or lightning network protocols. 
- Bitcoin fee issues: any vulnrabilies related to backup transaction confirmation delays in high fee enviroments. 
- Electrum servers: Electrum servers or client libraries. 
- Ordinals Protocol: any issues related to the Ordinals protocol.
- Hardware: any issues related to the security of hardware platforms, e.g. Intel SGX. 

## Disclosure Policy

We kindly request that you adhere to the following guidelines when participating in the program:
Upon discovering a potential security issue, please notify us as soon as possible (via email: info@commerceblock.com), and after the investigation and thorough evaluation, we will make every effort to resolve the issue promptly.
Please provide us with a reasonable amount of time to investigate and address the issue before disclosing it to the public or any third party. Our team is available Monday to Friday and will make a best effort to meet the following for participants in the program:
First Response: 2 business days
Time to Triage: 7 business days
Time to Resolution: will depend on severity and complexity

Make a good faith effort to avoid privacy violations, data destruction, and interruption or degradation of our services. Only interact with accounts you own or with explicit permission from the account holder.

We request that you refrain from engaging in activities such as:
Denial of service attacks
Spamming
Social engineering (including phishing) targeting Commerceblock staff or contractors
or any physical attempts against Commerceblock property or data centers.
We reserve the right to modify the Bug Bounty Program or cancel the Bug Bounty Program at any time.

## Program Rules

Please provide detailed reports with reproducible steps. If the report is not detailed enough to reproduce the issue, the issue will not be eligible for a reward.
Submit one vulnerability per report, unless you need to chain vulnerabilities to provide impact.
When duplicates occur, we only award the first report that was received (provided that it can be fully reproduced).
Multiple vulnerabilities caused by one underlying issue will be awarded one bounty.
Social engineering (e.g. phishing, vishing, smishing) is prohibited.

## Rewards

### Critical impact:

This is any vulnerability in either the protocol or implimentation that would lead to permanent loss of funds either by mallicious action of a counterparty or errors in code. 

Reward: £800 (GBP)

### Serious impact:

Reward: £400 (GBP)

This is any vulnerability that could lead to the service becoming inoperable. This includes actions to disable the server, or malicious action or errors that would cause a coin to become unable to be withdrawn (i.e. rely on a backup transaction). 

### Low impact:

Reward: £150 (GBP)

This is any bug in client implimentations that causes crashes, incorrect data displayed or any loss of functionality that doesn't directly lead to loss of funds. 

All bounties will be paid in Bitcoin (BTC). 


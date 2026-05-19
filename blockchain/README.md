# blockchain/

> **Status: Phase 6 — Not yet implemented.**

This directory will contain the on-chain component of NINAuth:

- `contracts/` — Solidity smart contracts (Identity registry, access control)
- `scripts/` — Hardhat deployment scripts targeting Sepolia testnet
- `test/` — Contract unit tests (Hardhat + Chai)

## Planned Contracts

| Contract | Purpose |
|----------|---------|
| `NINRegistry.sol` | Maps NIN hashes → IPFS CIDs of encrypted embeddings |
| `AccessControl.sol` | Role-based verification permissions |

## Toolchain (planned)

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

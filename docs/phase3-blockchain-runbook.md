# Phase 3 Blockchain Runbook

For implementation details and architecture decisions, see:

- [Hardhat Implementation](/Users/prasadrane/Brickly/docs/hardhat-implementation.md)

## Local Setup

Install dependencies from the repo root:

```bash
npm install
```

## Compile the Contract

```bash
npm run chain:compile
```

## Start a Local Hardhat Node

In one terminal:

```bash
npm run chain:node
```

The local RPC endpoint will be:

```text
http://127.0.0.1:8545
```

## Deploy the Ownership Contract

In another terminal:

```bash
npm run chain:deploy
```

The deploy script prints the deployed contract address and writes it to:

```text
.hardhat/deployments.json
```

## Run the Demo Ownership Flow

This script will:

1. deploy the contract if `BLOCKCHAIN_CONTRACT_ADDRESS` is not set
2. issue shares for a demo property
3. transfer shares between two local accounts
4. print transaction hashes and resulting balances

```bash
npm run chain:demo
```

## Optional Environment Variables

```bash
HARDHAT_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_CONTRACT_ADDRESS=0x...
DEMO_PROPERTY_ID=brickly:phase3:miami-south-pointe-lofts
DEMO_ISSUE_SHARES=100
DEMO_TRANSFER_SHARES=25
```

## Suggested Backend Wiring Values

Add these to the repo-root `.env` when connecting the API to the local chain:

```bash
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_PROVIDER=hardhat-local
BLOCKCHAIN_NETWORK=localhost
BLOCKCHAIN_CHAIN_ID=31337
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_CONTRACT_ADDRESS=0x...
```

## Notes

- This setup is for local Phase 3 demo/testing only.
- It is intentionally lightweight and does not include mainnet deployment.
- The operational app should continue working even if the local chain is not running.

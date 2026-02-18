# Local proposals on zkSync fork

This setup is for local proposal testing via `AgentTimelock` impersonation.

## 1) Prerequisites

- Run local zkSync fork on `http://127.0.0.1:8011`.
- Use `--network local`.
- Ensure proposal target contracts are present in `deployments/*.json`.

Optional env vars:

- `LOCAL_ZKSYNC_RPC_URL` (default: `http://127.0.0.1:8011`)
- `AGENT_TIMELOCK_ADDRESS` (if not set, address is loaded from:
  - `deployments/AgentTimelock.json`, then
  - `../pkg/governance/deployments/zksync/AgentTimelock.json`)
- `PROPOSAL_SOLIDITY_CONSOLE=1` (decode and print `hardhat/console.sol` logs from call traces)

## 2) Helper API

Use `proposals/lib/proposal-tools.js`.

- `createProposalContext()` returns:
  - `addresses`, `values`, `abis`
  - `addProposalItem(contract, methodName, params, value?)`
  - `testProposal(options?)`
- `getDeploymentContract(name, runner)` loads contract from `deployments/<name>.json`.

`testProposal()` behavior:

1. Resolves RPC and `AgentTimelock` address.
2. Impersonates `AgentTimelock`.
3. Sends each transaction from timelock signer.
4. Stops impersonation.

## 3) Run example proposal

Example script: `proposals/001_upgrade_strategy_zerolend.js`

```bash
cd zksync-withdraw
export LOCAL_ZKSYNC_RPC_URL=http://127.0.0.1:8011
export NEW_IMPL_ADDRESS=0xYourNewImplAddress
yarn hardhat run proposals/001_upgrade_strategy_zerolend.js --network local
```


## 4) Create your own proposal script

Minimal structure:

```js
const { JsonRpcProvider } = require("ethers");
const { createProposalContext, getDeploymentContract, resolveRpcUrl } = require("./lib/proposal-tools");

async function main() {
  const provider = new JsonRpcProvider(resolveRpcUrl());
  const proposal = createProposalContext();
  const target = getDeploymentContract("YourContractName", provider);

  proposal.addProposalItem(target, "methodName", ["arg1", "arg2"]);
  await proposal.testProposal();
}
```

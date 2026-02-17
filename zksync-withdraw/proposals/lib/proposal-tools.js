const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { Contract, JsonRpcProvider, Interface, getAddress, toBeHex } = require("ethers");

const TEN_ETH_HEX = "0x8ac7230489e80000"; // 10 ETH in hex
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const REVERT_IFACE = new Interface(["error Error(string)", "error Panic(uint256)"]);

 function resolveRpcUrl() {
  return (
    (hre.network && hre.network.config && hre.network.config.url) ||
    process.env.LOCAL_ZKSYNC_RPC_URL ||
    process.env.ZKSYNC_RPC_URL ||
    "http://127.0.0.1:8011"
  );
}

function resolveAgentTimelockAddress() {
  if (process.env.AGENT_TIMELOCK_ADDRESS) {
    return getAddress(process.env.AGENT_TIMELOCK_ADDRESS);
  }

  const localDeployment = path.resolve(__dirname, "../../deployments/AgentTimelock.json");
  if (fs.existsSync(localDeployment)) {
    const json = JSON.parse(fs.readFileSync(localDeployment, "utf8"));
    if (json.address) return getAddress(json.address);
  }

  const governanceDeployment = path.resolve(
    __dirname,
    "../../../pkg/governance/deployments/zksync/AgentTimelock.json",
  );
  if (fs.existsSync(governanceDeployment)) {
    const json = JSON.parse(fs.readFileSync(governanceDeployment, "utf8"));
    if (json.address) return getAddress(json.address);
  }

  throw new Error(
    "AgentTimelock address not found. Set AGENT_TIMELOCK_ADDRESS or provide deployments/AgentTimelock.json",
  );
}

function loadDeployment(name) {
  const deploymentPath = path.resolve(__dirname, `../../deployments/${name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}`);
  }
  return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
}

function getDeploymentContract(name, runner) {
  const deployment = loadDeployment(name);
  return new Contract(getAddress(deployment.address), deployment.abi, runner);
}

function toBigIntValue(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  return 0n;
}

async function tryRpcMethods(provider, methods, params) {
  let lastError;
  for (const method of methods) {
    try {
      return await provider.send(method, params);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReceipt(provider, txHash, timeoutMs = 60000, pollMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const receipt = await provider.send("eth_getTransactionReceipt", [txHash]);
    if (receipt) return receipt;
    await sleep(pollMs);
  }
  throw new Error(`Timeout waiting receipt for ${txHash}. Check automine/block production on local node.`);
}

function decodeRevertData(data) {
  if (!data || typeof data !== "string" || !data.startsWith("0x")) return "";
  try {
    const parsed = REVERT_IFACE.parseError(data);
    if (parsed?.name === "Error") return `Error(${parsed.args[0]})`;
    if (parsed?.name === "Panic") return `Panic(${parsed.args[0].toString()})`;
    return `${parsed?.name || "CustomError"}(${(parsed?.args || []).join(", ")})`;
  } catch (_) {
    return `revertData=${data}`;
  }
}

function normalizeGasLimit(gasLimit) {
  if (gasLimit == null || gasLimit === "") return null;
  if (typeof gasLimit === "bigint") return gasLimit;
  if (typeof gasLimit === "number") return BigInt(gasLimit);
  if (typeof gasLimit === "string") return BigInt(gasLimit.trim());
  return null;
}

function pickRpcErrorData(e) {
  const candidates = [
    e?.data,
    e?.error?.data,
    e?.info?.error?.data,
    e?.error?.error?.data,
  ];
  return candidates.find((x) => x != null);
}

function pickRpcErrorMessage(e) {
  return e?.shortMessage || e?.message || "";
}

async function getRevertDetails(provider, txHash, txRequest, blockNumber) {
  const details = [];
  try {
    const trace = await provider.send("debug_traceTransaction", [txHash, { tracer: "callTracer" }]);
    const traceReason = trace?.revertReason || trace?.error || trace?.result?.error || "";
    const traceOutput = trace?.output || trace?.result?.output || "";
    if (traceReason) details.push(`trace=${traceReason}`);
    const decodedTraceOutput = decodeRevertData(traceOutput);
    if (decodedTraceOutput) details.push(decodedTraceOutput);
  } catch (_) {}

  try {
    const beforeBlock = Number(blockNumber) > 0 ? toBeHex(Number(blockNumber) - 1) : "latest";
    await provider.send("eth_call", [txRequest, beforeBlock]);
  } catch (e) {
    const data = pickRpcErrorData(e);
    const decoded = decodeRevertData(typeof data === "string" ? data : "");
    const msg = e?.shortMessage || e?.message || "";
    if (msg) details.push(`call=${msg}`);
    if (decoded) details.push(decoded);
  }

  return details.length ? details.join(" | ") : "No revert details from RPC";
}

async function impersonateAndFund(provider, address) {
  await tryRpcMethods(provider, ["hardhat_impersonateAccount", "anvil_impersonateAccount"], [address]);

  try {
    await tryRpcMethods(provider, ["hardhat_setBalance", "anvil_setBalance"], [address, TEN_ETH_HEX]);
  } catch (e) {
    console.warn(`[warn] failed to set balance for ${address}: ${e.message}`);
  }
}

async function stopImpersonation(provider, address) {
  try {
    await tryRpcMethods(provider, ["hardhat_stopImpersonatingAccount", "anvil_stopImpersonatingAccount"], [address]);
  } catch (e) {
    console.warn(`[warn] failed to stop impersonation for ${address}: ${e.message}`);
  }
}

function createProposalContext() {
  const addresses = [];
  const values = [];
  const abis = [];
  const actions = [];

  function addProposalItem(contractOrAddress, methodOrData, params = [], value = 0n, description = "") {
    if (!contractOrAddress) {
      throw new Error("addProposalItem: contractOrAddress is required");
    }

    let target;
    let data;

    if (typeof contractOrAddress === "string") {
      target = getAddress(contractOrAddress);
      if (typeof methodOrData !== "string" || !methodOrData.startsWith("0x")) {
        throw new Error(
          "addProposalItem: for raw address input, second argument must be encoded calldata (0x...)",
        );
      }
      data = methodOrData;
      actions.push(description || `calldata:${data.slice(0, 10)}`);
    } else {
      target = getAddress(contractOrAddress.target || contractOrAddress.address || ZERO_ADDRESS);
      if (target === ZERO_ADDRESS) {
        throw new Error("addProposalItem: cannot resolve target address from contract object");
      }
      if (!contractOrAddress.interface || typeof methodOrData !== "string") {
        throw new Error("addProposalItem: contract object with interface and method name is required");
      }
      data = contractOrAddress.interface.encodeFunctionData(methodOrData, params);
      actions.push(description || methodOrData);
    }

    addresses.push(target);
    values.push(toBigIntValue(value));
    abis.push(data);
  }

  async function testProposal(options = {}) {
    if (addresses.length !== values.length || values.length !== abis.length) {
      throw new Error("Proposal arrays length mismatch");
    }
    if (addresses.length === 0) {
      throw new Error("Proposal is empty. Add at least one proposal item");
    }

    const rpcUrl = options.rpcUrl || resolveRpcUrl();
    const timelockAddress = getAddress(options.timelockAddress || resolveAgentTimelockAddress());
    const gasLimit = normalizeGasLimit(options.gasLimit ?? process.env.PROPOSAL_GAS_LIMIT);
    const provider = new JsonRpcProvider(rpcUrl);

    console.log(`[proposal] rpc: ${rpcUrl}`);
    console.log(`[proposal] timelock: ${timelockAddress}`);
    console.log(`[proposal] tx count: ${addresses.length}`);
    if (gasLimit) console.log(`[proposal] gas limit: ${gasLimit.toString()}`);

    try {
      await impersonateAndFund(provider, timelockAddress);
      try {
        for (let i = 0; i < addresses.length; i++) {
          console.log(`[proposal] tx[${i + 1}/${addresses.length}] ${actions[i]}`);
          console.log(`[proposal] tx[${i + 1}] to=${addresses[i]} selector=${abis[i].slice(0, 10)} value=${values[i].toString()}`);
          const txRequest = {
            from: timelockAddress,
            to: addresses[i],
            value: toBeHex(values[i]),
            data: abis[i],
          };

          // ---------- PREFLIGHT ETH_CALL ----------
          try {
            console.log(`[proposal] tx[${i + 1}] eth_call preflight...`);
            const callResult = await provider.send("eth_call", [txRequest, "latest"]);
            console.log(`[proposal] tx[${i + 1}] eth_call success result=${callResult}`);
          } catch (callErr) {
            const blockNum = await provider.send("eth_blockNumber", []);
            const details = await getRevertDetails(
              provider,
              null,
              txRequest,
              blockNum
            );

            const data = pickRpcErrorData(callErr);
            const decoded = decodeRevertData(typeof data === "string" ? data : "");
            const msg = pickRpcErrorMessage(callErr);

            throw new Error(
              `Preflight eth_call failed for tx[${i + 1}] | ${msg}${decoded ? ` | ${decoded}` : ""} | ${details}`
            );
          }

          // ---------- TRY ESTIMATE GAS ----------
          let gasWithMargin;

          try {
            const gasHex = await provider.send("eth_estimateGas", [txRequest]);

            const gasBn = BigInt(gasHex);
            const margin = gasBn / 10n; // +10%
            gasWithMargin = gasBn + margin;

            txRequest.gas = toBeHex(gasWithMargin);

            console.log(
              `[proposal] eth_estimateGas: ${gasHex} -> using gas: ${txRequest.gas}`
            );

          } catch (estErr) {

            const blockNum = await provider.send("eth_blockNumber", []);

            const details = await getRevertDetails(
              provider,
              null,
              txRequest,
              blockNum
            );

            throw new Error(
              `Gas estimation failed for tx[${i + 1}] | ${details}`
            );
          }

          // ---------- SEND TX ----------
          const txHash = await provider.send("eth_sendTransaction", [txRequest]);
          console.log(`[proposal] tx[${i + 1}] hash: ${txHash}`);

          const receipt = await waitForReceipt(
            provider,
            txHash,
            options.receiptTimeoutMs || 60000,
            options.pollMs || 1000
          );

          console.log(
            `[proposal] tx[${i + 1}] mined status=${receipt.status} gasUsed=${BigInt(receipt.gasUsed).toString()} block=${Number(receipt.blockNumber)}`
          );

          if (receipt.status !== "0x1" && receipt.status !== 1) {

            const details = await getRevertDetails(
              provider,
              txHash,
              txRequest,
              receipt.blockNumber
            );

            const used = BigInt(receipt.gasUsed);
            const likelyOog = gasWithMargin && used >= gasWithMargin;

            const hint = likelyOog
              ? " | likely out of gas (gasUsed == gasLimit)"
              : "";

            throw new Error(
              `Transaction failed: tx[${i + 1}] ${txHash} | ${details}${hint}`
            );
          }

        }
      } finally {
        await stopImpersonation(provider, timelockAddress);
      }
    } finally {
      provider.destroy();
    }
  }

  return {
    addresses,
    values,
    abis,
    addProposalItem,
    testProposal,
  };
}

module.exports = {
  createProposalContext,
  resolveRpcUrl,
  resolveAgentTimelockAddress,
  loadDeployment,
  getDeploymentContract,
};

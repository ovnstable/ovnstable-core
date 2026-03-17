const { Interface, getAddress, toBeHex } = require("ethers");
const { getSigner, hasGovFlag } = require("./utils/gov-signer");
const { loadDeployment } = require("../proposals/lib/proposal-tools");

const IMPL_SLOT = "0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC";

const REVERT_IFACE = new Interface([
  "error Error(string)",
  "error Panic(uint256)",
]);

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

function pickErrorData(err) {
  const candidates = [
    err?.data,
    err?.error?.data,
    err?.info?.error?.data,
    err?.error?.error?.data,
    err?.body,
    err?.message,
  ];
  return candidates.find((x) => typeof x === "string" && x.startsWith("0x"));
}

async function waitForReceipt(provider, txHash, timeoutMs = 120000, pollMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const receipt = await provider.send("eth_getTransactionReceipt", [txHash]);
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(`Timeout waiting receipt for ${txHash}`);
}

async function readImplementation(provider, proxyAddress) {
  const raw = await provider.send("eth_getStorageAt", [proxyAddress, IMPL_SLOT, "latest"]);
  return getAddress(`0x${raw.slice(-40)}`);
}

async function main() {
  if (!hasGovFlag()) {
    throw new Error("Gov mode is required. Run with GOAT=1 or add --gov to hardhat command.");
  }

  const { provider, address, cleanup } = await getSigner();

  try {
    const deployment = loadDeployment("StrategyZerolend");
    const strategyProxy = getAddress(process.env.PROXY_ADDRESS || deployment.address);
    const newImplementation = getAddress(
      process.env.NEW_IMPL ||
      process.env.NEW_IMPL_ADDRESS ||
      "0x68D047DB3F0bdDdB5d346C533fcb78094d0D1c71",
    );

    const chainId = await provider.send("eth_chainId", []);
    console.log("Chain ID:", Number(chainId));
    console.log("Proxy:", strategyProxy);
    console.log("New impl:", newImplementation);
    console.log("Caller (from):", address);
    console.log("-----------------------------------");

    const beforeImpl = await readImplementation(provider, strategyProxy);
    console.log("Implementation before:", beforeImpl);

    if (beforeImpl.toLowerCase() === newImplementation.toLowerCase()) {
      console.log("Proxy already points to target implementation. Nothing to do.");
      return;
    }

    const iface = new Interface(["function upgradeTo(address newImplementation)"]);
    const txRequest = {
      from: address,
      to: strategyProxy,
      data: iface.encodeFunctionData("upgradeTo", [newImplementation]),
    };

    console.log("Running eth_call preflight...");
    try {
      await provider.send("eth_call", [txRequest, "latest"]);
      console.log("eth_call preflight: OK");
    } catch (err) {
      const raw = pickErrorData(err);
      const decoded = decodeRevertData(raw);
      throw new Error(
        `eth_call preflight reverted: ${decoded || err?.shortMessage || err?.message || "unknown error"}`,
      );
    }

    console.log("Estimating gas...");
    let gasWithMargin;
    try {
      const gasHex = await provider.send("eth_estimateGas", [txRequest]);
      const gas = BigInt(gasHex);
      gasWithMargin = gas + gas / 10n;
      txRequest.gas = toBeHex(gasWithMargin);
      console.log(`Gas estimate: ${gas.toString()} -> using ${gasWithMargin.toString()}`);
    } catch (err) {
      const raw = pickErrorData(err);
      const decoded = decodeRevertData(raw);
      throw new Error(
        `eth_estimateGas failed: ${decoded || err?.shortMessage || err?.message || "unknown error"}`,
      );
    }

    console.log("Sending real transaction...");
    const txHash = await provider.send("eth_sendTransaction", [txRequest]);
    console.log("Tx hash:", txHash);

    const receipt = await waitForReceipt(provider, txHash);
    console.log(
      `Receipt: status=${receipt.status} gasUsed=${BigInt(receipt.gasUsed).toString()} block=${Number(receipt.blockNumber)}`,
    );

    if (receipt.status !== "0x1" && receipt.status !== 1) {
      throw new Error(`Upgrade transaction failed on-chain. tx=${txHash}`);
    }

    const afterImpl = await readImplementation(provider, strategyProxy);
    console.log("Implementation after:", afterImpl);

    if (afterImpl.toLowerCase() !== newImplementation.toLowerCase()) {
      throw new Error(
        `Upgrade was mined but implementation mismatch. expected=${newImplementation} actual=${afterImpl}`,
      );
    }

    console.log("SUCCESS: proxy implementation upgraded.");
  } finally {
    await cleanup();
  }
}

main().catch((e) => {
  console.error("Fatal:", e.message || e);
  process.exit(1);
});

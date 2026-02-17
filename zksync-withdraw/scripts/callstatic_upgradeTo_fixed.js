// scripts/callstatic_upgradeTo_fixed.js
const hre = require("hardhat");
const { Interface } = require("ethers");
const { getSigner } = require("./utils/gov-signer");

// minimal revert ABI decoder
const REVERT_IFACE = new Interface([
  "error Error(string)",
  "error Panic(uint256)"
]);

function decodeRevertData(data) {
  if (!data || typeof data !== "string" || !data.startsWith("0x")) return "";
  try {
    const parsed = REVERT_IFACE.parseError(data);
    if (parsed?.name === "Error") return `Error(${parsed.args[0]})`;
    if (parsed?.name === "Panic") return `Panic(${parsed.args[0].toString()})`;
    return `${parsed?.name || "CustomError"}(${(parsed?.args || []).join(", ")})`;
  } catch (_) {
    // fallback: not a known custom error, return hex
    return `revertData=${data}`;
  }
}

async function main() {
  const { signer, provider, address, cleanup } = await getSigner();

  const strategyProxy = "0x1969937EFc0F86CAf3a613c23e6340cd8ce77F0e";
  const newImplementation = "0x68D047DB3F0bdDdB5d346C533fcb78094d0D1c71";

  // ABI for upgradeTo
  const iface = new Interface(["function upgradeTo(address newImplementation)"]);

  const calldata = iface.encodeFunctionData("upgradeTo", [newImplementation]);

  console.log("Proxy:", strategyProxy);
  console.log("New impl:", newImplementation);
  console.log("Caller (from):", address);
  console.log("-----------------------------------");

  const txRequest = {
    from: address,
    to: strategyProxy,
    data: calldata
    // do NOT pass gas here for eth_call; estimate separately
  };

  // 1) eth_call -> check revert reason (callStatic equivalent)
  try {
    console.log("Running eth_call (simulate)...");

    // provider is zksync-ethers Provider and exposes .send
    const result = await provider.send("eth_call", [txRequest, "latest"]);
    // if call returns normally, it returns hex (function return) — for upgradeTo it's likely empty
    console.log("✅ eth_call succeeded. result:", result);
  } catch (err) {
    console.log("❌ eth_call reverted");

    // try to extract revert data from common places
    const dataCandidates = [
      err?.data,
      err?.error?.data,
      err?.info?.error?.data,
      err?.error?.error?.data,
      err?.body,
      err?.message
    ];

    const raw = dataCandidates.find((x) => typeof x === "string" && x.startsWith("0x"));
    const fallbackMessage = err?.shortMessage || err?.message || JSON.stringify(err).slice(0, 400);

    if (raw) {
      console.log("Revert data (raw):", raw);
      console.log("Decoded:", decodeRevertData(raw));
    } else {
      // sometimes zksync returns the reason in message
      console.log("Error message:", fallbackMessage);
    }
  }

  // 2) eth_estimateGas -> see if gas estimation fails / gives huge value
  try {
    console.log("-----------------------------------");
    console.log("Running eth_estimateGas (estimate)...");

    const gasHex = await provider.send("eth_estimateGas", [txRequest]);
    const gasBn = BigInt(gasHex);
    console.log("Estimated gas (hex):", gasHex, " | decimal:", gasBn.toString());
  } catch (err) {
    console.log("❌ eth_estimateGas failed");
    const dataCandidates = [
      err?.data,
      err?.error?.data,
      err?.info?.error?.data,
      err?.error?.error?.data,
      err?.body,
      err?.message
    ];
    const raw = dataCandidates.find((x) => typeof x === "string" && x.startsWith("0x"));
    if (raw) {
      console.log("Estimate revert data (raw):", raw);
      console.log("Decoded:", decodeRevertData(raw));
    } else {
      console.log("Estimate error message:", err?.shortMessage || err?.message || JSON.stringify(err).slice(0, 400));
    }
  }

  await cleanup();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

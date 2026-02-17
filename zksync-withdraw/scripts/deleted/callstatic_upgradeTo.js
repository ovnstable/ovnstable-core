const hre = require("hardhat");
// use zksync-ethers Contract to match gov-signer (zksync provider/signer)
const { Contract } = require("zksync-ethers");
const { getSigner } = require("../utils/gov-signer");

async function main() {
  const { signer, provider, address, cleanup } = await getSigner();

  const strategyProxy = "0x1969937EFc0F86CAf3a613c23e6340cd8ce77F0e";
  const newImplementation = "0x68D047DB3F0bdDdB5d346C533fcb78094d0D1c71";

  const ABI = [
    "function upgradeTo(address newImplementation)"
  ];

  // Contract from zksync-ethers will work with the signer returned by gov-signer
  const strategy = new Contract(strategyProxy, ABI, signer);

  console.log("Proxy:", strategyProxy);
  console.log("New impl:", newImplementation);
  console.log("Caller:", address);
  console.log("-----------------------------------");

  // SAFETY: ensure the contract object has the methods we expect
  if (!strategy.callStatic || !strategy.estimateGas) {
    console.error("Contract object does not expose callStatic/estimateGas — incompatible signer/provider.");
    await cleanup();
    process.exit(1);
  }

  try {
    console.log("Running callStatic upgradeTo...");
    await strategy.callStatic.upgradeTo(newImplementation);
    console.log("✅ callStatic SUCCESS");
  } catch (err) {
    console.log("❌ callStatic REVERT");
    // печатаем максимум полезной инфы
    if (err?.reason) console.log("reason:", err.reason);
    if (err?.error?.message) console.log("error.message:", err.error.message);
    if (err?.data) console.log("data:", err.data);
    console.dir(err, { depth: null });
  }

  try {
    console.log("-----------------------------------");
    console.log("Estimating gas...");
    const gas = await strategy.estimateGas.upgradeTo(newImplementation);
    console.log("Estimated gas:", gas.toString());
  } catch (err) {
    console.log("❌ estimateGas FAILED");
    if (err?.reason) console.log("reason:", err.reason);
    if (err?.error?.message) console.log("error.message:", err.error.message);
    console.dir(err, { depth: null });
  }

  await cleanup();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

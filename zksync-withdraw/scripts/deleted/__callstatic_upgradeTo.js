const hre = require("hardhat");
const { Wallet, Provider, Contract } = require("zksync-ethers");


async function main() {
  const rpc =
    process.env.ZKSYNC_RPC_URL ||
    (hre.network && hre.network.config && hre.network.config.url) ||
    "http://127.0.0.1:8011";

  const pk = process.env.PRIVATE_KEY;

  const provider = new Provider(rpc);
  const wallet = new Wallet(pk, provider);

  // ===== ЗАДАЙ АДРЕСА =====
  const strategyProxy = "0x1969937EFc0F86CAf3a613c23e6340cd8ce77F0e";
  const newImplementation = "0x68D047DB3F0bdDdB5d346C533fcb78094d0D1c71";

  // ===== ABI только для upgradeTo =====
  const UUPS_ABI = [
    "function upgradeTo(address newImplementation)"
  ];

  const strategy = new Contract(strategyProxy, UUPS_ABI, wallet);

  console.log("Proxy:", strategyProxy);
  console.log("New impl:", newImplementation);
  console.log("Caller:", wallet.address);
  console.log("RPC:", rpc);
  console.log("-----------------------------------");

  // ===================== CALL STATIC =====================
  try {
    console.log("Running callStatic upgradeTo...");

    await strategy.callStatic.upgradeTo(newImplementation);

    console.log("✅ callStatic SUCCESS (upgrade не ревертится)");
  } catch (err) {
    console.log("❌ callStatic REVERT");

    if (err?.reason) {
      console.log("Reason:", err.reason);
    }

    if (err?.error?.message) {
      console.log("Error message:", err.error.message);
    }

    if (err?.data) {
      console.log("Revert data:", err.data);
    }
  }

  // ===================== ESTIMATE GAS =====================
  try {
    console.log("-----------------------------------");
    console.log("Estimating gas...");

    const gas = await strategy.estimateGas.upgradeTo(newImplementation);

    console.log("Estimated gas:", gas.toString());
  } catch (err) {
    console.log("❌ estimateGas FAILED");

    if (err?.reason) {
      console.log("Reason:", err.reason);
    }

    if (err?.error?.message) {
      console.log("Error message:", err.error.message);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

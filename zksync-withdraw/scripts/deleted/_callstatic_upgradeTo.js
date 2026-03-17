const hre = require("hardhat");
const { Contract } = require("ethers");
const { getSigner } = require("../utils/gov-signer");

async function main() {

  const { signer, provider, address, cleanup } = await getSigner();

  const strategyProxy = "0x1969937EFc0F86CAf3a613c23e6340cd8ce77F0e";
  const newImplementation = "0x68D047DB3F0bdDdB5d346C533fcb78094d0D1c71";

  const ABI = [
    "function upgradeTo(address newImplementation)"
  ];

  const strategy = new Contract(strategyProxy, ABI, signer);

  console.log("Proxy:", strategyProxy);
  console.log("New impl:", newImplementation);
  console.log("Caller:", address);
  console.log("-----------------------------------");

  try {

    console.log("Running callStatic upgradeTo...");

    await strategy.callStatic.upgradeTo(newImplementation);

    console.log("✅ callStatic SUCCESS");

  } catch (err) {

    console.log("❌ callStatic REVERT");

    console.dir(err, { depth: null });

  }

  try {

    console.log("-----------------------------------");
    console.log("Estimating gas...");

    const gas = await strategy.estimateGas.upgradeTo(newImplementation);

    console.log("Estimated gas:", gas.toString());

  } catch (err) {

    console.log("❌ estimateGas FAILED");

    console.dir(err, { depth: null });

  }

  await cleanup();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

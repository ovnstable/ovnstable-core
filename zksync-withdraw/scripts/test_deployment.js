const hre = require("hardhat");
const { Wallet, Provider, Contract } = require("zksync-ethers");
const assets = require("../utils/assets");

async function main() {
  const rpc =
    process.env.ZKSYNC_RPC_URL ||
    (hre.network && hre.network.config && hre.network.config.url) ||
    "http://127.0.0.1:8011";
  const pk = process.env.PRIVATE_KEY;
  const provider = new Provider(rpc);
  const devjun6 = new Wallet(pk, provider);

  const zerolendUSDCAddress = "0x1969937EFc0F86CAf3a613c23e6340cd8ce77F0e";
  const zerolendUSDTAddress = "0x1d48b4612EbA39b7C073abE1f71d5dF79574869A";

  // ======================= LOGS =======================

  // Баланс ETH на zerolendUSDCAddress
  logETHBalance(zerolendUSDCAddress, "zerolendUSDCAddress", "ZerolendUSDC");

  // Баланс z0USD на zerolendUSDCAddress
  logBalance(zerolendUSDCAddress, "zerolendUSDCAddress", assets.Z0USDC);
  logBalance(zerolendUSDTAddress, "zerolendUSDTAddress", assets.Z0USDT);

  // ======================= FUNCS =======================

  function logETHBalance(address, label) {
    return provider.getBalance(address).then((balance) => {console.log(`Balance of ${label} (ETH): ${balance.toString()}`); });
  }

  async function logBalance(address, label, token) {
    const ERC20_ABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)"
    ];
    const tokenContract = new Contract(token, ERC20_ABI, provider);
    const tokenBalance = await tokenContract.balanceOf(address);
    const decimals = await tokenContract.decimals();
    const symbol = await tokenContract.symbol();
    const divisor = BigInt(10) ** BigInt(decimals);
    const formatted = Number(tokenBalance) / Number(divisor);
    console.log(`Balance of ${label} (${symbol}): ${formatted.toString()}`);
  }
}




main().catch((err) => {
  console.error(err);
  process.exit(1);
});

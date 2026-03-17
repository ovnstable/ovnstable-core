const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");
const { Wallet, Contract } = require("zksync-ethers");
const path = require("path");
const fs = require("fs");
const TEN_ETH_HEX = "0x8ac7230489e80000"; // 10 ETH
const USDPLUS_FQN = "contracts/UsdPlusToken.sol:UsdPlusToken";

// CLI флаг: --impl  => деплоим только новую имплементацию без upgradeTo
const ONLY_IMPL = process.env.ONLY_IMPL === "true" || process.argv.includes("--impl");

function loadProxyAddress() {
  // 1) env приоритетнее
  if (process.env.PROXY_ADDRESS) return process.env.PROXY_ADDRESS;

  // 2) deployments/StrategyZerolend.json из текущего проекта
  const p = path.join(__dirname, "../deployments/UsdPlusToken.json");
  if (fs.existsSync(p)) {
    const json = JSON.parse(fs.readFileSync(p, "utf8"));
    if (json.address) return json.address;
  }

  throw new Error(
    "Proxy address not provided. Set PROXY_ADDRESS or add address to deployments/UsdPlusToken.json",
  );
}

module.exports = async function (hre) {
  const { deployments } = hre;
  const { save } = deployments;

  // Ключ: env PRIVATE_KEY, иначе dev key из anvil-zksync
  const rpc =
    (hre.network && hre.network.config && hre.network.config.url) ||
    process.env.ZKSYNC_RPC_URL ||
    "http://127.0.0.1:8011";
  const pk =
    process.env.PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  const provider = new hre.zksyncEthers.Provider(rpc);
  const wallet = new Wallet(pk, provider);
  for (const method of ["hardhat_setBalance", "anvil_setBalance"]) {
    try { await provider.send(method, [wallet.address, TEN_ETH_HEX]); break; } catch (_) {}
  }
  const deployer = new Deployer(hre, wallet);

  const artifact = await deployer.loadArtifact(USDPLUS_FQN);
  const proxyAddress = loadProxyAddress();
  console.log(`[proxy] ${proxyAddress}`);

  console.log(`[deploy] deploying UsdPlusToken impl (onlyImpl=${ONLY_IMPL})...`);
  const impl = await deployer.deploy(artifact, []);
  const implAddress = impl.address || (await impl.getAddress());
  console.log(`[deploy] impl: ${implAddress}`);

  if (ONLY_IMPL) {
    console.log(`[upgrade] skipped (--impl)`);
    return;
  }

  const proxy = new Contract(proxyAddress, artifact.abi, wallet);
  const tx = await proxy.upgradeTo(implAddress);
  console.log(`[upgrade] tx: ${tx.hash}`);
  await tx.wait();
  console.log(`[upgrade] done`);

  // Обновляем deployments запись: прокси остаётся тем же, импл новый
  await save("UsdPlusToken", {
    address: proxyAddress,
    implementation: implAddress,
    ...artifact,
  });
};

module.exports.tags = ["UsdPlusToken"];

const hre = require("hardhat"); // подтягиваем hardhat контекст (нужен Deployer)
const { Deployer } = require("@matterlabs/hardhat-zksync"); // zkSync Deployer для имплементации
const { Provider, Wallet, Contract } = require("zksync-ethers"); // провайдер/кошелёк/контракт под zkSync
const { getAddress } = require("ethers"); // нормализуем адреса
const path = require("path"); // работа с путями
const fs = require("fs"); // чтение файлов

// EIP-1967 слот имплементации прокси (keccak256('eip1967.proxy.implementation') - 1)
const IMPL_SLOT = "0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC";

// Берём адрес прокси: env приоритетнее, иначе deployments/StrategyZerolend.json
function loadProxyAddress() {
  if (process.env.PROXY_ADDRESS) return getAddress(process.env.PROXY_ADDRESS); // явный адрес из env
  const p = path.join(__dirname, "../deployments/StrategyZerolend.json"); // путь до деплойментов
  if (fs.existsSync(p)) {
    const json = JSON.parse(fs.readFileSync(p, "utf8")); // читаем json
    if (json.address) return getAddress(json.address); // нормализуем адрес
  }
  throw new Error("Proxy address not provided. Set PROXY_ADDRESS or add it to deployments/StrategyZerolend.json"); // фатал, если нет адреса
}

// Читаем текущую имплементацию напрямую из storage слота; zksync Provider не имеет getStorageAt, поэтому fallback через RPC
async function readImpl(provider, proxy) {
  // ethers v6: getStorage, не getStorageAt; zksync-ethers может не иметь обоих, поэтому используем send
  let raw;
  if (typeof provider.getStorage === "function") {
    raw = await provider.getStorage(proxy, IMPL_SLOT); // v6-friendly метод, если есть
  } else {
    raw = await provider.send("eth_getStorageAt", [proxy, IMPL_SLOT, "latest"]); // прямой RPC вызов
  }
  return getAddress("0x" + raw.slice(-40)); // берем последние 20 байт и нормализуем
}

async function main() {
  const rpcUrl =
    process.env.ZKSYNC_RPC_URL ||
    (hre.network && hre.network.config && hre.network.config.url) ||
    "http://127.0.0.1:8011"; // адрес RPC (локальный форк или тестнет/мейннет)
  const pk =
    process.env.PRIVATE_KEY ||
    // дев-ключ из anvil-zksync на 8011
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // ключ апгрейдера (DEFAULT_ADMIN_ROLE/upgrade)
  if (!rpcUrl) throw new Error("Set ZKSYNC_RPC_URL in .env"); // проверка RPC
  if (!pk) throw new Error("Set PRIVATE_KEY in .env (has DEFAULT_ADMIN_ROLE on proxy)"); // проверка ключа

  const provider = new Provider(rpcUrl); // создаем zkSync провайдер
  const wallet = new Wallet(pk, provider); // кошелёк под этот провайдер

  const proxy = loadProxyAddress(); // берем адрес прокси

  console.log(`[net] ${rpcUrl}`); // лог сети
  console.log(`[wallet] ${wallet.address}`); // лог кошелька
  console.log(`[proxy] ${proxy}`); // лог прокси

  const currentImpl = await readImpl(provider, proxy); // читаем текущую имплементацию
  console.log(`[proxy] current implementation: ${currentImpl}`); // лог текущего impl

  const deployer = new Deployer(hre, wallet); // создаём Deployer для zksync
  const artifact = await deployer.loadArtifact("StrategyZerolend"); // загружаем артефакт контракта

  console.log(`[deploy] deploying StrategyZerolend implementation...`); // лог начала деплоя
  const implContract = await deployer.deploy(artifact, []); // деплоим новую имплементацию
  const implAddress = await implContract.getAddress(); // берем адрес имплементации
  const deployTx = implContract.deploymentTransaction(); // tx деплоя
  console.log(`[deploy] impl address: ${implAddress}`); // лог адреса
  console.log(`[deploy] tx: ${deployTx?.hash}`); // лог tx hash

  const proxyWithAbi = new Contract(proxy, artifact.abi, wallet); // подключаемся к прокси с ABI имплементации (UUPS)
  console.log(`[upgrade] calling upgradeTo(${implAddress})...`); // лог апгрейда
  const tx = await proxyWithAbi.upgradeTo(implAddress); // вызываем upgradeTo
  console.log(`[upgrade] tx: ${tx.hash}`); // лог tx hash
  const receipt = await tx.wait(); // ждём майнинг
  console.log(`[upgrade] mined in block ${receipt.blockNumber}`); // лог блока

  const newImpl = await readImpl(provider, proxy); // читаем новый impl
  console.log(`[proxy] new implementation: ${newImpl}`); // лог нового impl
}

main().catch((e) => {
  console.error(e); // печатаем ошибку
  process.exit(1); // выходим с кодом 1
});

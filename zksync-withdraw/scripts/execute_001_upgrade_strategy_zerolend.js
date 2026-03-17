require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Interface, getAddress } = require("ethers");
const { Provider, Wallet, Contract } = require("zksync-ethers");

// Timelock execute всегда использует пустой predecessor для этого proposal.
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
// Скрипт намеренно зашит только под один batch, чтобы не было путаницы.
const BATCH_PATH = path.resolve(
  __dirname,
  "../proposals/batches/zksync/001_upgrade_strategy_zerolend.json",
);
// Адрес и ABI timelock берём из локального deployment-файла zkSync-withdraw.
const TIMELOCK_DEPLOYMENT_PATH = path.resolve(
  __dirname,
  "../deployments/gov/AgentTimelock.json",
);
// Для проверки прав нам нужен только список owner-ов Safe.
const SAFE_ABI = [
  "function getOwners() view returns (address[])",
];
// Нужен, чтобы красиво декодировать revert reason из staticCall / estimateGas.
const REVERT_IFACE = new Interface([
  "error Error(string)",
  "error Panic(uint256)",
]);

function loadJson(filePath) {
  // Читаем batch/deployment как обычный JSON с диска.
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function decodeRevert(err) {
  // Собираем revert data из разных форматов ошибок RPC/ethers.
  const candidates = [
    err?.data,
    err?.error?.data,
    err?.info?.error?.data,
    err?.error?.error?.data,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.startsWith("0x")) continue;
    try {
      const parsed = REVERT_IFACE.parseError(candidate);
      if (parsed?.name === "Error") return `Error(${parsed.args[0]})`;
      if (parsed?.name === "Panic") return `Panic(${parsed.args[0].toString()})`;
      return `${parsed?.name || "CustomError"}(${(parsed?.args || []).join(", ")})`;
    } catch (_) {
      return `revertData=${candidate}`;
    }
  }

  return err?.shortMessage || err?.message || "unknown error";
}

function parseBatchTransaction(tx) {
  // Вытаскиваем из Safe batch только то, что нужно для timelock.execute(...).
  const input = tx?.contractInputsValues || {};
  return {
    target: getAddress(input.target),
    value: BigInt(input.value || "0"),
    data: input.data,
    salt: input.salt,
  };
}

async function main() {
  // Берём RPC из env. Для real execution это должен быть mainnet zkSync RPC.
  const rpcUrl =
    process.env.ZKSYNC_RPC_URL ||
    process.env.EXECUTE_RPC_URL ||
    process.env.LOCAL_ZKSYNC_RPC_URL;
  // Берём приватный ключ реального signer-а, который будет отправлять execute tx.
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl) {
    throw new Error("Set ZKSYNC_RPC_URL (or EXECUTE_RPC_URL) in .env");
  }
  if (!privateKey) {
    throw new Error("Set PRIVATE_KEY in .env");
  }

  // Загружаем уже одобренный batch и deployment timelock.
  const batch = loadJson(BATCH_PATH);
  const timelockDeployment = loadJson(TIMELOCK_DEPLOYMENT_PATH);
  // Позволяем переопределить адрес timelock через env, но по умолчанию берём локальный deployment.
  const timelockAddress = getAddress(
    process.env.AGENT_TIMELOCK_ADDRESS || timelockDeployment.address,
  );

  // Создаём RPC provider и wallet для реальной отправки onchain-транзакций.
  const provider = new Provider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);
  // Подключаемся к AgentTimelock с signer-ом, потому что дальше будем вызывать execute(...).
  const timelock = new Contract(timelockAddress, timelockDeployment.abi, wallet);

  // Читаем сеть и текущий блок, чтобы проверить chainId batch-а и ready timestamp операций.
  const network = await provider.getNetwork();
  const latestBlock = await provider.getBlock("latest");
  const currentTimestamp = BigInt(latestBlock.timestamp);

  // Защита от запуска batch-а не в той сети.
  if (batch.chainId && Number(batch.chainId) !== Number(network.chainId)) {
    throw new Error(
      `Batch chainId mismatch. batch=${batch.chainId} rpc=${Number(network.chainId)}`,
    );
  }

  // Узнаём адрес OVN Agent Safe, который имеет право schedule, а его owner-ы имеют право execute.
  const ovnAgent = getAddress(await timelock.ovnAgent());
  const safe = new Contract(ovnAgent, SAFE_ABI, provider);
  // Читаем owner-ов Safe и проверяем, что текущий EOA может вызывать timelock.execute(...).
  const owners = (await safe.getOwners()).map((owner) => getAddress(owner));
  const signerAddress = getAddress(wallet.address);
  const isOwner = owners.some((owner) => owner.toLowerCase() === signerAddress.toLowerCase());

  // Если signer не owner Safe, onchain execute всё равно ревертнёт, поэтому отсекаем это заранее.
  if (!isOwner) {
    throw new Error(
      `Signer ${signerAddress} is not an owner of ovnAgent Safe ${ovnAgent}`,
    );
  }

  // Печатаем входные данные запуска, чтобы было видно чем именно и в какой сети исполняем.
  console.log("RPC:", rpcUrl);
  console.log("Chain ID:", Number(network.chainId));
  console.log("Signer:", signerAddress);
  console.log("OVN Agent Safe:", ovnAgent);
  console.log("AgentTimelock:", timelockAddress);
  console.log("Batch:", BATCH_PATH);
  console.log("Batch tx count:", batch.transactions.length);
  console.log("Latest block:", latestBlock.number);
  console.log("Latest timestamp:", currentTimestamp.toString());
  console.log("------------------------------------------------------------");

  for (let i = 0; i < batch.transactions.length; i++) {
    // Для каждого пункта batch-а достаём исходные target/value/data/salt.
    const { target, value, data, salt } = parseBatchTransaction(batch.transactions[i]);
    // По тем же данным считаем timelock hash операции, который был создан на этапе schedule.
    const hash = await timelock.hashOperation(
      target,
      value,
      data,
      ZERO_BYTES32,
      salt,
    );
    // Смотрим состояние операции в timelock:
    // 0  -> не schedule-нута
    // 1  -> уже исполнена
    // >1 -> timestamp, когда операция станет ready.
    const timestamp = BigInt(await timelock.getTimestamp(hash));

    console.log(`[tx ${i + 1}/${batch.transactions.length}] target=${target}`);
    console.log(`[tx ${i + 1}] selector=${data.slice(0, 10)} value=${value.toString()}`);
    console.log(`[tx ${i + 1}] salt=${salt}`);
    console.log(`[tx ${i + 1}] hash=${hash}`);
    console.log(`[tx ${i + 1}] timestamp=${timestamp.toString()}`);

    if (timestamp === 0n) {
      throw new Error(
        `Operation not found in timelock for tx ${i + 1}. Batch was not scheduled on-chain.`,
      );
    }

    // Уже исполненные пункты не трогаем, чтобы можно было безопасно перезапустить скрипт.
    if (timestamp === 1n) {
      console.log(`[tx ${i + 1}] already executed, skipping`);
      console.log("------------------------------------------------------------");
      continue;
    }

    // Если delay ещё не прошёл, исполнение делать нельзя.
    if (timestamp > currentTimestamp) {
      throw new Error(
        `Operation for tx ${i + 1} is not ready yet. readyAt=${timestamp.toString()} now=${currentTimestamp.toString()}`,
      );
    }

    try {
      // Делаем сухой прогон execute через staticCall, чтобы поймать revert до реальной отправки tx.
      await timelock.execute.staticCall(
        target,
        value,
        data,
        ZERO_BYTES32,
        salt,
      );
      console.log(`[tx ${i + 1}] staticCall OK`);
    } catch (err) {
      throw new Error(`staticCall failed for tx ${i + 1}: ${decodeRevert(err)}`);
    }

    let gasLimit;
    try {
      // Оцениваем газ и добавляем 10% запас, чтобы не упереться в пограничную оценку.
      const estimatedGas = await timelock.execute.estimateGas(
        target,
        value,
        data,
        ZERO_BYTES32,
        salt,
      );
      gasLimit = estimatedGas + estimatedGas / 10n;
      console.log(`[tx ${i + 1}] gas=${estimatedGas.toString()} -> using ${gasLimit.toString()}`);
    } catch (err) {
      throw new Error(`estimateGas failed for tx ${i + 1}: ${decodeRevert(err)}`);
    }

    // Отправляем реальную onchain execute-транзакцию от текущего owner-а Safe.
    const tx = await timelock.execute(
      target,
      value,
      data,
      ZERO_BYTES32,
      salt,
      { gasLimit },
    );
    console.log(`[tx ${i + 1}] sent: ${tx.hash}`);

    // Ждём майнинг, чтобы не запускать следующий execute вслепую.
    const receipt = await tx.wait();
    console.log(
      `[tx ${i + 1}] mined: status=${receipt.status} gasUsed=${receipt.gasUsed.toString()} block=${receipt.blockNumber}`,
    );

    // Если транзакция замайнилась, но статус fail, останавливаемся сразу на проблемном пункте.
    if (receipt.status !== 1n && receipt.status !== 1) {
      throw new Error(`On-chain execution failed for tx ${i + 1}: ${tx.hash}`);
    }

    console.log("------------------------------------------------------------");
  }

  // Если дошли сюда, все ready-пункты успешно обработаны.
  console.log("Done.");
}

main().catch((err) => {
  // Любую фатальную ошибку печатаем в одну строку, чтобы было проще найти причину в терминале.
  console.error("Fatal:", err.message || err);
  process.exit(1);
});

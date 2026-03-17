const hre = require("hardhat");
const { Wallet, Provider, L2VoidSigner } = require("zksync-ethers");
const { JsonRpcSigner } = require("ethers");
const {
  resolveAgentTimelockAddress,
  resolveRpcUrl,
} = require("../../proposals/lib/proposal-tools"); // поправь путь если надо

const TEN_ETH_HEX = "0x8ac7230489e80000";

async function tryRpc(provider, methods, params) {
  let lastErr;
  for (const m of methods) {
    try {
      return await provider.send(m, params);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function hasGovFlag() {
  return process.env.GOAT === "true" || process.env.GOAT === "1" || process.argv.includes("--gov");
}

async function impersonateAndFund(provider, address) {
  await tryRpc(provider, [
    "hardhat_impersonateAccount",
    "anvil_impersonateAccount"
  ], [address]);

  try {
    await tryRpc(provider, [
      "hardhat_setBalance",
      "anvil_setBalance"
    ], [address, TEN_ETH_HEX]);
  } catch (_) {}
}

async function stopImpersonation(provider, address) {
  try {
    await tryRpc(provider, [
      "hardhat_stopImpersonatingAccount",
      "anvil_stopImpersonatingAccount"
    ], [address]);
  } catch (_) {}
}

async function getSigner() {
  const rpc = resolveRpcUrl();
  const provider = new Provider(rpc);

  // ===== GOV MODE =====
  if (hasGovFlag()) {
    const timelock = resolveAgentTimelockAddress();

    console.log("[gov] enabled");
    console.log("[gov] impersonating:", timelock);

    await impersonateAndFund(provider, timelock);

    // Используем JsonRpcSigner из ethers.js для импер­сонированного адреса
    const signer = new JsonRpcSigner(provider, timelock);

    return {
      signer,
      provider,
      gov: true,
      address: timelock,
      cleanup: async () => {
        await stopImpersonation(provider, timelock);
      }
    };
  }

  // ===== NORMAL MODE =====
  const pk = process.env.PRIVATE_KEY;
  const wallet = new Wallet(pk, provider);

  return {
    signer: wallet,
    provider,
    gov: false,
    address: wallet.address,
    cleanup: async () => {}
  };
}

module.exports = {
  getSigner,
  hasGovFlag
};

const fs = require("fs");
const path = require("path");
const { JsonRpcProvider, Interface, keccak256, getAddress } = require("ethers");

const RPC_URL =
  process.env.LOCAL_ZKSYNC_RPC_URL ||
  process.env.ZKSYNC_RPC_URL ||
  "http://127.0.0.1:8011";

const POOLS = [
  {
    name: "PancakeSwap",
    pair: "USD+-USDC",
    address: "0x6a8Fc7e8186ddC572e149dFAa49CfAE1E571108b",
  },
  {
    name: "Ezkalibur",
    pair: "USDC/USD+",
    address: "0x0DfD96f6DbA1F3AC4ABb4D5CA36ce7Cb48767a13",
  },
  {
    name: "SyncSwap",
    pair: "USD+/USDC",
    address: "0xA06f1cce2Bb89f59D244178C2134e4Fc17B07306",
  },
  {
    name: "Mute",
    pair: "USDC/USD+",
    address: "0x3848dbd3EAc429497abd464A18fBEC78EF76f750",
  },
  {
    name: "VeSync",
    pair: "USDC/USD+",
    address: "0x16D0fC836FED0f645d832Eacc65106dDB67108Ef",
  },
  {
    name: "KyberSwap",
    pair: "USDC/USD+",
    address: "0x760B36C9024d27b95e45a1aA033aaDCB87DA77Dc",
  },
];

const STORAGE_SLOTS = {
  implementation:
    "0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC",
  admin: "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
  beacon:
    "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50",
};

const PROBES = [
  { key: "factory", abi: "function factory() view returns (address)" },
  { key: "token0", abi: "function token0() view returns (address)" },
  { key: "token1", abi: "function token1() view returns (address)" },
  {
    key: "getReserves",
    abi: "function getReserves() view returns (uint112,uint112,uint32)",
  },
  {
    key: "getReserves2",
    abi: "function getReserves() view returns (uint256,uint256)",
  },
  { key: "stable", abi: "function stable() view returns (bool)" },
  { key: "pairFee", abi: "function pairFee() view returns (uint256)" },
  { key: "fee", abi: "function fee() view returns (uint24)" },
  {
    key: "slot0",
    abi: "function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)",
  },
  { key: "liquidity", abi: "function liquidity() view returns (uint128)" },
  { key: "tickSpacing", abi: "function tickSpacing() view returns (int24)" },
  { key: "swapFeeUnits", abi: "function swapFeeUnits() view returns (uint24)" },
  { key: "tickDistance", abi: "function tickDistance() view returns (int24)" },
  {
    key: "getFeeGrowthGlobal",
    abi: "function getFeeGrowthGlobal() view returns (uint256)",
  },
  { key: "vault", abi: "function vault() view returns (address)" },
  { key: "master", abi: "function master() view returns (address)" },
  { key: "poolType", abi: "function poolType() view returns (uint16)" },
  { key: "getAssets", abi: "function getAssets() view returns (address[])" },
  {
    key: "getProtocolFee",
    abi: "function getProtocolFee() view returns (uint24)",
  },
  { key: "reserve0", abi: "function reserve0() view returns (uint256)" },
  { key: "reserve1", abi: "function reserve1() view returns (uint256)" },
  {
    key: "invariantLast",
    abi: "function invariantLast() view returns (uint256)",
  },
  {
    key: "feeInPrecision",
    abi: "function feeInPrecision() view returns (uint256)",
  },
  {
    key: "getTradeInfo",
    abi: "function getTradeInfo() view returns (uint112,uint112,uint112,uint112,uint256)",
  },
];

function isHexAddress(value) {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function normalizeDecoded(value) {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return isHexAddress(value) ? getAddress(value) : value;
  if (Array.isArray(value)) return value.map(normalizeDecoded);
  if (value && typeof value === "object") {
    return Array.from(value).map(normalizeDecoded);
  }
  return value;
}

function toStringValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function shortError(error) {
  return (
    error?.shortMessage ||
    error?.reason ||
    error?.message?.split("\n")[0] ||
    "call failed"
  );
}

function slotToAddress(raw) {
  if (!raw || raw === "0x" || /^0x0+$/.test(raw)) return null;
  return getAddress(`0x${raw.slice(-40)}`);
}

function classifyPool(result) {
  const ok = (key) => Boolean(result.probes[key]?.ok);
  const hasV2Reserves = ok("getReserves") || ok("getReserves2");

  if (ok("vault") || ok("master") || ok("poolType") || ok("getAssets")) {
    return "SyncSwap-style pool (vault/master API)";
  }
  if (ok("swapFeeUnits") || ok("tickDistance") || ok("getFeeGrowthGlobal")) {
    return "Kyber Elastic-style concentrated liquidity pool";
  }
  if (ok("slot0") || ok("liquidity") || ok("tickSpacing") || ok("fee")) {
    return "UniswapV3/PancakeV3-style concentrated liquidity pool";
  }
  if (hasV2Reserves && ok("stable")) {
    return "Solidly/Mute-style V2 pair (stable/volatile)";
  }
  if (hasV2Reserves && (ok("feeInPrecision") || ok("getTradeInfo"))) {
    return "Kyber Classic/DMM-style V2 pair";
  }
  if (hasV2Reserves) {
    return "UniswapV2-like pair";
  }
  if (ok("token0") && ok("token1")) {
    return "Pair-like contract (partial ABI match)";
  }
  return "Unknown / custom";
}

function buildSelector(abi) {
  const iface = new Interface([abi]);
  const fragment = iface.fragments[0];
  const selector = iface.getFunction(fragment.name).selector;
  return { iface, fragment, selector };
}

async function runProbe(provider, target, probe) {
  const { iface, fragment, selector } = buildSelector(probe.abi);
  const fn = fragment.name;
  const data = iface.encodeFunctionData(fn, []);

  try {
    const raw = await provider.call({ to: target, data });
    const decoded = iface.decodeFunctionResult(fn, raw);
    const normalized = normalizeDecoded(decoded.length === 1 ? decoded[0] : decoded);
    return {
      ok: true,
      selector,
      decoded: normalized,
      raw,
    };
  } catch (error) {
    return {
      ok: false,
      selector,
      error: shortError(error),
    };
  }
}

async function readStorage(provider, target, slot) {
  try {
    return await provider.send("eth_getStorageAt", [target, slot, "latest"]);
  } catch (_) {
    return null;
  }
}

function sanitizeCell(value) {
  return toStringValue(value).replaceAll("|", "\\|");
}

function renderMarkdown(report) {
  const lines = [];

  lines.push("# Pools Info");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`RPC: \`${report.rpcUrl}\``);
  lines.push(`ChainId: \`${report.chainId}\``);
  lines.push(`Block: \`${report.blockNumber}\``);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push("| Pool | Address | Classification |");
  lines.push("|---|---|---|");
  for (const pool of report.pools) {
    lines.push(`| ${pool.name} | \`${pool.address}\` | ${pool.classification} |`);
  }
  lines.push("");

  for (const pool of report.pools) {
    lines.push(`## ${pool.name}`);
    lines.push("");
    lines.push(`- Address: \`${pool.address}\``);
    lines.push(`- Pair hint: \`${pool.pair}\``);
    lines.push(`- Code size: \`${pool.codeSize}\` bytes`);
    lines.push(`- Code hash: \`${pool.codeHash || "n/a"}\``);
    lines.push(`- Classification: **${pool.classification}**`);
    lines.push("");
    lines.push("### Proxy Slots");
    lines.push("");
    lines.push(`- implementation slot: \`${pool.proxy.implementationRaw || "n/a"}\``);
    lines.push(`- implementation address: \`${pool.proxy.implementation || "none"}\``);
    lines.push(`- admin slot: \`${pool.proxy.adminRaw || "n/a"}\``);
    lines.push(`- admin address: \`${pool.proxy.admin || "none"}\``);
    lines.push(`- beacon slot: \`${pool.proxy.beaconRaw || "n/a"}\``);
    lines.push(`- beacon address: \`${pool.proxy.beacon || "none"}\``);
    lines.push("");

    lines.push("### Selector Probes");
    lines.push("");
    lines.push("| Function | Selector | Status | Result |");
    lines.push("|---|---|---|---|");
    for (const probe of PROBES) {
      const res = pool.probes[probe.key];
      if (!res) continue;
      const fn = probe.abi
        .replace("function ", "")
        .replace(" view returns", " returns")
        .replace(/\s+/g, " ");
      if (res.ok) {
        lines.push(`| \`${sanitizeCell(fn)}\` | \`${res.selector}\` | ok | \`${sanitizeCell(res.decoded)}\` |`);
      } else {
        lines.push(`| \`${sanitizeCell(fn)}\` | \`${res.selector}\` | fail | \`${sanitizeCell(res.error)}\` |`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const provider = new JsonRpcProvider(RPC_URL);
  const [chainId, blockNumber] = await Promise.all([
    provider.send("eth_chainId", []),
    provider.getBlockNumber(),
  ]);

  const pools = [];
  for (const pool of POOLS) {
    const address = getAddress(pool.address);
    const code = await provider.getCode(address);
    const codeSize = code === "0x" ? 0 : (code.length - 2) / 2;
    const codeHash = code === "0x" ? null : keccak256(code);

    const [implementationRaw, adminRaw, beaconRaw] = await Promise.all([
      readStorage(provider, address, STORAGE_SLOTS.implementation),
      readStorage(provider, address, STORAGE_SLOTS.admin),
      readStorage(provider, address, STORAGE_SLOTS.beacon),
    ]);

    const probeResults = {};
    for (const probe of PROBES) {
      probeResults[probe.key] = await runProbe(provider, address, probe);
    }

    const result = {
      name: pool.name,
      pair: pool.pair,
      address,
      codeSize,
      codeHash,
      proxy: {
        implementationRaw,
        implementation: slotToAddress(implementationRaw),
        adminRaw,
        admin: slotToAddress(adminRaw),
        beaconRaw,
        beacon: slotToAddress(beaconRaw),
      },
      probes: probeResults,
    };
    result.classification = classifyPool(result);
    pools.push(result);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    rpcUrl: RPC_URL,
    chainId: Number(chainId),
    blockNumber,
    pools,
  };

  const markdown = renderMarkdown(report);
  const outputPath = path.join(__dirname, "../docs/pools_info.md");
  fs.writeFileSync(outputPath, markdown);
  console.log(`Saved: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

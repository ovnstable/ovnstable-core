const { ethers } = require("ethers");
const BigNumber = require("bignumber.js");
const { resolveProperties } = require("ethers/lib/utils");

/**
 * Module-level Variables
 */
let gasPriceValue;
let baseFeePerGasValue;
let emaValue;

/**
 * Helper Function to Determine if a Chain Uses EIP-1559
 */
function usesEip1559(chain) {
  switch (chain.toUpperCase()) {
    case "LINEA":
    case "BASE":
    case "OPTIMISM":
    case "ETHEREUM":
    case "BLAST":
    case "ZKSYNC":
      return true;
    default:
      return false;
  }
}

/**
 * Function to Get the Gas Price
 */
async function getGasPrice() {
  const chainEnv = process.env.ETH_NETWORK;
  if (!chainEnv) {
    throw new Error("ETH_NETWORK environment variable is not set");
  }
  const chain = chainEnv.toUpperCase();

  const provider = getProvider(chain);

  try {
    const gasPrice = await getMarketGasPrice1559(provider, chain);
    const fastGasPrice = prepareFastPrice(gasPrice, chain);
    return fastGasPrice;
  } catch (e) {
    // Handle errors if needed
    return undefined;
  }
}

/**
 * Function to Create Provider Based on Chain
 */
function getProvider(chain) {
  switch (chain) {
    case "ARBITRUM":
      return new ethers.providers.JsonRpcProvider(process.env.ETH_NODE_URI_ARBITRUM);
    case "OPTIMISM":
      return new ethers.providers.JsonRpcProvider(process.env.ETH_NODE_URI_OPTIMISM);
    case "BASE":
      return new ethers.providers.JsonRpcProvider(process.env.ETH_NODE_URI_BASE);
    // Add other chains as needed
    default:
      throw new Error(`Provider not found for chain ${chain}`);
  }
}

/**
 * Prepare Fast Gas Price Function
 */
function prepareFastPrice(gasPrice, chain) {
  if (chain === "ARBITRUM") {
    return increaseGasPriceByPercent(gasPrice, 10);
  } else if (usesEip1559(chain)) {
    return prepareEip1559GasPrice(gasPrice, "4000000", 150, chain);
  } else {
    return gasPrice;
  }
}

/**
 * Get Market Gas Price Functions
 */
async function getMarketGasPrice(provider) {
  return (await provider.getGasPrice()).toString();
}

async function getMarketGasPrice1559(provider, chain) {
  if (usesEip1559(chain)) {
    return await eip1559UpdateBaseFeePerGas(provider, chain);
  } else {
    return (await provider.getGasPrice()).toString();
  }
}

/**
 * EIP-1559 Gas Price Calculation
 */
async function eip1559UpdateBaseFeePerGas(provider, chain) {
  const { block, gasPrice } = await resolveProperties({
    block: provider.getBlockWithTransactions("latest"),
    gasPrice: provider.getGasPrice().catch(() => null),
  });

  let lastBaseFeePerGas;
  const priorityFeeArray = [];

  if (block && block.baseFeePerGas) {
    lastBaseFeePerGas = new BigNumber(block.baseFeePerGas.toString());
  } else {
    const previousBaseFee = baseFeePerGasValue || "0";
    lastBaseFeePerGas = new BigNumber(previousBaseFee).multipliedBy(1.08);
  }

  if (lastBaseFeePerGas) {
    baseFeePerGasValue = lastBaseFeePerGas.toString();
  }

  // Support empty block on Optimism and Base
  if (
    (block.transactions.length < 4 &&
      (chain === "OPTIMISM" || chain === "BASE")) ||
    !block.transactions.length
  ) {
    return gasPrice ? gasPrice.toString() : "0";
  }

  for (const tx of block.transactions) {
    let maxPriorityFee = tx.maxPriorityFeePerGas;
    if (maxPriorityFee) {
      priorityFeeArray.push(new BigNumber(maxPriorityFee.toString()));
    } else {
      try {
        maxPriorityFee = tx.gasPrice;
        if (maxPriorityFee) {
          const maxPriorityFeeBN = new BigNumber(maxPriorityFee.toString());
          if (maxPriorityFeeBN.gt(lastBaseFeePerGas)) {
            priorityFeeArray.push(maxPriorityFeeBN.minus(lastBaseFeePerGas));
          }
        }
      } catch (e) {
        // Handle errors if needed
      }
    }
  }

  if (priorityFeeArray.length < 3) {
    return gasPrice ? gasPrice.toString() : "0";
  }

  const sortedPriorityFees = priorityFeeArray.sort((a, b) =>
    a.gt(b) ? 1 : -1
  );
  const percentile = 0.6; // Using 60th percentile for FAST gas price
  const index = Math.floor((sortedPriorityFees.length - 1) * percentile);
  let feePriority = sortedPriorityFees[index];

  if (!feePriority) {
    feePriority = sortedPriorityFees[index - 1];
  }

  let currentEma = new BigNumber(emaValue || "0");
  if (currentEma.isZero()) {
    currentEma = feePriority;
  }

  const multiplier = 1 / 20;
  emaValue = feePriority
    .minus(currentEma)
    .multipliedBy(multiplier)
    .plus(currentEma)
    .toFixed(0);

  return gasPrice ? gasPrice.toString() : "0";
}

/**
 * Prepare EIP-1559 Gas Price
 */
function prepareEip1559GasPrice(
  gasPrice,
  hardCodedFeePriority,
  baseFeeMultiplier,
  chain
) {
  const lastBaseFeePerGas = new BigNumber(baseFeePerGasValue || "0");
  const feePriorityHardcoded = new BigNumber(hardCodedFeePriority);
  const feePriority = new BigNumber(emaValue || "0");
  const maxFeePriority = BigNumber.maximum(feePriority, feePriorityHardcoded);

  const adjustedBaseFeeMultiplier =
    chain === "ETHEREUM" ? 1.08 : baseFeeMultiplier / 100;
  const gasPriceFinal = lastBaseFeePerGas
    .multipliedBy(adjustedBaseFeeMultiplier)
    .plus(maxFeePriority)
    .toFixed(0);

  return gasPriceFinal;
}

/**
 * Increase Gas Price by Percent
 */
function increaseGasPriceByPercent(gasPrice, percent) {
  const gasPriceNumber = parseFloat(gasPrice);
  const gasPriceNew = gasPriceNumber * (1 + percent / 100);
  return Math.floor(gasPriceNew).toString();
}

/**
 * Export getGasPrice Function
 */
module.exports = { getGasPrice };

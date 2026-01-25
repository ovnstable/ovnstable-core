const { getContract, getContractByAddress, showM2M, impersonateAccount } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const { ethers } = require("hardhat");
const { COMMON, OPTIMISM } = require("@overnight-contracts/common/utils/assets");
const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');

async function main() {

  let addresses = [];
  let values = [];
  let abis = [];

  // === HOW TO RUN THIS SCRIPT ===
  // 1. check env and uncomment OP stuff
  // 2. cd pkg/core && hh node
  // 3. Deploy UsdPlusToken: cd pkg/core && hh deploy --tags UsdPlusToken --gov --impl --network localhost
  // 4. copy new impl address and paste to newImpl (probably similar to one there already)
  // 5. cd pkg/proposals && hh run scripts/optimism/36_withdraw_all_usd+.js --network localhost


  // ===================== STATUS =====================
  console.log("=".repeat(30));

  const devJun6 = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856"; // devjun6
  const timelock = "0xBf3FCee0E856c2aa89dc022f00D6D8159A80F011";

  let blockNumber = await ethers.provider.getBlockNumber();
  console.log("Block number:", blockNumber);

  let UsdPlusToken = await getContract('UsdPlusToken', 'optimism');

  const coef = await UsdPlusToken.nonRebasingCreditsPerToken("0xd95E98fc33670dC033424E7Aa0578D742D00f9C7");
  console.log(coef.toString());

  let paused = await UsdPlusToken.isPaused();
  console.log("paused:", paused);

  // ====================== HELPERS ======================

  async function getVelodromePoolTokens(poolAddress) {
    const veloPairAbi = [
      "function tokens() view returns (address,address)"
    ];
    const pool = await ethers.getContractAt(veloPairAbi, poolAddress);
    return await pool.tokens();
  }

  async function logDevBalance(token, tokenName, decimals) {
    const balance = await token.balanceOf(devJun6);
    const formatted = ethers.utils.formatUnits(balance, decimals);
    console.log(
      `devJun6 ${tokenName} balance (/10^${decimals}):`,
      balance.toString(),
      `(≈ ${formatted} ${tokenName})`
    );
    return { balance, formatted };
  }

  async function logTimelockBalance(token, tokenName, decimals) {
    const balance = await token.balanceOf(timelock);
    const formatted = ethers.utils.formatUnits(balance, decimals);
    console.log(
      `timelock ${tokenName} balance (/10^${decimals}):`,
      balance.toString(),
      `(≈ ${formatted} ${tokenName})`
    );
    return { balance, formatted };
  }

  async function logStratBalances(strategy, strategyName, decimals) {
    const nav = await strategy.netAssetValue();
    const formatted = ethers.utils.formatUnits(nav, decimals);
    console.log(`NAV of ${strategyName}:`, nav.toString(), `(≈ ${formatted} USD+)`);
    return { nav, formatted };
  }

  async function logVeloPoolBalances(pool, poolName, token0Name, token0Decimals, token1Name, token1Decimals) {
    const [token0, token1] = await pool.tokens();
    const balance0 = await (await ethers.getContractAt(IERC20, token0)).balanceOf(pool.address);
    const balance1 = await (await ethers.getContractAt(IERC20, token1)).balanceOf(pool.address);
    const stable = await pool.stable();

    console.log(`VELODROME pool ${poolName} (${token0Name}/${token1Name})`, pool.address);
    console.log("token0 address:", token0);
    console.log(`token0 balance (${token0Name}) (/10^${token0Decimals})`, ethers.utils.formatUnits(balance0, token0Decimals));
    console.log("token1 address:", token1);
    console.log(`token1 balance (${token1Name}) (/10^${token1Decimals})`, ethers.utils.formatUnits(balance1, token1Decimals));
    console.log("stable", stable);
    console.log("=".repeat(30));

    return { token0, token1, balance0, balance1, stable };
  }

  async function logSlipstreamPoolBalances(poolAddress, token0Name, token0Decimals, token1Name, token1Decimals) {
    const slipstreamPoolAbi = [
      "function token0() view returns (address)",
      "function token1() view returns (address)",
      "function tickSpacing() view returns (int24)"
    ];
    const pool = await ethers.getContractAt(slipstreamPoolAbi, poolAddress);
    const token0 = await pool.token0();
    const token1 = await pool.token1();
    const tickSpacing = await pool.tickSpacing();
    const balance0 = await (await ethers.getContractAt(IERC20, token0)).balanceOf(poolAddress);
    const balance1 = await (await ethers.getContractAt(IERC20, token1)).balanceOf(poolAddress);

    console.log("SLIPSTREAM pool", poolAddress);
    console.log("token0 address:", token0);
    console.log(`token0 balance (${token0Name}) (/10^${token0Decimals})`, ethers.utils.formatUnits(balance0, token0Decimals));
    console.log("token1 address:", token1);
    console.log(`token1 balance (${token1Name}) (/10^${token1Decimals})`, ethers.utils.formatUnits(balance1, token1Decimals));
    console.log("tickSpacing", tickSpacing);
    console.log("=".repeat(30));

    return { token0, token1, tickSpacing, balance0, balance1 };
  }

  async function logUniswapV3PoolBalances(poolAddress, token0Name, token0Decimals, token1Name, token1Decimals) {
    const uniswapV3PoolAbi = [
      "function token0() view returns (address)",
      "function token1() view returns (address)",
      "function fee() view returns (uint24)"
    ];
    const pool = await ethers.getContractAt(uniswapV3PoolAbi, poolAddress);
    const token0 = await pool.token0();
    const token1 = await pool.token1();
    const fee = await pool.fee();
    const balance0 = await (await ethers.getContractAt(IERC20, token0)).balanceOf(poolAddress);
    const balance1 = await (await ethers.getContractAt(IERC20, token1)).balanceOf(poolAddress);

    console.log("UNISWAPV3 pool", poolAddress);
    console.log("token0 address:", token0);
    console.log(`token0 balance (${token0Name}) (/10^${token0Decimals})`, ethers.utils.formatUnits(balance0, token0Decimals));
    console.log("token1 address:", token1);
    console.log(`token1 balance (${token1Name}) (/10^${token1Decimals})`, ethers.utils.formatUnits(balance1, token1Decimals));
    console.log("fee", fee);
    console.log("=".repeat(30));

    return { token0, token1, fee, balance0, balance1 };
  }

  // ====================== STRATEGY BALANCES ======================

  const StrategyAave = await getContract('StrategyAave', 'optimism');
  const StrategyAaveDai = await getContract('StrategyAaveDai', 'optimism_dai');

  await logStratBalances(StrategyAave, "StrategyAave", 6);
  await logStratBalances(StrategyAaveDai, "StrategyAaveDai", 18);

  // ====================== ASSETS BALANCES ======================
  const usdc = await ethers.getContractAt(IERC20, OPTIMISM.usdc);
  const usdce = await ethers.getContractAt(IERC20, OPTIMISM.usdce);
  const dai = await ethers.getContractAt(IERC20, OPTIMISM.dai);
  const ovn = await ethers.getContractAt(IERC20, OPTIMISM.ovn);
  const weth = await ethers.getContractAt(IERC20, OPTIMISM.weth);
  
  const [_, probably_dola_because_its_token1_in_this_pool_i_checked_fr] = await getVelodromePoolTokens("0x0b28C2e41058EDc7D66c516c617b664Ea86eeC5d");
  const dola = await ethers.getContractAt(IERC20, probably_dola_because_its_token1_in_this_pool_i_checked_fr);


  console.log("=".repeat(30));

  // ====================== VELODROME POOL BALANCES ======================

  const veloPairAbi = [
    "function tokens() view returns (address,address)",
    "function stable() view returns (bool)"
  ];

  console.log("==== VELODROME POOL BALANCES ====");


  const veloPool_usdc_e = await ethers.getContractAt(veloPairAbi, "0xd95E98fc33670dC033424E7Aa0578D742D00f9C7");
  const veloPool_usdc_e_1 = await ethers.getContractAt(veloPairAbi, "0x67124355cCE2Ad7A8eA283E990612eBe12730175");
  const veloPool_dola = await ethers.getContractAt(veloPairAbi, "0x0b28C2e41058EDc7D66c516c617b664Ea86eeC5d");
  const veloPool_dola_2 = await ethers.getContractAt(veloPairAbi, "0xa99817d2d286C894F8f3888096A5616d06F20d46");

  console.log("==== UNISWAPV3 POOL BALANCES ====");


  const uniPoolAddress_usdc_e = "0x2582886F65EA71ECd3CFfD12089C55Fb9C75E9db";
  logUniswapV3PoolBalances(uniPoolAddress_usdc_e, "USD+", 6, "USDC.e", 6);


  console.log("==== SLIPSTREAM POOL BALANCES ====");


  const veloClPoolAddress_usdc = "0xfd5F39c74E63f1dacE336350afDF11E85BBD56F4";

  const veloClPoolAddress_weth = "0x9dA9D8dCdAC3Cab214d2bd241C3835B90aA8fFdE";

 
  // ============================ NEW BALANCES ============================
  console.log("=".repeat(30));


  await logStratBalances(StrategyAave, "StrategyAave", 6);
  await logStratBalances(StrategyAaveDai, "StrategyAaveDai", 18);
  console.log("=".repeat(30));
  await logDevBalance(usdc, "USDC", 6);
  await logDevBalance(usdce, "USDC.e", 6);
  await logDevBalance(dai, "DAI", 18);
  await logDevBalance(dola, "Dola", 18);
  await logDevBalance(ovn, "OVN", 18);
  await logDevBalance(UsdPlusToken, "USD+", 6);
  await logDevBalance(weth, "WETH", 18);
  console.log("=".repeat(30));
  await logVeloPoolBalances(veloPool_usdc_e, "1", "USD+", 6, "USDC.e", 6);
  await logVeloPoolBalances(veloPool_usdc_e_1, "2", "USD+", 6, "USDC.e", 6);
  await logVeloPoolBalances(veloPool_dola, "3", "USD+", 6, "Dola", 18);
  await logVeloPoolBalances(veloPool_dola_2, "4", "USD+", 6, "Dola", 18);


  await logUniswapV3PoolBalances(uniPoolAddress_usdc_e, "USD+", 6, "USDC", 6);

  await logSlipstreamPoolBalances(veloClPoolAddress_usdc, "USDC", 6, "USD+", 6);
  await logSlipstreamPoolBalances(veloClPoolAddress_weth, "WETH", 18, "USD+", 6);

  await logTimelockBalance(UsdPlusToken, "USD+", 6);


  // ========================================================================

  function addProposalItem(contract, methodName, params) {
    addresses.push(contract.address);
    values.push(0);
    abis.push(contract.interface.encodeFunctionData(methodName, params));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const { getContract, getContractByAddress, showM2M, impersonateAccount } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const { ethers } = require("hardhat");
const { COMMON, OPTIMISM } = require("@overnight-contracts/common/utils/assets");
const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');
const IUniswapV3Pool = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');
const IQuoterV2 = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoterV2.sol/IQuoterV2.json');
const ISwapRouter = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json');
const { initWallet } = require("@overnight-contracts/common/utils/script-utils");


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

  // ====================================================================


  // const pairAbi = [
  //   "function stable() view returns (bool)",
  //   "function token0() view returns (address)",
  //   "function token1() view returns (address)",
  //   "function getReserves() view returns (uint112,uint112,uint32)",
  // ];
  
  // const poolAddr = "0xfd5F39c74E63f1dacE336350afDF11E85BBD56F4";
  // const pool = new ethers.Contract(poolAddr, pairAbi, ethers.provider);
  // try {
  //   const isStable = await pool.stable();
  //   const [t0, t1] = await Promise.all([pool.token0(), pool.token1()]);
  //   const [r0, r1] = (await pool.getReserves()).slice(0,2);
  //   console.log({ version: "v1-like", isStable, t0, t1, r0: r0.toString(), r1: r1.toString() });
  // } catch (e) {
  //   console.log("pair ABI failed, try v2 ABI");
  // }

  // ====================================================================

  const devJun6 = "0x18BC3851Ade653de183609EEADCB1f5a7482b5be"; // devjun6

  // const [s0] = await ethers.getSigners();
  // console.log(s0.address);

  // await hre.network.provider.request({
  //   method: "hardhat_impersonateAccount",
  //   params: [devJun6],
  // });
  // let wallet = await ethers.getSigner(devJun6);
  // console.log("wallet:", wallet.address);

  

    // =========================== Mint USD+ ===========================

    let UsdPlusToken = await getContract('UsdPlusToken', 'optimism');

    console.log("=".repeat(30));
    console.log("Minting USD+ to devJun6");
    console.log("=".repeat(30));
  
    const oldImpl = "0x38b4B68B9b1A5d05Ffd14C6A80bde03439D73250"; // impl
    const newImpl = "0x6c70719c9ebc9F1Dedfd9Ac1197dBfF96De03fCA"; // impl
  
    addProposalItem(UsdPlusToken, 'upgradeTo', [newImpl]);
    addProposalItem(UsdPlusToken, 'mint', [devJun6, ethers.utils.parseUnits('1000000', 6)]);
  
    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);



  // ===================== OLD BALANCE OF USD+ =====================
  console.log("=".repeat(30));

  let blockNumber = await ethers.provider.getBlockNumber();
  console.log("Block number:", blockNumber);

  let devUsdPlusBalance = await UsdPlusToken.balanceOf(devJun6);
  let formattedDevUsdPlusBalance = ethers.utils.formatUnits(devUsdPlusBalance, 6);
  console.log("devJun6 USD+ balance:", devUsdPlusBalance.toString(), `(≈ ${formattedDevUsdPlusBalance} USD+)`);

  console.log("=".repeat(30));

  const wallet = await ethers.getSigner(devJun6); // своп выполняем от devJun6
  const quoterAddr = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';
  const routerAddr = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
  const quoter = await ethers.getContractAt(IQuoterV2.abi, quoterAddr, wallet);
  const router = await ethers.getContractAt(ISwapRouter.abi, routerAddr, wallet);

  

  async function processPool(label, poolAddr) {
    console.log("=".repeat(30));
    console.log(`Pool: ${label}`);
    console.log("=".repeat(30));

    const pool = await ethers.getContractAt(IUniswapV3Pool.abi, poolAddr, wallet);

    // state
    const [token0, token1, fee, tickSpacing, slot0] = await Promise.all([
      pool.token0(),
      pool.token1(),
      pool.fee(),
      pool.tickSpacing(),
      pool.slot0(),
    ]);

    // meta/balances
    const token0Contract = await ethers.getContractAt(IERC20, token0, wallet);
    const token1Contract = await ethers.getContractAt(IERC20, token1, wallet);
    const [dec0, dec1, sym0, sym1, bal0, bal1] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.symbol(),
      token0Contract.balanceOf(poolAddr),
      token1Contract.balanceOf(poolAddr),
    ]);

    console.log(`token0: ${token0} (${sym0}, dec=${dec0})`);
    console.log(`token1: ${token1} (${sym1}, dec=${dec1})`);
    console.log("fee:", fee.toString());
    console.log("tickSpacing:", tickSpacing.toString());
    console.log("slot0:", slot0);
    console.log(`pool balances: ${sym0}=${ethers.utils.formatUnits(bal0, dec0)}, ${sym1}=${ethers.utils.formatUnits(bal1, dec1)}`);

    // directions
    const usdPlusAddr = (await getContract('UsdPlusToken', 'optimism')).address;
    const isToken0UsdPlus = token0.toLowerCase() === usdPlusAddr.toLowerCase();
    const tokenIn = usdPlusAddr;
    const tokenOut = isToken0UsdPlus ? token1 : token0;
    const inDec = isToken0UsdPlus ? dec0 : dec1;
    const outDec = isToken0UsdPlus ? dec1 : dec0;
    const outBalance = isToken0UsdPlus ? bal1 : bal0;

    console.log("=".repeat(30));
    console.log("Directions & Decimals");
    console.log("=".repeat(30));
    console.log(`tokenIn (USD+): ${tokenIn}`);
    console.log(`tokenOut: ${tokenOut}`);
    console.log(`decimals in/out: ${inDec}/${outDec}`);
    console.log(`out balance: ${ethers.utils.formatUnits(outBalance, outDec)}`);
    console.log("=".repeat(30));

    // target and quote
    const drainBps = 9800; // берем 98% пула
    const targetAmountOut = outBalance.mul(drainBps).div(10000);
    let amountInMax;

    try {
      const quote = await quoter.callStatic.quoteExactOutputSingle({
        tokenIn,
        tokenOut,
        fee,
        amount: targetAmountOut,
        sqrtPriceLimitX96: 0,
      });
      const slippageBps = 800; // +8%
      amountInMax = quote.amountIn.mul(10000 + slippageBps).div(10000);
      console.log(`drain=${drainBps}bps -> amountOut=${ethers.utils.formatUnits(targetAmountOut, outDec)}, quoteIn=${ethers.utils.formatUnits(quote.amountIn, inDec)}, amountInMax=${ethers.utils.formatUnits(amountInMax, inDec)}`);
    } catch (e) {
      console.log(`Quoter revert on amountOut=${ethers.utils.formatUnits(targetAmountOut, outDec)}`);
      return;
    }

    // balances before swap
    const balanceInBefore = await token0Contract.balanceOf(wallet.address);
    const balanceOutBefore = await token1Contract.balanceOf(wallet.address);

    console.log("Balances before swap:");
    console.log(`in=${ethers.utils.formatUnits(balanceInBefore, inDec)}, out=${ethers.utils.formatUnits(balanceOutBefore, outDec)}`);

    // swap
    if (amountInMax && !targetAmountOut.isZero()) {
      await (await token0Contract.connect(wallet).approve(routerAddr, amountInMax)).wait();
      const allowance = await token0Contract.allowance(wallet.address, routerAddr);
      console.log(`allowance set: ${ethers.utils.formatUnits(allowance, inDec)}`);

      const deadline = Math.floor(Date.now() / 1000) + 600;
      const tx = await router.exactOutputSingle({
        tokenIn,
        tokenOut,
        fee,
        recipient: wallet.address,
        deadline,
        amountOut: targetAmountOut,
        amountInMaximum: amountInMax,
        sqrtPriceLimitX96: 0,
      });
      const receipt = await tx.wait();
      console.log(`Swap done. Tx: ${receipt.transactionHash}`);
    } else {
      console.log('Skip swap: нет валидной квоты или targetAmountOut = 0');
    }

    // balances after swap
    const balanceInAfter = await token0Contract.balanceOf(wallet.address);
    const balanceOutAfter = await token1Contract.balanceOf(wallet.address);
    console.log("Balances after swap:");
    console.log(`in=${ethers.utils.formatUnits(balanceInAfter, inDec)}, out=${ethers.utils.formatUnits(balanceOutAfter, outDec)}`);
    console.log("=".repeat(30));
  }

  // первый пул USD+/USDC
  await processPool('USD+/USDC.e', '0x2582886F65EA71ECd3CFfD12089C55Fb9C75E9db');

  // второй пул USD+/OP
  await processPool('USD+/OP', '0xfC1505B3d4Cd16Bb2336394ad11071638710950F');

  // ============================ NEW BALANCES ============================
  console.log("=".repeat(30));
  UsdPlusToken = await getContract('UsdPlusToken', 'optimism');
  devUsdPlusBalance = await UsdPlusToken.balanceOf(devJun6);
  formattedDevUsdPlusBalance = ethers.utils.formatUnits(devUsdPlusBalance, 6);
  console.log("devJun6 USD+ balance:", devUsdPlusBalance.toString(), `(≈ ${formattedDevUsdPlusBalance} USD+)`);
  console.log("=".repeat(30));

  // =========================== Mint USD+ ===========================
  // console.log("=".repeat(30));
  // console.log("Minting USD+ to devJun6");
  // console.log("=".repeat(30));

  // const oldImpl = "0x38b4B68B9b1A5d05Ffd14C6A80bde03439D73250"; // impl
  // const newImpl = "0x6c70719c9ebc9F1Dedfd9Ac1197dBfF96De03fCA"; // impl

  // addProposalItem(UsdPlusToken, 'upgradeTo', [newImpl]);
  // addProposalItem(UsdPlusToken, 'mint', [devJun6, ethers.utils.parseUnits('1000000', 6)]);

  // await testProposal(addresses, values, abis);
  // // await createProposal(filename, addresses, values, abis);

  // =========================== Withdraw all USD+ ===========================

  // const oldImpl = "0x38b4B68B9b1A5d05Ffd14C6A80bde03439D73250"; // impl
  // const newImpl = "0x6c70719c9ebc9F1Dedfd9Ac1197dBfF96De03fCA"; // impl
      
  // addProposalItem(UsdPlusToken, 'upgradeTo', [newImpl]);
  // UsdPlusToken = await getContract('UsdPlusToken', 'optimism');

  // addProposalItem(UsdPlusToken, 'nukeSupply', []);
  // addProposalItem(UsdPlusToken, 'upgradeTo', [oldImpl]);

  // UsdPlusToken = await getContract('UsdPlusToken', 'optimism');

  // await testProposal(addresses, values, abis);
  // // await createProposal(filename, addresses, values, abis);

  // ============================ NEW BALANCES ============================
  console.log("=".repeat(30));

  UsdPlusToken = await getContract('UsdPlusToken', 'optimism');
  devUsdPlusBalance = await UsdPlusToken.balanceOf(devJun6);
  formattedDevUsdPlusBalance = ethers.utils.formatUnits(devUsdPlusBalance, 6);
  console.log("devJun6 USD+ balance:", devUsdPlusBalance.toString(), `(≈ ${formattedDevUsdPlusBalance} USD+)`);

  console.log("=".repeat(30));

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

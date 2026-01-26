const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { testProposal } = require("@overnight-contracts/common/utils/governance");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const { ethers } = require("hardhat");
const { OPTIMISM } = require("@overnight-contracts/common/utils/assets");

async function main() {

  let addresses = [];
  let values = [];
  let abis = [];

  const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";

  const timelock = '0xBf3FCee0E856c2aa89dc022f00D6D8159A80F011';


  let UsdPlusToken = await getContract('UsdPlusToken', 'optimism');
  let DaiPlusToken = await getContract('UsdPlusToken', 'optimism_dai');

  const USDPLUS = OPTIMISM.usdPlus;
  const WETH = OPTIMISM.weth;
  const USDC = OPTIMISM.usdc;
  const USDC_E = OPTIMISM.usdce;

  const veloPairAbi = [
    "function tokens() view returns (address,address)"
  ];
  const dolaPool = await ethers.getContractAt(veloPairAbi, "0x0b28C2e41058EDc7D66c516c617b664Ea86eeC5d"); // calling for USD+/DOLA pool to get DOLA address
  const [_, DOLA] = await dolaPool.tokens();

  // ====================================================================

  const veloSwapAmount_usdc_e = ethers.utils.parseUnits("10000", 6);
  const veloSwapAmount_usdc_e_1 = ethers.utils.parseUnits("10000", 6);
  const veloSwapAmount_dola = ethers.utils.parseUnits("10000", 6);
  const veloSwapAmount_dola_2 = ethers.utils.parseUnits("10000", 6);

  const uniSwapAmount_usdc_e = ethers.utils.parseUnits("20000", 6);

  const veloClSwapAmount_usdc = ethers.utils.parseUnits("40", 6);
  const veloClSwapAmount_weth = ethers.utils.parseUnits("100000", 6);

  const mintAmountV1 = veloSwapAmount_usdc_e_1
                  .add(veloSwapAmount_dola_2);

  const mintAmountV2 = veloSwapAmount_usdc_e
                  .add(veloSwapAmount_dola);

  const mintAmountSlipstream = veloClSwapAmount_usdc
                              .add(veloClSwapAmount_weth);

  const mintAmountUniswapV3 = uniSwapAmount_usdc_e;

  const mintAmount = mintAmountV1
                .add(mintAmountV2)
                .add(mintAmountSlipstream)
                .add(mintAmountUniswapV3);

  // =====================================================================

  const veloRouterV2Abi = [
    "function swapExactTokensForTokens(uint256,uint256,(address,address,bool,address)[],address,uint256) returns (uint256[])"
  ];
  const veloRouterV1Abi = [
    "function swapExactTokensForTokensSimple(uint256,uint256,address,address,bool,address,uint256) returns (uint256[])"
  ];
  const uniswapV3RouterAbi = [
    "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  ];
  const slipstreamRouterAbi = [
    "function exactInputSingle((address tokenIn,address tokenOut,int24 tickSpacing,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
  ];
  
  const veloRouterV1 = await ethers.getContractAt(veloRouterV1Abi, OPTIMISM.velodromeRouter);
  const veloRouterV2 = await ethers.getContractAt(veloRouterV2Abi, OPTIMISM.velodromeRouterV2);
  const slipstreamRouter = await ethers.getContractAt(slipstreamRouterAbi, "0x0792a633F0c19c351081CF4B211F68F79bCc9676");
  const uniswapV3Router = await ethers.getContractAt(uniswapV3RouterAbi, "0xE592427A0AEce92De3Edee1F18E0157C05861564");

  const veloFactoryAddress = "0xF1046053aa5682b4F9a81b5481394DA16BE5FF5a";

  // ====================================================================

  addProposalItem(UsdPlusToken, "mint", [timelock, mintAmount]);
  addProposalItem(UsdPlusToken, "approve", [veloRouterV1.address, mintAmountV1]);
  addProposalItem(UsdPlusToken, "approve", [veloRouterV2.address, mintAmountV2]);
  addProposalItem(UsdPlusToken, "approve", [slipstreamRouter.address, mintAmountSlipstream]);
  addProposalItem(UsdPlusToken, "approve", [uniswapV3Router.address, mintAmountUniswapV3]);

  // ====================================================================

  addProposalItem(veloRouterV2, "swapExactTokensForTokens",
    [
      veloSwapAmount_usdc_e,
      0,
      [[USDPLUS, USDC_E, true, veloFactoryAddress]],
      wal,
      ethers.constants.MaxUint256
    ]
  );

  addProposalItem(veloRouterV1, "swapExactTokensForTokensSimple",
    [
      veloSwapAmount_usdc_e_1,
      0,
      USDPLUS,
      USDC_E,
      true,
      wal,
      ethers.constants.MaxUint256
    ]
  );

  addProposalItem(veloRouterV2, "swapExactTokensForTokens",
    [
      veloSwapAmount_dola,
      0,
      [[USDPLUS, DOLA, true, veloFactoryAddress]],
      wal,
      ethers.constants.MaxUint256
    ]
  );

  addProposalItem(veloRouterV1, "swapExactTokensForTokensSimple",
    [
      veloSwapAmount_dola_2,
      0,
      USDPLUS,
      DOLA,
      true,
      wal,
      ethers.constants.MaxUint256
    ]
  );

  // =========================== Uniswap V3 ===========================

  addProposalItem(uniswapV3Router, "exactInputSingle",
    [
      {
        tokenIn: USDPLUS,
        tokenOut: USDC_E,
        fee: 100,
        recipient: wal,
        deadline: ethers.constants.MaxUint256,
        amountIn: uniSwapAmount_usdc_e,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      }
    ]
  );

  // =========================== Velodrome SLIPSTREAM ===========================

  addProposalItem(slipstreamRouter, "exactInputSingle",
    [
      {
        tokenIn: USDPLUS,
        tokenOut: USDC,
        tickSpacing: 1,
        recipient: wal,
        deadline: ethers.constants.MaxUint256,
        amountIn: veloClSwapAmount_usdc,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      }
    ]
  );

  addProposalItem(slipstreamRouter, "exactInputSingle",
    [
      {
        tokenIn: USDPLUS,
        tokenOut: WETH,
        tickSpacing: 100,
        recipient: wal,
        deadline: ethers.constants.MaxUint256,
        amountIn: veloClSwapAmount_weth,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      }
    ]
  );

  // ====================================================================

  const RM = '0x63a4CA86118b8C1375565563D53D1826DFcf8801';
  const usdPM = '0xe1E36e93D31702019D38d2B0F6aB926f15008409';
  const daiPM = '0x542BdE36670D066d9386bD7b174Cc81199B2e6A7';

  const StrategyAave = await getContract('StrategyAave', 'optimism');
  const StrategyAaveDai = await getContract('StrategyAaveDai', 'optimism_dai');

  // =========================== Unstake Aave Usdc ===========================

  addProposalItem(StrategyAave, 'setStrategyParams', [timelock, RM]);
  addProposalItem(StrategyAave, 'unstake', [OPTIMISM.usdc, 0, wal, true]);
  addProposalItem(StrategyAave, 'setStrategyParams', [usdPM, RM]);

  // =========================== Unstake Aave DAI ===========================

  addProposalItem(StrategyAaveDai, 'setPortfolioManager', [timelock]);
  addProposalItem(StrategyAaveDai, 'unstake', [OPTIMISM.dai, 0, wal, true]);
  addProposalItem(StrategyAaveDai, 'setPortfolioManager', [daiPM]);

  // =========================== Upgrade USD+ ===========================

  const oldImplUsdPlus = "0x6002054688d62275d80CC615f0F509d9b2FF520d";
  const newImplUsdPlus = "0x6c70719c9ebc9F1Dedfd9Ac1197dBfF96De03fCA";  // change it after deploy to the correct one

  const oldImplDaiPlus = "0x6002054688d62275d80CC615f0F509d9b2FF520d";
  const newImplDaiPlus = "0x6c70719c9ebc9F1Dedfd9Ac1197dBfF96De03fCA";  // change it after deploy to the correct one // 0xFD8EC2afEC60e8B38BF5174EF0fC639A0ea5ABA2
      
  addProposalItem(UsdPlusToken, 'upgradeTo', [newImplUsdPlus]);
  addProposalItem(DaiPlusToken, 'upgradeTo', [newImplDaiPlus]);
  UsdPlusToken = await getContract('UsdPlusToken', 'optimism');
  DaiPlusToken = await getContract('UsdPlusToken', 'optimism_dai');

  // =========================== Nuke USD+ and Dai+ ===========================

  addProposalItem(UsdPlusToken, 'nukeSupply', [timelock]);
  // addProposalItem(UsdPlusToken, 'upgradeTo', [oldImplUsdPlus]);
  addProposalItem(DaiPlusToken, 'nukeSupply', [timelock]);
  // addProposalItem(DaiPlusToken, 'upgradeTo', [oldImplDaiPlus]);

  // ========================================================================

  await testProposal(addresses, values, abis);
  // await createProposal(filename, addresses, values, abis);

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

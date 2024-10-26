const hre = require("hardhat");
const { getContract, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const { strategyAerodromeUsdcParams } = require('@overnight-contracts/strategies-base/deploy/usdc/06_strategy_aeroswap_usdc');
const { swapSimulatorAerodrome } = require('@overnight-contracts/strategies-base/deploy/usdc/07_swap_simulator');
const { BigNumber } = require("ethers");
const { BASE } = require("@overnight-contracts/common/utils/assets");

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let mainAddress = (await initWallet()).address;
    await transferETH(100, mainAddress);

    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'base_usdc');
    let timelock = await getContract('AgentTimelock', 'base_usdc');
    let rm = await getContract('RoleManager', 'base_usdc');

    const StrategyAerodromeSwapUsdc = await getContract('StrategyAerodromeSwapUsdc', 'base_usdc');
    const StrategyAerodromeUsdc = await getContract('StrategyAerodromeUsdc', 'base_usdc');
    const SwapSimulatorAerodrome = await getContract('SwapSimulatorAerodrome', 'base');

    const newSwapImpl = "0x282f1DeAF6EcBb74e5E6674eDaA33F475FBab762";
    const newSimulationImpl = "0xc22a4f4b923174aD8E9Fc5E86b7c3eB924222128";
    const newMintImpl = "0xC218B426f3F586b4CdD27746C72C5e031e05b2cE";


    let w = await pm.getAllStrategyWeights();

    let wCopy = w.map((element) => {
        let arr = [];
        for (let i = 0; i < element.length; i++) {
          arr[i] = element[i];
        }
        for (let key in element) {
          if (Object.prototype.hasOwnProperty.call(element, key)) {
            if (!Number.isInteger(Number(key))) {
              if (BigNumber.isBigNumber(element[key])) {
                arr[key] = BigNumber.from(element[key]);
              } else {
                arr[key] = element[key];
              }
            }
          }
        }
        return arr;
      });

      const tempTargetWeight = wCopy[4].targetWeight;
      const tempMaxWeight = wCopy[4].maxWeight;

    wCopy.push(
        {
            strategy: StrategyAerodromeSwapUsdc.address,
            minWeight: 0,
            targetWeight: tempTargetWeight,
            maxWeight: tempMaxWeight,
            riskFactor: 0,
            enabled: true,
            enabledReward: true
        }
    )

    wCopy[4][2] = wCopy[4][1];
    wCopy[4].targetWeight = wCopy[4][1];
    wCopy[4][3] = wCopy[4][1];

    addProposalItem(pm, "addStrategy", [StrategyAerodromeSwapUsdc.address]);    
    addProposalItem(StrategyAerodromeSwapUsdc, "upgradeTo", [newSwapImpl]);
    addProposalItem(SwapSimulatorAerodrome, "upgradeTo", [newSimulationImpl]);
    addProposalItem(StrategyAerodromeSwapUsdc, "setParams", [await strategyAerodromeUsdcParams()]);
    addProposalItem(StrategyAerodromeUsdc, "upgradeTo", [newMintImpl]);
    addProposalItem(StrategyAerodromeUsdc, "_hotFix", [StrategyAerodromeSwapUsdc.address]);
    addProposalItem(pm, "setStrategyWeights", [wCopy]);   
    addProposalItem(pm, "removeStrategy", [StrategyAerodromeUsdc.address]);
    
    addProposalItem(SwapSimulatorAerodrome, "setSimulationParams", [{
        strategy: StrategyAerodromeSwapUsdc.address, 
        factory: BASE.aerodromeFactory
    }]);
    addProposalItem(StrategyAerodromeSwapUsdc, "setStrategyParams", [timelock.address, rm.address]);
    addProposalItem(StrategyAerodromeSwapUsdc, "stake", [BASE.usdc, 0n]);
    addProposalItem(StrategyAerodromeSwapUsdc, "setStrategyParams", [pm.address, rm.address]);


    let nav = await StrategyAerodromeUsdc.netAssetValue();
    console.log("nav1", nav.toString());
    
    await testProposal(addresses, values, abis);

    nav = await StrategyAerodromeSwapUsdc.netAssetValue();
    console.log("nav2", nav.toString());

    // await testUsdPlus(filename, 'base_usdc');
    await testStrategy(filename, StrategyAerodromeSwapUsdc);
    
    // await createProposal(filename, addresses, values, abis);

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


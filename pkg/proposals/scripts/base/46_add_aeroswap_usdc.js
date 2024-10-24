const hre = require("hardhat");
const { getContract, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const { strategyAerodromeUsdcParams } = require('@overnight-contracts/strategies-base/deploy/usdc/06_strategy_aeroswap_usdc');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let mainAddress = (await initWallet()).address;
    await transferETH(100, mainAddress);

    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'base_usdc');

    const StrategyAerodromeSwapUsdc = await getContract('StrategyAerodromeSwapUsdc', 'base_usdc');
    const StrategyAerodromeUsdc = await getContract('StrategyAerodromeUsdc', 'base_usdc');
    const newSwapImpl = "0x26473D5dAa367fA117Cfb3e3b8505b0B8270F1A3";
    const newMintImpl = "0x3B7Bff094e1150Fd740A6b2982AD271416f6a8a6";

    
    await StrategyAerodromeSwapUsdc.upgradeTo(newSwapImpl);
    await StrategyAerodromeSwapUsdc.setParams(await strategyAerodromeUsdcParams());

    
    
    
    addProposalItem(StrategyAerodromeUsdc, "upgradeTo", [newMintImpl]);


    let nav = await StrategyAerodromeSwapUsdc.netAssetValue();
    console.log("nav1", nav.toString());
    

    await testProposal(addresses, values, abis);
    await StrategyAerodromeUsdc._hotFix(StrategyAerodromeSwapUsdc.address);

    console.log("addr: ", StrategyAerodromeSwapUsdc.address)

    console.log("usdc:", await StrategyAerodromeSwapUsdc.usdc())

    nav = await StrategyAerodromeSwapUsdc.netAssetValue();
    console.log("nav2", nav.toString());

    await testUsdPlus(filename, 'base_usdc');
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


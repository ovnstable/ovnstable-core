const hre = require("hardhat");
const {getContract, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {BSC} = require("@overnight-contracts/common/utils/assets");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let strategyVenusBusd = await getContract('StrategyVenusBusd');

    let StrategyVenusBusdParams = {
        busdToken: BSC.busd,
        vBusdToken: BSC.vBusd,
        unitroller: BSC.unitroller,
        pancakeRouter: BSC.pancakeRouter,
        xvsToken: BSC.xvs,
        wbnbToken: BSC.wBnb,
    };

    addresses.push(strategyVenusBusd.address);
    values.push(0);
    abis.push(strategyVenusBusd.interface.encodeFunctionData('upgradeTo', ['0x6aFC017203Cd13EA1B2aD8fc2a09E397507D6058']));

    addresses.push(strategyVenusBusd.address);
    values.push(0);
    abis.push(strategyVenusBusd.interface.encodeFunctionData('setParams', [StrategyVenusBusdParams]));

    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await testUsdPlus();
    // await testStrategy(strategyVenusBusd);
    // await showM2M();

    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


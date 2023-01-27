const hre = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {BSC} = require("@overnight-contracts/common/utils/assets");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let StrategyVenusBusd = await getContract('StrategyVenusBusd');

    let StrategyVenusBusdParams = {
        busdToken: BSC.busd,
        vBusdToken: BSC.vBusd,
        unitroller: BSC.unitroller,
        pancakeRouter: BSC.pancakeRouter,
        xvsToken: BSC.xvs,
        wbnbToken: BSC.wBnb,
    };

    addresses.push(StrategyVenusBusd.address);
    values.push(0);
    abis.push(StrategyVenusBusd.interface.encodeFunctionData('upgradeTo', ['0x56fA2031F9df2AFac723e0a0b3D2b2800e4508cf']));

    addresses.push(StrategyVenusBusd.address);
    values.push(0);
    abis.push(StrategyVenusBusd.interface.encodeFunctionData('setParams', [StrategyVenusBusdParams]));

    await testProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


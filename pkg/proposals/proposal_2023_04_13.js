const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
let {OPTIMISM} = require('@overnight-contracts/common/utils/assets');
const {Roles} = require("@overnight-contracts/common/utils/roles");

let arrakisRouter = "0x9ce88a56d120300061593eF7AD074A1B710094d5";
let arrakisRewards = "0x87c7c885365700D157cd0f39a7803320fe86f0f5";
let arrakisVault = "0x632336474f5Bf11aEbECd63B84A0a2800B99a490";
let poolUsdcOpFee = 500; // 0.05%

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'bsc');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', ['0xC7998aCE498eb987D1Ff625Af7Fb7a0449C1C6EE']));

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', ['0x049915356d236a93ff235098042fb27301a9BDf4']));


    let PortfolioManagerUsdt = await getContract('PortfolioManager', 'bsc_usdt');

    addresses.push(PortfolioManagerUsdt.address);
    values.push(0);
    abis.push(PortfolioManagerUsdt.interface.encodeFunctionData('addStrategy', ['0x549e68a9dfC9aCeBE13CC7339f223713AF32363C']));

    addresses.push(PortfolioManagerUsdt.address);
    values.push(0);
    abis.push(PortfolioManagerUsdt.interface.encodeFunctionData('addStrategy', ['0x96713895c0c2E2ab5F9D8142C3718898118Cd6aD']));


    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


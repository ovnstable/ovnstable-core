const { getContract, showM2M, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const path = require('path');
const {ethers} = require("hardhat");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    // let wallet = await initWallet();
    // await transferETH(1, wallet.address);

    let addresses = [];
    let values = [];
    let abis = [];

    let exchange = await getContract('Exchange', 'optimism');
    let usdplus = await getContract('UsdPlusToken', 'optimism');
    let payout = await getContract('OptimismPayoutManager', 'optimism');
    let pm = await getContract('PortfolioManager', 'optimism');
    let gamma = await getContract('StrategyEtsGamma', 'optimism');
    let beta = await getContract('StrategyEtsBeta', 'optimism');
    let sonne = await getContract('StrategySonneUsdc', 'optimism');

    let implEx = "0xa01a1807bAa787981c3536711bDB4a05E5f3f04f";
    let implUsdp = "0x0cCCb7d6aaFB23D055E350dF93adfbd1189CB1bd";
    let implGamma = "0x4f5A3Bce3Cf5EdeF1a8CBf230209BFF44DC0926b";
    let implSonne = "0x69076C46Bd6eeE184B2fd8b1ca71ac7F324C69D5";

    addProposalItem(gamma, 'upgradeTo', [implGamma]);
    addProposalItem(sonne, 'upgradeTo', [implSonne]);

    addProposalItem(exchange, 'unpause', []);
    addProposalItem(usdplus, 'unpause', []);

    addProposalItem(pm, 'removeStrategy', ["0x9C6E45e5b06B1430FDF190ae0A39Af5f22FcF6FB"]); //sonne usdc
    addProposalItem(pm, 'removeStrategy', ["0x0f6C2C868b94Ca6f00F77674009b34E0C9e67dB8"]); //gamma op
    addProposalItem(pm, 'removeStrategy', ["0x09aeE63ea7b3C81cCe0E3b047acb2878e1135EE5"]); //gamma beta

    addProposalItem(payout, 'removeItems', []);
    addProposalItem(exchange, 'upgradeTo', [implEx]);
    addProposalItem(usdplus, 'upgradeTo', [implUsdp]);

    addProposalItem(pm, 'balance', []);

    addProposalItem(exchange, 'negativeRebase', []);

    addProposalItem(exchange, 'pause', []);
    addProposalItem(usdplus, 'pause', []);
    
    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    await createProposal(filename, addresses, values, abis);

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


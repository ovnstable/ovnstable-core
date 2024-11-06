const { getContract, showM2M, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");
const {toE18, toE8} = require("@overnight-contracts/common/utils/decimals");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    // let wallet = await initWallet();
    // await transferETH(1, wallet.address);

    let addresses = [];
    let values = [];
    let abis = [];

    let roleManager = await getContract('RoleManager', 'optimism');
    const oracle = await getContract('OvnOracleOffChain', 'optimism');

    let params = {
        roleManager: roleManager.address,
        asset: OPTIMISM.ovn,
        minPriceUsd: toE8(1),
        maxPriceUsd: toE8(100),
        duration: 24 * 60 * 60,
    }

    addProposalItem(oracle, 'setParams', [params]);
    
    await testProposal(addresses, values, abis);
    //await createProposal(filename, addresses, values, abis);

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


const { getContract, showM2M } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let roleManager = await getContract('RoleManager', 'arbitrum');
    let devOld = "0x086dFe298907DFf27BD593BD85208D57e0155c94"; // dev5
    let devNew = "0x68f504f38a5E6C04670883739d34538Fd66aC990"; // dev6
    
    addProposalItem(roleManager, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, devNew]);
    addProposalItem(roleManager, 'grantRole', [Roles.UNIT_ROLE, devNew]);
    addProposalItem(roleManager, 'revokeRole', [Roles.PORTFOLIO_AGENT_ROLE, devOld]);
    addProposalItem(roleManager, 'revokeRole', [Roles.UNIT_ROLE, devOld]);
    
    // await testProposal(addresses, values, abis);
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


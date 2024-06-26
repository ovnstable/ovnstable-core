const { getContract, showM2M, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    // let wallet = await initWallet();
    // await transferETH(1, wallet.address);

    let addresses = [];
    let values = [];
    let abis = [];

    let roleManager = await getContract('RoleManager', 'linea');
    let timelock = await getContract('AgentTimelock', 'linea');
    let dev3 = "0x05129E3CE8C566dE564203B0fd85111bBD84C424";
    let dev4 = "0xcd8562CD85fD93C7e2E80B4Cf69097E5562a76f9";

    addProposalItem(roleManager, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, timelock.address]);
    addProposalItem(roleManager, 'grantRole', [Roles.UNIT_ROLE, timelock.address]);
    addProposalItem(roleManager, 'grantRole', [Roles.PORTFOLIO_AGENT_ROLE, dev4]);
    addProposalItem(roleManager, 'grantRole', [Roles.UNIT_ROLE, dev4]);
    addProposalItem(roleManager, 'revokeRole', [Roles.PORTFOLIO_AGENT_ROLE, dev3]);
    addProposalItem(roleManager, 'revokeRole', [Roles.UNIT_ROLE, dev3]);
    
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


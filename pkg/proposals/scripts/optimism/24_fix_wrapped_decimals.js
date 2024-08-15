const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const { strategyEtsEtaParams } = require("@overnight-contracts/strategies-base/deploy/11_ets_eta");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let wrapped = await getContract('WrappedUsdPlusToken', 'optimism');

    const wrappedFixAddress = '0x1e52BcCfCb0933DC8A331Aa7A10997c0970A7564';
    const wrappedPureAddress = '0x46B0Bc31238195fBdc7258f91fE848FFFDe5d123';

    addProposalItem(wrapped, "upgradeTo", [wrappedFixAddress]);
    addProposalItem(wrapped, "admin", []);
    addProposalItem(wrapped, "upgradeTo", [wrappedPureAddress]);
    
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


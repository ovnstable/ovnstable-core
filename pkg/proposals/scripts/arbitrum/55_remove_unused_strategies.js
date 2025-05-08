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

    let pm = await getContract('PortfolioManager', 'arbitrum');
    let pmUsdt = await getContract('PortfolioManager', 'arbitrum_usdt');

    let sperEpsilon = await getContract('StrategySperEpsilon', 'arbitrum_usdt');
    let compoundUsdc = await getContract('StrategyCompoundUsdc', 'arbitrum');
    addProposalItem(sperEpsilon, 'upgradeTo', ['0xd20c9515Ad85e6FBb8D510ad1638c14C00aa2222']);
    addProposalItem(compoundUsdc, 'upgradeTo', ['0x614C02a6bBfdb22C63f2c469B0E135420855C96e']);

    addProposalItem(pm, 'removeStrategy', ['0x32DabdE50e764af7d13E3dF6b7D3cf00a39f83Af']);
    addProposalItem(pm, 'removeStrategy', ['0x0f0d417bd98dC246b581d23CAE83584bd4096Cd6']);
    addProposalItem(pm, 'removeStrategy', ['0x95bfd5F980aCc358Ecaafa84Ae61571750F46b1E']);
    addProposalItem(pm, 'removeStrategy', ['0xF4e58b63FD822E6543245128a42fE8Ad22db161d']);

    addProposalItem(pmUsdt, 'removeStrategy', ['0xD025E837F94847fa657Db5a9812078A3B28A494c']);
    addProposalItem(pmUsdt, 'removeStrategy', ['0xe0C4d19f9778e7D8770FBCb01694Ca4B622BFeEe']);
    addProposalItem(pmUsdt, 'removeStrategy', ['0x2EDABE1c38e03f53FAE356913893485f1D712F60']);
    addProposalItem(pmUsdt, 'removeStrategy', ['0x8Fe05D752174A1c65019AEC018c32040c9aa1372']);

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


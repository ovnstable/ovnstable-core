const hre = require('hardhat');
const { getContract, showM2M, execTimelock } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal, testUsdPlus, testStrategy } = require('@overnight-contracts/common/utils/governance');
const { Roles } = require('@overnight-contracts/common/utils/roles');

const path = require('path');
const { prepareEnvironment } = require('@overnight-contracts/common/utils/tests');
const { strategySiloUsdc } = require('@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc');
const { strategySiloUsdcWbtc } = require('@overnight-contracts/strategies-arbitrum/deploy/40_strategy_silo_wbtc');
const { strategySiloUsdcArb } = require('@overnight-contracts/strategies-arbitrum/deploy/41_strategy_silo_arb');
const { strategySiloUsdtWbtc } = require('@overnight-contracts/strategies-arbitrum/deploy/usdt/06_strategy_silo_usdt_wbtc');
const { strategySiloUsdtArb } = require('@overnight-contracts/strategies-arbitrum/deploy/usdt/07_strategy_silo_usdt_arb');
const { strategySiloEth } = require('@overnight-contracts/strategies-arbitrum/deploy/eth/06_strategy_silo_eth');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'arbitrum');
    
    addProposalItem(pm, 'upgradeTo', ['0xEb5Da68B1B06145b97d86F421F3F1F4C02513808']);
    
    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'arbitrum');

    await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

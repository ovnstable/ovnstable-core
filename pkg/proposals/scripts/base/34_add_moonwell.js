const hre = require("hardhat");
const { getContract, transferETH, initWallet, showM2M, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const {
    createProposal,
    testProposal,
    testUsdPlus,
    testStrategy
} = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const { strategyEtsEtaParams } = require("@overnight-contracts/strategies-base/deploy/11_ets_eta");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    // let mainAddress = (await initWallet()).address;
    // await transferETH(100, mainAddress);   

    let addresses = [];
    let values = [];
    let abis = [];

    let strategy = await getContract('StrategyMoonwell', 'base');
    let pm = await getContract('PortfolioManager', 'base');

    console.log("addr", strategy.address);

    addProposalItem(pm, 'addStrategy', [strategy.address]);
    
    // await testProposal(addresses, values, abis);
    // await testStrategy(filename, strategy, 'base');
    // await testUsdPlus(filename, 'base');

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


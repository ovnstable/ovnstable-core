const hre = require('hardhat');
const { getContract, showM2M, execTimelock, impersonateAccount, initWallet, getERC20ByAddress, transferETH } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal, testUsdPlus, testStrategy } = require('@overnight-contracts/common/utils/governance');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {BASE} = require("@overnight-contracts/common/utils/assets");

const path = require('path');
const { prepareEnvironment } = require('@overnight-contracts/common/utils/tests');
const { strategyMoonwellParams } = require('@overnight-contracts/strategies-base/deploy/25_strategy_moonwell');
const { strategyMoonwellUsdcParams } = require('@overnight-contracts/strategies-base/deploy/usdc/01_strategy_moonwell_usdc');
const { strategyMoonwellDaiParams } = require('@overnight-contracts/strategies-base/deploy/dai/04_strategy_moonwell_dai');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let moonwell = await getContract('StrategyMoonwell', 'base');
    let moonwellUsdc = await getContract('StrategyMoonwellUsdc', 'base_usdc');
    let moonwellDai = await getContract('StrategyMoonwellDai', 'base_dai');

    let moonwellImpl = "0x76DaF27c7A0c9eD2E8b1DD38C3aE62F62Ec91271";
    let moonwellUsdcImpl = "0x76DaF27c7A0c9eD2E8b1DD38C3aE62F62Ec91271";
    let moonwellDaiImpl = "0xdc7abeef414B8fe8487bB84C38C8B56ff71c5a2e";

    addProposalItem(moonwell, 'upgradeTo', [moonwellImpl]);
    addProposalItem(moonwell, 'setParams', [await strategyMoonwellParams()]);

    addProposalItem(moonwellUsdc, 'upgradeTo', [moonwellUsdcImpl]);
    addProposalItem(moonwellUsdc, 'setParams', [await strategyMoonwellUsdcParams()]);

    addProposalItem(moonwellDai, 'upgradeTo', [moonwellDaiImpl]);
    addProposalItem(moonwellDai, 'setParams', [await strategyMoonwellDaiParams()]);

    // await testProposal(addresses, values, abis);

    // let wallet = await initWallet();
    // let well = await getERC20ByAddress(BASE.well, wallet.address);
    // console.log("moonwell well", (await well.balanceOf(moonwell.address)).toString());
    // console.log("moonwellUsdc well", (await well.balanceOf(moonwellUsdc.address)).toString());
    // console.log("moonwellDai well", (await well.balanceOf(moonwellDai.address)).toString());

    // await (await moonwell.claimRewards(wallet.address)).wait();
    // await (await moonwellUsdc.claimRewards(wallet.address)).wait();
    // await (await moonwellDai.claimRewards(wallet.address)).wait();

    // console.log("moonwell well", (await well.balanceOf(moonwell.address)).toString());
    // console.log("moonwellUsdc well", (await well.balanceOf(moonwellUsdc.address)).toString());
    // console.log("moonwellDai well", (await well.balanceOf(moonwellDai.address)).toString());
    
    // await testStrategy(filename, moonwell, 'base');
    // await testStrategy(filename, moonwellUsdc, 'base_usdc');
    // await testStrategy(filename, moonwellDai, 'base_dai');

    // await testUsdPlus(filename, 'base');
    // await testUsdPlus(filename, 'base_usdc');
    // await testUsdPlus(filename, 'base_dai');

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

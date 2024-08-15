const {getContract, showM2M, execTimelock, getERC20ByAddress, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {testProposal, createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let pendle = await getContract('StrategyPendleDaiGDai', 'arbitrum_dai');

    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(pendle.address);
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('upgradeTo', ['0x4332b77F3c8C5b5a650555b01a404F8b4bC272A7']));

    addresses.push(pendle.address);
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('sendLPTokens', [7200]));

    await showM2M();

    // await testProposal(addresses, values, abis);
    await createProposal(addresses, values, abis);

    await showM2M();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


const {getContract, showM2M, execTimelock, getERC20ByAddress, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {testProposal, createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18} = require("@overnight-contracts/common/utils/decimals");

async function main() {


    let pendle = await getContract('StrategyPendleUsdcUsdt', 'arbitrum');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(pendle.address);
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('upgradeTo', ['0x4a556162E3404E8aC0B3514Ba69cbdA2afDCB01C']));

    addresses.push(pendle.address);
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('sendLPTokens', [3700]));


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


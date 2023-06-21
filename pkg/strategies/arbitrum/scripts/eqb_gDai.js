const {getContract, showM2M, execTimelock, getERC20ByAddress, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {testProposal, createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18} = require("@overnight-contracts/common/utils/decimals");

async function main() {


    let eqb = await getContract('StrategyEquilibriaDaiGDai', 'arbitrum_dai');
    let pendle = await getContract('StrategyPendleDaiGDai', 'arbitrum_dai');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(eqb.address);
    values.push(0);
    abis.push(eqb.interface.encodeFunctionData('upgradeTo', ['0xE3B871b6d39E5096aF681cc5E40Bc71253D49560']));

    addresses.push(pendle.address);
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('upgradeTo', ['0xDB75c9AFB0b074C7E2D58bd060584f7E9E12113C']));


    let addresses1 = [];
    let values1 = [];
    let abis1 = [];
    addresses1.push(pendle.address);
    values1.push(0);
    abis1.push(pendle.interface.encodeFunctionData('sendLPTokens', [1000]));

    addresses1.push(eqb.address);
    values1.push(0);
    abis1.push(eqb.interface.encodeFunctionData('stakeLp', []));

    await testProposal(addresses, values, abis);

    await showM2M();

    let lp = await getERC20ByAddress('0xa0192f6567f8f5DC38C53323235FD08b318D2dcA', await initWallet());

    console.log("LP before: " + await lp.balanceOf(eqb.address));
    await testProposal(addresses1, values1, abis1);
    console.log("LP after: " + await lp.balanceOf(eqb.address));

    // await createProposal(addresses, values, abis);

    await showM2M();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


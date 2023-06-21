const {getContract, showM2M, execTimelock, getERC20ByAddress, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {testProposal, createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18} = require("@overnight-contracts/common/utils/decimals");

async function main() {


    let eqb = await getContract('StrategyEquilibriaUsdcUsdt', 'arbitrum');
    let pendle = await getContract('StrategyPendleUsdcUsdt', 'arbitrum');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(eqb.address);
    values.push(0);
    abis.push(eqb.interface.encodeFunctionData('upgradeTo', ['0x98DdE58104ADD8aB135Dd05a7200595Ce9010101']));

    addresses.push(pendle.address);
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('upgradeTo', ['0xe7fEaBF360967074bEfb2D0913978E0567eD1c1c']));

    addresses.push(pendle.address);
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('sendLPTokens', [3700]));

    await showM2M();

    let lp = await getERC20ByAddress('0x0A21291A184cf36aD3B0a0def4A17C12Cbd66A14', await initWallet());

    // console.log("LP before: " + await lp.balanceOf(eqb.address));
    // await testProposal(addresses, values, abis);
    // console.log("LP after: " + await lp.balanceOf(eqb.address));

    await createProposal(addresses, values, abis);

    await showM2M();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


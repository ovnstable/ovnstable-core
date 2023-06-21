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
    abis.push(eqb.interface.encodeFunctionData('upgradeTo', ['0x3216E7c63B157718f9Fee96265cAF6e9281c4959']));

    addresses.push(pendle.address);
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('upgradeTo', ['0x6FC92e4BAb11ad4AE00cca462607048E7652C555']));

    addresses.push(eqb.address);
    values.push(0);
    abis.push(eqb.interface.encodeFunctionData('sendLPTokens', [9900]));

    addresses.push(pendle.address);
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('stakeLp', []));

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


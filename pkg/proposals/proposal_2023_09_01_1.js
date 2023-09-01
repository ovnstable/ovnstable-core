const { getContract, execTimelock, showM2M } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { strategySmmAlphaParams } = require("@overnight-contracts/strategies-base/deploy/smm/01_smm_alpha");
const { strategySmmBetaParams } = require("@overnight-contracts/strategies-base/deploy/smm/02_smm_beta");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategySmmAlpha = await getContract('StrategySmmAlpha', 'base');
    let StrategySmmBeta = await getContract('StrategySmmBeta', 'base_dai');

    addresses.push(StrategySmmAlpha.address);
    values.push(0);
    abis.push(StrategySmmAlpha.interface.encodeFunctionData('setParams', [await strategySmmAlphaParams()]));

    addresses.push(StrategySmmBeta.address);
    values.push(0);
    abis.push(StrategySmmBeta.interface.encodeFunctionData('setParams', [await strategySmmBetaParams()]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


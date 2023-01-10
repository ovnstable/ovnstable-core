const {getContract, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testProposal, testUsdPlus} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let StrategyAave = await getContract('StrategyAaveV2');

    addresses.push(StrategyAave.address);
    values.push(0);
    abis.push(StrategyAave.interface.encodeFunctionData('grantRole', ['0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3','0xa8b1981bee803c5de8c714fd0dae7a054b114653']));

    addresses.push(StrategyAave.address);
    values.push(0);
    abis.push(StrategyAave.interface.encodeFunctionData('upgradeTo', ['0xc991047d9bd4513274b74DBe82b94cc22252CB30']));

    await createProposal(addresses, values, abis)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


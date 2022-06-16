const hre = require("hardhat");
const fs = require("fs");

const {showM2M, getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");

async function main() {

    let governor = await getContract('OvnGovernor');

    await evmCheckpoint('Before');
    await showM2M();
    let opts = await getPrice();
    opts.gasLimit = "15000000"
    await (await governor.executeExec(
        "103592307014576708617364387971453183776614942898173418078661203019478279010206",
        opts
    )).wait();
    await showM2M();
    await evmRestore('Before');
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


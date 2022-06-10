const hre = require("hardhat");
const fs = require("fs");

const {showM2M, getContract} = require("@overnight-contracts/common/utils/script-utils");
const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");

async function main() {

    let governor = await getContract('OvnGovernor');

    await evmCheckpoint('Before');
    await showM2M();
    await governor.executeExec("10130477478296026602653305448580635830967906936459854995233021282570936618807");
    await showM2M();
    await evmRestore('Before');
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


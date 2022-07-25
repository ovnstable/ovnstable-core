const {verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");

async function main() {

    // Verification for OvnGovernor need pass constructor arguments to verify task.
    const token = await getContract("OvnToken");
    const controller = await getContract("OvnTimelockController");
    const governor = await getContract('OvnGovernor');

    await hre.run("verify:verify", {
      address: governor.address,
      constructorArguments: [token.address, controller.address ],
    });

    let items = ["OvnToken",  "OvnTimelockController"];
    await verify(items);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


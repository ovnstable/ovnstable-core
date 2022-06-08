const {verify } = require("@overnight-contracts/common/utils/verify-utils");

async function main() {


    // Verification for OvnGovernor need pass constructor arguments to verify task.
    // await hre.run("verify:verify", {
    //   address: address,
    //   constructorArguments: [set arguments],
    //});

    let items = ["OvnToken", "OvnGovernor", "OvnTimelockController"];
    await verify(items);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


const hre = require("hardhat");
const ethers = hre.ethers;
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');


async function verify(items) {

    await hre.run("compile");

    let results = [];
    for (let i = 0; i < items.length; i++) {
        let item = items[i];

        let result = {};

        result.name = item;
        let verified = false;

        try {
            let deployment = await hre.deployments.get(item);

            const currentImplAddress = await getImplementationAddress(ethers.provider, deployment.address);

            console.log(`Verify ${item}:[${currentImplAddress}]`)
            try {
                await hre.run("verify:verify", {
                    address: currentImplAddress,
                    constructorArguments: [],
                });

                verified = true;
            } catch (e) {
                if (e.message === "Contract source code already verified") {
                    verified = true;
                    console.log('Contract source code already verified');
                } else {
                    console.log('Error: ' + e.message);
                }

            }

            result.proxy = deployment.address;
            result.impl = currentImplAddress;
        } catch (e) {
            console.log('Error: ' + e.message);

            result.proxy = "-";
            result.impl = "-";
        }
        result.verified = verified;

        results.push(result);
    }


    console.table(results);
}

module.exports = {
    verify: verify
}

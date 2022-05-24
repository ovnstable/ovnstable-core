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

            let address = deployment.address;
            try {
                address = await getImplementationAddress(ethers.provider, deployment.address);
            } catch (e) {
                console.log('Error found proxy: '+ e.message);
            }

            console.log(`Verify ${item}:[${address}]`)
            try {
                await hre.run("verify:verify", {
                    address: address,
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
            result.impl = address;
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

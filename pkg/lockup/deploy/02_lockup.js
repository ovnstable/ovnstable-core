// const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
// const {ethers, deployments} = require("hardhat");
// const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
// const {toE18, toE6, fromE18, fromE6} = require("@overnight-contracts/common/utils/decimals");
// const {getContract} = require("@overnight-contracts/common/utils/script-utils");
// const moment = require("moment");
// const BigNumber = require("bignumber.js");
// const hre = require("hardhat");

// module.exports = async ({getNamedAccounts, deployments}) => {
//     const {deploy} = deployments;
//     const {deployer} = await getNamedAccounts();
//     const {save} = deployments;

//     let beneficiaryAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
//     let startTimestamp = moment().add(5, 'minutes');
//     let durationSeconds = 3600;

//     let items = [
//         {
//             name: 'beneficiary',
//             value: beneficiaryAddress
//         },
//         {
//             name: 'startTimestamp',
//             value: startTimestamp.toISOString(),
//             comment: startTimestamp.unix()
//         },
//         {
//             name: 'durationSeconds',
//             value: durationSeconds.toISOString(),
//             comment: durationSeconds.unix()
//         },
//     ]

//     console.table(items);

//     let params = {
//         beneficiaryAddress: beneficiaryAddress,
//         startTimestamp: startTimestamp,
//         durationSeconds: durationSeconds,
//     }

//     let lockup = await deployments.deploy("Lockup", {
//         from: deployer,
//         args: [
//             params
//         ],
//         log: true,
//         skipIfAlreadyDeployed: false
//     });
//     console.log("Lockup created at " + lockup.address);

//     // await hre.run("verify:verify", {
//     //     address: overflowICO.address,
//     //     constructorArguments: [params],
//     // });
// };


// module.exports.tags = ['Lockup'];

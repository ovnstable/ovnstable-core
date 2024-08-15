const {ethers, upgrades, deployments} = require("hardhat");
const hre = require("hardhat");
const sampleModule = require('@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl');
const {getContract, transferETH, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

//    await transferETH(10, await getWalletAddress());

    const {save} = deployments;

    let name = 'BscPayoutListener';
    const contractFactory = await ethers.getContractFactory(name, {});
    let proxyAddress = '0xa772b0BA6042b9416a619f6638dcfEaC4a8B31fF';

    // Deploy new implementation
    let implAddress = await upgrades.deployImplementation(contractFactory, {
        kind: 'uups',
    });
    console.log('Deploy impl done -> impl [' + implAddress + "]");

    // Save new implementation
    const artifact = await deployments.getExtendedArtifact(name);
    artifact.implementation = implAddress;
    let proxyDeployments = {
        address: proxyAddress,
        ...artifact
    }
    await save(name, proxyDeployments);
    console.log('save done')

    // Upgrade proxy
    let contract = await getContract(name);
    await contract.upgradeTo(implAddress);
    console.log('upgradeTo done')

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


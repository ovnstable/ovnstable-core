const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();


    let token = await ethers.getContract('SalesToken');


    let params = {
        vestingBegin: '1692961500',
        vestingDuration: '5259486',
        vestingProportion: '300000000000000000',
    }
    let overflowICO = await deploy("OverflowICO", {
        from: deployer,
        args: [
            token.address, // salesToken
            '500000000000000000000000', // tokensToSale
            '450000000000000000000', // ethersToRaise
            '150000000000000000000', // refundThreshold
            '1692788400', // startTime
            '1692961200', // endTime
            '1692961500', // receiveTime
            params,
            '1000000000000000', // minCommit
            '115792089237316195423570985008687907853269984665640564039457584007913129639935', // maxCommit
            token.address, // emission token
            '500000000000000000000000', // totalEmission
            '0x000000000000000000000000000000000000dead' // burnAddress
        ],
        log: true,
        skipIfAlreadyDeployed: false
    });

    console.log("OverflowICO created at " + overflowICO.address);
};

module.exports.tags = ['OverflowICO'];

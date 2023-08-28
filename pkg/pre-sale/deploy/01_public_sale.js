const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();


    let token = await ethers.getContract('SalesToken');


    let params = {
        salesToken: token.address,
        tokensToSell: '500000000000000000000000',
        ethersToRaise: '450000000000000000000',
        refundThreshold: '150000000000000000000',
        startTime: '1692788400',
        endTime: '1692961200',
        receiveTime: '1692961500',
        vestingBegin: '1692961500',
        vestingDuration: '5259486',
        vestingProportion: '300000000000000000',
        minCommit: '1000000000000000',
        maxCommit: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        emissionToken: token.address,
        totalEmission: '500000000000000000000000',
        burnAddress: '0x000000000000000000000000000000000000dead'
    }
    let overflowICO = await deploy("OverflowICO", {
        from: deployer,
        args: [
            params
        ],
        log: true,
        skipIfAlreadyDeployed: false
    });

    console.log("OverflowICO created at " + overflowICO.address);
};

module.exports.tags = ['OverflowICO'];

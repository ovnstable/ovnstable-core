const {BASE} = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");
const {toE18, fromE18, toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    let account;
    let commitToken;
    let salesToken;
    let firstAccount;
    let secondAccount;

    let startDate;
    let endDate;
    let claimBonusTime;
    let claimSalesFirstPartTime;

    let vestingBeginTime;
    let vestingDuration;
    let vestingProportion;
    let totalSales;

    let hardCap;
    let softCap;
    let minCommit;
    let maxCommit;
    // let salesToken = await ethers.getContract('SalesToken');
    // let emissionToken = await ethers.getContract('EmissionToken');
    startDate = Math.floor((new Date().getTime()) / 1000);
    console.log('startDate: ' + startDate);
    endDate = startDate + addDays(5);
    console.log('endDate: ' + endDate);
    claimBonusTime = endDate + addDays(2);
    claimSalesFirstPartTime = endDate + addDays(4);
    vestingBeginTime = endDate + addDays(6);
    vestingDuration = addDays(30);
    vestingProportion = toE18(0.75);
    totalSales = toE18(10000);
    hardCap = toE6(300000);
    softCap = toE6(225000);
    minCommit = toE6(1);
    maxCommit = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

    let params = {
        commitToken: "0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376",
        salesToken: "0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376",
        hardCap: hardCap,
        softCap: softCap,
        startTime: startDate,
        endTime: endDate,
        claimBonusTime: claimBonusTime,
        claimSalesFirstPartTime: claimSalesFirstPartTime,
        vestingBeginTime: vestingBeginTime,
        vestingDuration: vestingDuration,
        vestingProportion: vestingProportion,
        minCommit: minCommit,
        maxCommit: maxCommit,
        totalSales: totalSales,
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

function addDays(days) {
    return (days * 24 * 60 * 60 * 1000);
}

module.exports.tags = ['OverflowICO'];

const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {ethers, deployments} = require("hardhat");
const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {toE18, toE6} = require("@overnight-contracts/common/utils/decimals");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const {save} = deployments;

    let startDate = Math.floor((new Date().getTime()) / 1000);
    let endDate = startDate + addHours(2);

    console.log('startDate: ' + startDate);
    console.log('endDate: ' + endDate);

    let claimBonusTime = endDate + addHours(1);
    let claimSalesFirstPartTime = endDate + addHours(1.1);
    let vestingBeginTime = endDate + addHours(1.2);
    let vestingDuration = addHours(1.3);

    let vestingProportion = toE18(0.75);
    let totalSales = toE18(10000);
    let hardCap = toE6(10);
    let softCap = toE6(5);
    let minCommit = toE6(1);
    let maxCommit = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

    let usdPlus = await getContract('UsdPlusToken', 'base');
    let whitelist = await ethers.getContract('Whitelist', 'base');
    let saleToken = "";


    let items = [
        {
            name: 'startDate',
            value: startDate.toString()
        },
        {
            name: 'endDate',
            value: endDate.toString()
        },
        {
            name: 'claimBonusTime',
            value: claimBonusTime.toString()
        },
        {
            name: 'claimSalesFirstPartTime',
            value: claimSalesFirstPartTime.toString()
        },
        {
            name: 'vestingBeginTime',
            value: vestingBeginTime.toString()
        },
        {
            name: 'vestingDuration',
            value: vestingDuration.toString()
        },
        {
            name: 'vestingProportion',
            value: vestingProportion.toString()
        },
        {
            name: 'totalSales',
            value: totalSales.toString()
        },
        {
            name: 'hardCap',
            value: hardCap.toString()
        },
        {
            name: 'softCap',
            value: softCap.toString()
        },

        {
            name: 'minCommit',
            value: minCommit.toString()
        },

        {
            name: 'maxCommit',
            value: maxCommit.toString()
        },
    ]

    console.table(items);

    let params = {
        commitToken: usdPlus.address,
        salesToken: salesToken.address,
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
        whitelist: whitelist.address,
    }

    let overflowICO = await deployments.deploy("OverflowICO", {
        from: deployer.address,
        args: [
            params
        ],
        log: true,
        skipIfAlreadyDeployed: false
    });

    console.log("OverflowICO created at " + overflowICO.address);

};


function addHours(hours) {
    return hours * 60 * 60 * 1000;
}


module.exports.tags = ['TestSale'];

const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {ethers, deployments} = require("hardhat");
const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {toE18, toE6, fromE18, fromE6} = require("@overnight-contracts/common/utils/decimals");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const moment = require("moment");
const BigNumber = require("bignumber.js");
const hre = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const {save} = deployments;

    let startDate = moment(1695038400 * 1000); // 2023/09/18 12:00 UTC
    let endDate = moment(1695639600 * 1000);   // 2023/09/25 11:00 UTC

    let claimBonusTime = moment(endDate).add(10, 'seconds');
    let claimSalesFirstPartTime = moment(endDate).add(20, 'seconds');
    let vestingBeginTime = moment(endDate).add(7, 'days');
    let vestingDuration = 604800 * 4; // 1 week in seconds * 4 = 4 weeks

    let vestingProportion = toE18(0.75);
    let totalSales = toE18(25_000);
    let hardCap = toE6(500_000);
    let softCap = toE6(350_000);
    let minCommit = toE6(1);
    let maxCommit = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

    let usdPlus = await getContract('UsdPlusToken', 'base');
    let whitelist = await ethers.getContract('Whitelist');
    let saleToken = {
        address: "0xA3d1a8DEB97B111454B294E2324EfAD13a9d8396"
    }


    let items = [
        {
            name: 'USD+',
            value: usdPlus.address
        },
        {
            name: 'OVN',
            value: saleToken.address
        },
        {
            name: 'Whitelist',
            value: whitelist.address
        },
        {
            name: 'startDate',
            value: startDate.toISOString(),
            comment: startDate.unix()
        },
        {
            name: 'endDate',
            value: endDate.toISOString(),
            comment: endDate.unix()
        },
        {
            name: 'claimBonusTime',
            value: claimBonusTime.toISOString(),
            comment: claimBonusTime.unix()
        },
        {
            name: 'claimSalesFirstPartTime',
            value: claimSalesFirstPartTime.toISOString(),
            comment: claimSalesFirstPartTime.unix()
        },
        {
            name: 'vestingBeginTime',
            value: vestingBeginTime.toISOString(),
            comment: vestingBeginTime.unix()
        },
        {
            name: 'vestingDuration',
            value: vestingDuration,
            comment: vestingDuration
        },
        {
            name: 'vestingProportion',
            value: fromE18(vestingProportion)
        },
        {
            name: 'totalSales',
            value: fromE18(totalSales.toString())
        },
        {
            name: 'hardCap',
            value: fromE6(hardCap.toString())
        },
        {
            name: 'softCap',
            value: fromE6(softCap.toString())
        },

        {
            name: 'minCommit',
            value: fromE6(minCommit.toString())
        },

        {
            name: 'maxCommit',
            value: maxCommit.toString()
        },
    ]

    console.table(items);

    let params = {
        commitToken: usdPlus.address,
        salesToken: saleToken.address,
        hardCap: hardCap,
        softCap: softCap,
        startTime: startDate.unix(),
        endTime: endDate.unix(),
        claimBonusTime: claimBonusTime.unix(),
        claimSalesFirstPartTime: claimSalesFirstPartTime.unix(),
        vestingBeginTime: vestingBeginTime.unix(),
        vestingDuration: vestingDuration,
        vestingProportion: vestingProportion,
        minCommit: minCommit,
        maxCommit: maxCommit,
        totalSales: totalSales,
        whitelist: whitelist.address,
    }

    // let overflowICO = await deployments.deploy("OverflowICO", {
    //     from: deployer,
    //     args: [
    //         params
    //     ],
    //     log: true,
    //     skipIfAlreadyDeployed: false
    // });
    // console.log("OverflowICO created at " + overflowICO.address);
    //
    // await hre.run("verify:verify", {
    //     address: overflowICO.address,
    //     constructorArguments: [params],
    // });
};


module.exports.tags = ['PreSale'];

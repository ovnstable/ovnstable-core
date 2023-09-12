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

    let startDate = moment().add(30, 'minutes');
    let endDate = moment(startDate).add(2, 'hours');

    let claimBonusTime = moment(endDate).add(10, 'minutes');
    let claimSalesFirstPartTime = moment(endDate).add(1, 'hours');
    let vestingBeginTime = moment(endDate).add(1, 'hours').add(10, 'minutes');
    let vestingDuration = moment(endDate).add(2, 'hours');

    let vestingProportion = toE18(0.75);
    let totalSales = toE18(10000);
    let hardCap = toE6(10);
    let softCap = toE6(5);
    let minCommit = toE6(1);
    let maxCommit = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

    let usdPlus = await getContract('UsdPlusToken', 'base');
    let whitelist = await ethers.getContract('Whitelist');
    let saleToken = {
        address: "0x2a40Eab5dC171924937F242c5D73E1cd5A19e160"
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
            value: vestingDuration.toISOString(),
            comment: vestingDuration.unix()
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
        vestingDuration: vestingDuration.unix(),
        vestingProportion: vestingProportion,
        minCommit: minCommit,
        maxCommit: maxCommit,
        totalSales: totalSales,
        whitelist: whitelist.address,
    }

    let overflowICO = await deployments.deploy("OverflowICO", {
        from: deployer,
        args: [
            params
        ],
        log: true,
        skipIfAlreadyDeployed: false
    });
    console.log("OverflowICO created at " + overflowICO.address);

    await hre.run("verify:verify", {
        address: overflowICO.address,
        constructorArguments: [params],
    });
};


module.exports.tags = ['TestSale'];

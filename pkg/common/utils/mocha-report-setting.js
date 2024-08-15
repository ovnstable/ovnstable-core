let mochaSetting = {
    timeout: 36200000,
}

if (process.env.TEST_REPORT) {
    console.log('Mocha setting report init')
    mochaSetting.reporter = "@overnight-contracts/common/utils/reporter-mocha.js";
    mochaSetting["reporter-option"] = [
        "output=report.json"
    ];
}


module.exports = mochaSetting;

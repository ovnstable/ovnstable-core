const dotenv = require('dotenv');
dotenv.config({path:__dirname+ '/../../../.env'});

const fs = require("fs-extra")

/**
 * Add to .env file prop LOG_GAS with one of LogType options.
 * Usage:
 * ```
 * const {logGas} = require("../../utils/gas");
 * ~~~
 * await logGas(usdPlus.mint(account, 1), "UsdPlusToken", "mint");
 * ```
 */

const gasUsagePath = 'gasUsage.json';

const LogType = {
    NO_LOG: 'NO_LOG',
    TO_CONSOLE: 'TO_CONSOLE',
    TO_FILE: 'TO_FILE'
};

function logGasType() {
    let logType = LogType.NO_LOG;
    if (LogType.hasOwnProperty(process.env.LOG_GAS)) {
        logType = process.env.LOG_GAS
    }
    return logType;
}

function skipGasLog() {
    return logGasType() === LogType.NO_LOG;
}


async function logGas(funcToLog, contract, method) {

    let logType = logGasType();

    if (logType === LogType.NO_LOG) {
        await funcToLog;
        return;
    }

    let receipt = await (await funcToLog).wait();

    if (logType === LogType.TO_CONSOLE) {
        console.log(`Gas usage for ${contract}.${method}=${receipt.gasUsed}`);
        return;
    }

    if (logType === LogType.TO_FILE) {
        let gasUsage;
        if (fs.existsSync(gasUsagePath)) {
            gasUsage = JSON.parse(fs.readFileSync(gasUsagePath));
        } else {
            gasUsage = {};
        }
        if (!gasUsage[contract]) {
            gasUsage[contract] = {};
        }
        gasUsage[contract][method] = receipt.gasUsed.toString();
        fs.writeFileSync(gasUsagePath, JSON.stringify(gasUsage, null, 2));
        return;
    }

}


function printGasFile() {
    let gasUsage;
    if (fs.existsSync(gasUsagePath)) {
        gasUsage = JSON.parse(fs.readFileSync(gasUsagePath));
    } else {
        gasUsage = {};
    }
    for (const [contract, methods] of Object.entries(gasUsage)) {
        console.log(`${contract}:`);
        for (const [method, gasUsageValue] of Object.entries(methods)) {
            console.log(`- ${method}: ${gasUsageValue}`);
        }
    }
}

module.exports = {
    logGas: logGas,
    skipGasLog: skipGasLog,
    printGasFile: printGasFile
}

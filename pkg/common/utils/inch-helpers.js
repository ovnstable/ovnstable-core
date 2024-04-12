const { default: axios } = require("axios");
const { ethers } = require("hardhat");
const {execTimelock} = require("./script-utils");
const {Roles} = require("./roles");
const { getContract, getWalletAddress, getChainId, sleep } = require("./script-utils");
const INCH_ROUTER_V5 = require("@overnight-contracts/core/test/abi/InchRouterV5.json");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");

async function inchSwapperUpdatePath(token0, token1, amountToken0, stand = process.env.STAND) {

    let inchSwapper = await getContract('InchSwapper', stand);
    let roleManager = await getContract('RoleManager', stand);

    let inchDataForSwapResponse0 = await getDataForSwap(
        await getChainId(),
        await getWalletAddress(),
        token0,
        token1,
        amountToken0,
        "",
        ""
    );

    await execTimelock(async (timelock)=>{
        await (await roleManager.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address)).wait();
        await (await roleManager.connect(timelock).grantRole(Roles.UNIT_ROLE, timelock.address)).wait();
        await (await inchSwapper.connect(timelock).updatePath(
            {
                tokenIn: token0,
                tokenOut: token1,
                amount: amountToken0,
                flags: inchDataForSwapResponse0.flags,
                pools: inchDataForSwapResponse0.pools,
                srcReceiver: inchDataForSwapResponse0.srcReceiver,
                isUniV3: inchDataForSwapResponse0.isUniV3
            },
            inchDataForSwapResponse0.data
        )).wait();
        console.log('updatePath')
    });

    

    console.log(`Update path from ${token0} to ${token1} with ${amountToken0}`)
}

async function getDataForSwap(
    chainId,
    strategyAddress,
    tokenIn,
    tokenOut,
    amountIn,
    protocols = "",
    connectors = ""
) {

    const swapParams = {
        fromTokenAddress: tokenIn,
        toTokenAddress: tokenOut,
        amount: amountIn,
        fromAddress: strategyAddress,
        destReceiver: strategyAddress,
        slippage: "15",
        disableEstimate: "true",
        allowPartialFill: "false",
        protocols: protocols,
        connectorTokens: connectors,
        usePatching: "true",
        includeProtocols: "true"
    };

    if (swapParams.connectorTokens === "") {
        delete swapParams["connectorTokens"];
    }

    if (swapParams.parts === "") {
        delete swapParams["parts"];
    }

    if (swapParams.protocols === "") {
        delete swapParams["protocols"];
    }

    let baseUrl = "https://api.1inch.dev/swap/v5.2";
    let API_KEY = process.env.INCH_API_KEY;
    let headers = {
        "Accept-Encoding": "br",
        "accept": "application/json",
        "Authorization": "Bearer " + API_KEY
    };

    const url = `${baseUrl}/${chainId}/swap?` + (new URLSearchParams(swapParams)).toString();

    // console.log('[InchService] Request url: ' + url);

    let attempts = 0;
    let response;
    while (attempts < 10) {

        try {
            response = await axios.get(url, { headers: headers });
            break;
        } catch (e) {
            if (e.response && e.response.status === 429 && 5 >= attempts) {
                attempts = attempts++;
            } else {
                throw new Error(e);
            }
        }

        await sleep(2000);
    }




    return getArgs(response);
}

function getArgs(transaction) {

    let decodedData;
    try {

        let iface = new ethers.utils.Interface(INCH_ROUTER_V5);

        decodedData = iface.parseTransaction({ data: transaction.data.tx.data, value: transaction.data.tx.value });
    } catch (e) {
        console.error("[InchService] decodedData error: " + e);
        return 0;
    }

    let args;
    if (decodedData.name !== "uniswapV3Swap") {
        args = {
            flags: decodedData.args.desc.flags,
            data: decodedData.args.data,
            srcReceiver: decodedData.args.desc.srcReceiver,
            pools: [0],
            isUniV3: false
        }
    } else {
        args = {
            flags: 0,
            data: "0x",
            srcReceiver: ZERO_ADDRESS,
            pools: decodedData.args.pools,
            isUniV3: true
        }
    }

    return args;
}

module.exports = {
    inchSwapperUpdatePath: inchSwapperUpdatePath,
    getDataForSwap: getDataForSwap,
    getArgs: getArgs
}

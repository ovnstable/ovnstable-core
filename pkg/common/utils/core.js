let core;


function avalanche(){
    return {
        pm: "0x11732E21D9DaB3B6fF6e7DD9EdcB24770260c7B4"
    }
}

function bsc(){
    return {
        pm: "0x11732E21D9DaB3B6fF6e7DD9EdcB24770260c7B4"
    }
}

function bsc_usdc(){
    return {
        pm: "0x9E55aA8c57f51655d634C7182a5a44b61Db0eD94"
    }
}

function bsc_usdt(){
    return {
        pm: "0x11732E21D9DaB3B6fF6e7DD9EdcB24770260c7B4"
    }
}

function fantomDev(){
    return {
        pm: "0xb9D731080b9e862C3a6B7eaF0E5a086614d0a2d9"
    }
}

function fantom(){
    return {
        pm: "0x11732E21D9DaB3B6fF6e7DD9EdcB24770260c7B4"
    }
}

function polygonDev(){
    return {
        pm: "0x7f1bD57edA6995d3a4136C07f85bf7013C5f8243"
    }
}

function polygon(){
    return {
        pm: "0x44FdF9E0C9E52123aB484C9235694cC166CE5718"
    }
}

function polygon_platform(){
    return {
        pm: "0xe7aAA880bbB7F22489f6279Ab28CEfB76912dA81"
    }
}

function getCoreAddresses(){

    let stand = process.env.STAND;
    console.log('[Node] STAND: ' + stand);
    switch (stand){
        case "avalanche":
            return avalanche();
        case "bsc":
            return bsc();
        case "bsc_usdc":
            return bsc_usdc();
        case "bsc_usdt":
            return bsc_usdt();
        case "fantom_dev":
            return fantomDev();
        case "fantom":
            return fantom();
        case "polygon_dev":
            return polygonDev();
        case "polygon":
            return polygon();
        case "polygon_platform":
            return polygon_platform();
    }
}


module.exports = {
    core : getCoreAddresses(),
    setCore: (value) => core = value,
}

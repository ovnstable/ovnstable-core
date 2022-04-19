

let core;


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

function getCoreAddresses(){

    let stand = "fantom";
    switch (stand){
        case "fantom_dev":
            return fantomDev();
        case "fantom":
            return fantom();
        case "polygon_dev":
            return polygonDev();
        case "polygon":

    }
}


module.exports = {
    core : getCoreAddresses(),
    setCore: (value) => core = value,
}

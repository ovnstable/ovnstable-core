

let core;


function fantomDev(){
    return {
        pm: "0xb9D731080b9e862C3a6B7eaF0E5a086614d0a2d9"
    }
}

function getCoreAddresses(){

    let stand = "fantom_dev";
    switch (stand){
        case "fantom_dev":
            return fantomDev();
        case "fantom":

        case "polygon_dev":
        case "polygon":

    }
}


module.exports = {
    core : getCoreAddresses(),
    setCore: (value) => core = value,
}

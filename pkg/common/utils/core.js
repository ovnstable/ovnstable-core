

let core;

function getCoreAddresses(network){

    return {
        pm: '0x5CB01385d3097b6a189d1ac8BA3364D900666445' // dev address
    }
}


module.exports = {
    core : getCoreAddresses(),
    setCore: (value) => core = value,
}

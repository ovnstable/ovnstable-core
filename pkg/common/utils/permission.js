async function checkPermission(contract, callback){

    let DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

    if (await contract.hasRole(DEFAULT_ADMIN_ROLE, contract.signer.address)){

        await callback();
        console.log('Setting done');
    }else {
        console.log(`Signer ${contract.signer.address} not has role: DEFAULT_ADMIN_ROLE`);

    }
}

module.exports = {
    checkPermission: checkPermission
};

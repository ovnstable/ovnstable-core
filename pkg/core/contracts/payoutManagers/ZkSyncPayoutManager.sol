import "../PayoutManager.sol";


contract ZkSyncPayoutManager is PayoutManager {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutManager_init();
    }


    function zkSync() external {

    }
}

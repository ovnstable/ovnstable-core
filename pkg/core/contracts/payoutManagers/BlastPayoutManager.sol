import "../PayoutManager.sol";


contract BlastPayoutManager is PayoutManager {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutManager_init();
    }


    function blast() external {

    }
}

import "../PayoutManager.sol";

contract ArbitrumPayoutManager is PayoutManager {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutManager_init();
    }


   function arbitrum() external {

   }
}
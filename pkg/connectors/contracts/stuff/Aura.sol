pragma solidity >=0.8.0 <0.9.0;


interface AuraBoosterLite {

    /**
 * @notice Basically a hugely pivotal function.
     *         Responsible for collecting the crv from gauge, and then redistributing to the correct place.
     *         Pays the caller a fee to process this.
     */
    function earmarkRewards(uint256 _pid, address _zroPaymentAddress) external returns (bool);

    function deposit(uint256 _pid, uint256 _amount, bool _stake) external;

    function withdraw(uint256 _pid, uint256 _amount) external returns (bool);
}


interface AuraBaseRewardPool {

    function getReward() external;
}

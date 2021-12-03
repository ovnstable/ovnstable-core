pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IConnector.sol";

import "../OwnableExt.sol";
import "./idle/interfaces/IIdleToken.sol";
import "hardhat/console.sol";

contract ConnectorIDLE is IConnector, OwnableExt {
    IIdleToken public idleToken;

    function setIdleToken(address _idleToken) public onlyOwner {
        require(_idleToken != address(0), "Zero address not allowed");
        idleToken = IIdleToken(_idleToken);
    }

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) public override {
        console.log("Trying to stake %s tokens from %s to %s", _amount, _asset, _beneficiar);
        IERC20(_asset).approve(address(idleToken), _amount);
        uint256 mintedTokens = idleToken.mintIdleToken(_amount, true, _beneficiar);
        address(this).transfer(_beneficiar, mintedTokens);
        console.log("mintedTokens %s", mintedTokens);
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) public override returns (uint256) {
        console.log("Trying to unstake %s tokens from %s to %s", _amount, _asset, _beneficiar);
        IERC20(_asset).approve(address(idleToken), _amount);
        uint256 redeemedTokens = idleToken.redeemIdleToken(_amount);
        address(this).transfer(_beneficiar, redeemedTokens);
        console.log("redeemedTokens %s", redeemedTokens);
        return redeemedTokens;
    }

}

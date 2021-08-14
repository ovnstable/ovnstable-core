pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IConnector.sol";

import "./curve/interfaces/iCurvePool.sol";
import "./curve/interfaces/iCurveToken.sol";

contract ConnectorCurve is IConnector {

    iCurvePool pool;
    address owner;


    modifier onlyOwner () {
        require(msg.sender == owner, "only owner can");
        _;
    }

    function setOwner (address _addrOwner) public onlyOwner {
        owner = _addrOwner;
    
    }
    function setPool (address _poolAddr) public onlyOwner {
        pool = iCurvePool(_poolAddr);
    }

    function stake (address _asset, uint256 _amount, address _beneficiar )  public override {

        for (uint i=0; i<3; i++ ) {
            
            if (pool.underlying_coins(i) == _asset) {
                uint256 [3] memory amounts;
                iCurveToken(_asset).approve(address(pool), _amount);
                amounts[uint(i)] = _amount;
                uint LPTok = pool.calc_token_amount (amounts, true );
                uint retAmount = pool.add_liquidity(amounts, 
                                                    LPTok, 
                                                    true);
                iCurveToken(pool.lp_token()).transfer(_beneficiar, retAmount);
            }
        }
    }

    function unstake  (address _asset, uint256 _amount, address _beneficiar )  public override returns (uint256) {
        for (uint i=0; i<3; i++ ) {    
            if (pool.underlying_coins(i) == _asset) {
                uint256 [3] memory amounts;
                iCurveToken(pool.lp_token()).approve(address(pool), _amount);
                amounts[uint(i)] = _amount;
                uint LPTok = pool.calc_token_amount (amounts, false );

                uint [3] memory retAmount = pool.remove_liquidity(LPTok ,
                                                                amounts, 
                                                                true);
                return retAmount[i];
            }
        }
    }


}
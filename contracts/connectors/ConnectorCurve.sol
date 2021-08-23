pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IConnector.sol";

import "./curve/interfaces/iCurvePool.sol";
import "./curve/interfaces/iCurveToken.sol";
import "../OwnableExt.sol";

contract ConnectorCurve is IConnector , OwnableExt{

    address USDC;

    function setUSDC (address _usdc) public onlyOwner {
        USDC = _usdc;
    }
    function stake (address _asset, address _pool,uint256 _amount, address _beneficiar )  public override {
      iCurvePool  pool = iCurvePool(_pool);

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

    function unstake (address _asset, address _pool, uint256 _amount, address _beneficiar )  public override returns (uint256) {
     iCurvePool   pool = iCurvePool(_pool);
        for (uint256 i=0; i<3; i++ ) {    
            if (pool.underlying_coins(i) == _asset) {
                uint256 [3] memory amounts;
                iCurveToken(pool.lp_token()).approve(address(pool), _amount);
                amounts[uint(i)] = _amount;
                uint LPTok = pool.calc_token_amount (amounts, false );

                uint [3] memory retAmount = pool.remove_liquidity(LPTok ,
                                                                amounts, 
                                                                true);
                IERC20(pool.coins(i)).transfer(_beneficiar, retAmount[i]);
                return retAmount[i];
            }
        }
    }

    function getPriceOffer (address _asset,  address _pool) public override view returns (uint256) {
        iCurvePool  pool = iCurvePool(_pool);
        return pool.get_virtual_price();

    }

    function getBookValue (address _asset, address _addrWault,  address _pool) external view override returns (uint256) { 
        uint256 balance = IERC20(_asset).balanceOf(_addrWault);        
        iCurvePool  pool = iCurvePool(_pool);
        uint256 N_COINS = 3;
        for (uint256 i=0; i<N_COINS; i++) {
            address ai = pool.underlying_coins(i);
            if (ai == USDC) {
                uint256 price = getPriceOffer(_asset, _pool) ;
                return price * balance; 
            }
        }
        revert ("can't find addresses of coins");
    }

    function getLiqValue (address _asset, address _addrWault,  address _pool) external view override returns (uint256) {
        
        uint256 balance = IERC20(_asset).balanceOf(_addrWault);        
        iCurvePool  pool = iCurvePool(_pool);
        uint256 N_COINS = 3;
        for (uint256 i=0; i<N_COINS; i++) {
            address ai = pool.underlying_coins(i);
            if (ai == USDC && balance > 0) {
                uint256 USDCsliq = pool.calc_withdraw_one_coin(balance, int128(uint128(i))); 
                uint256 price = getPriceOffer(_asset, _pool) ;
               
                return price * USDCsliq; 
            } else  {
                return 0;
            }

        }
        revert ("can't find addresses of coins");

    }

}
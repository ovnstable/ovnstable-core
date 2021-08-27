pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IConnector.sol";
import "../interfaces/IActivesList.sol";

import "./curve/interfaces/iCurvePool.sol";
import "./curve/interfaces/iCurveToken.sol";
import "../OwnableExt.sol";

contract ConnectorCurve is IConnector , OwnableExt{

    address USDC;
    IActivesList actList;


    function setUSDC (address _usdc) public onlyOwner {
        USDC = _usdc;
    }
    function setAddr (address _addrAL) external onlyOwner {
        actList = IActivesList(_addrAL);
    }

    function stake (address _asset, address _pool,uint256 _amount, address _beneficiar )  public override {
      iCurvePool  pool = iCurvePool(_pool);
        uint256 [3] memory amounts;
        for (uint i=0; i<3; i++ ) {
            address coin = pool.coins(i);
            if (coin == _asset) {
                
                iCurveToken(_asset).approve(address(pool), _amount);
                amounts[uint(i)] = _amount;
                uint lpTok = pool.calc_token_amount (amounts, true );
                uint retAmount = pool.add_liquidity(amounts, 
                                                    lpTok * 99/100, 
                                                    false);
                iCurveToken(pool.lp_token()).transfer(_beneficiar, retAmount);
                // actList.changeBal(_asset, -int128(uint128(_amount)));

                // actList.changeBal(pool.lp_token(), int128(uint128(retAmount)));

                return; 
            } else {
                amounts[i] = 0;
            }
        }
        revert ("can't find active for staking in pool");
    }

    function unstake (address _asset, address _pool, uint256 _amount, address _beneficiar )  public override returns (uint256) {
     uint256 [3] memory amounts;
     iCurvePool   pool = iCurvePool(_pool);
        for (uint256 i=0; i<3; i++ ) {    
            address coin = pool.coins(i);

            if (coin == _asset) {
                
                 amounts[i] = _amount ;
                uint lpTok = pool.calc_token_amount (amounts, false );
                uint withdrAmount = pool.calc_withdraw_one_coin (lpTok, int128(uint128(i)) );
              //  lpTok = lpTok *_amount /withdrAmount;
               // uint balCT = iCurveToken(pool.lp_token()).balanceOf(address(this));

                iCurveToken(pool.lp_token()).approve(address(pool), lpTok);

                uint  retAmount = pool.remove_liquidity_one_coin(lpTok , int128(uint128(i)), withdrAmount);
                                                                //_amount *9/10); 

              //  amounts = pool.remove_liquidity(lpTok, amounts, false );
             //   amounts[i] = _amount /2 ;
          //      uint  retAmount = pool.remove_liquidity_imbalance( amounts, lpTok ); 


                IERC20(pool.coins(i)).transfer(_beneficiar, retAmount);
                iCurveToken(pool.lp_token()).transfer(_beneficiar, 
                                iCurveToken(pool.lp_token()).balanceOf(address(this)));
                // actList.changeBal(_asset, int128(uint128(retAmount)));

                // actList.changeBal(pool.lp_token(), -int128(uint128(_amount)));

                return retAmount; // amounts[i];
            } else {
                amounts[i] = 0;
            }
        }
        revert ("can't find active for withdraw from pool");
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
                return price * balance /10**18; 
            }
        }
        revert ("can't find addresses of coins 1");
    }

    function getLiqValue (address _asset, address _addrWault,  address _pool) external view override returns (uint256) {
        iCurvePool  pool = iCurvePool(_pool);

        uint256 balance = IERC20(pool.lp_token()).balanceOf(_addrWault);  
        if (balance == 0) {return 0 ;}
        
        uint256 N_COINS = 3;
        uint256 [3] memory amounts;
        for (uint256 i=0; i<N_COINS; i++) {
            address ai = pool.underlying_coins(i);
            if (ai == USDC  ) {
                  amounts[i] = balance ;
                  //todo - research work of CurvePool when big liquidity removes
                try  pool.calc_token_amount (amounts, false ) returns (uint lpTok)
                {
                    try  pool.calc_withdraw_one_coin (lpTok, int128(uint128(i)) ) returns (uint USDCsliq)
                    {
                        uint256 price = getPriceOffer(_asset, _pool) ;
                        return price * USDCsliq /10**18; 
                    }
                    catch {
                        return 0;
                    }
                }
                catch {
                    return 0;
                }
              
            } else  {
                amounts[i] = 0;
            }

        }
        revert ("can't find addresses of coins 2");

    }

}
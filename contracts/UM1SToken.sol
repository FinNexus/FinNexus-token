pragma solidity ^0.4.24;


/*

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

  Thanks to Noah for coming up with the FinNexus name! You can find him at https://github.com/noahniuwa

*/

import "./StandardToken.sol";
import "./SafeMath.sol";


/// @title FinNexus Token Contract
/// For more information about this token sale, please visit https://FinNexus.org
/// @author Cathy - <cathy@FinNexus.org>

contract UM1SToken is StandardToken {
    
    using SafeMath for uint;

    /// Constant token specific fields
    string public constant name = "UM1SCoin";
    string public constant symbol = "UM1S";

    uint public constant decimals = 18;
    address public minter; 

    //5000000000 * 0.8
    uint public constant MAX_TOTAL_TOKEN_AMOUNT = 400000000 ether;

    uint public constant DIVISOR = 1000;
    uint public constant RATE_CFNC_BT = 100;//10:1


    /*
     * MODIFIERS
     */
    modifier onlyMinter {
    	assert(msg.sender == minter);
    	_;
    }

    /**
     * CONSTRUCTOR 
     * 
     * @dev Initialize the  BtToken
     */
    function UM1SToken(address _minter){
    	  minter = _minter;
    }

    /**
     * EXTERNAL FUNCTION 
     * 
     * @dev mint token for common investor
     * @param _receipent The destination account owned mint tokens    
     * @param _amount The amount of mint token be sent to this address.
     * 
     */
    function mintToken(address _receipent, uint _amount)
        external
        onlyMinter
    {
       //time check will do in minter cfnc token
        require(_receipent != 0x0);
        require(_amount > 0);

        uint conAmount = _amount.mul(RATE_CFNC_BT).div(DIVISOR);
        totalSupply = totalSupply.add(conAmount);

        assert(totalSupply <= MAX_TOTAL_TOKEN_AMOUNT);

        balances[_receipent] = balances[_receipent].add(conAmount);       
    }

}


pragma solidity ^0.4.24;

/*

  Copyright 2019 FinNexus Foundation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

import "./StandardToken.sol";
import "./SafeMath.sol";
import "./AbtToken.sol";

/// @title FinNexus CFUNC Token Contract
/// For more information about this token sale, please visit https://FinNexus.org

contract CFuncToken is StandardToken {

    using SafeMath for uint;

    /// Constant token specific fields
    string public  name = "CFuncCoin";
    string public  symbol = "CFUNC";

    uint   public constant decimals = 18;

    /// FinNexus total tokens supply
    uint public MAX_TOTAL_TOKEN_AMOUNT = 500000000 ether;

    uint public constant DIVISOR = 1000;

    /// ERC20 compilant FinNexus ABT token contact instance
    AbtToken public abtToken;

    /// FinNexus contribution contract
    address public minter; 

    /// 1st phase convert start time,it is for save
    uint public firstPhaseConStartTime;
    /// 1st phase convert end time,it is for save
    uint public firstPhaseConEndTime;

    /// current phase convert start time
    uint public conStartTime;
    /// current phase convert end time
    uint public conEndTime;

    //the ratio for cfunc which can be changed to abt
    uint public conRatio;
    uint public firstPhaseConRatio;

    uint public totalSupply;
    uint public totalCfunc2Abt;

    /// the firs data for save
    uint public firstPhaseCfunc2Abt;
    uint public firstPhaseTotalSupply;

    mapping (address => uint) public exchangeBalances;
    mapping (uint => address) public exchangeAddress;
    
    uint public exchangeCount;
    
    /*
     * EVENTS
     */
    event ExchangeSale(address indexed to, uint indexed value);
    
    event ConvertCfunc2Abt(address indexed initiator,uint indexed value);

    /*
     * MODIFIERS
     */
    modifier onlyMinter {
    	  assert(msg.sender == minter);
    	  _;
    }


    modifier maxWanTokenAmountNotReached (uint amount){
    	  assert(totalSupply.add(amount) <= MAX_TOTAL_TOKEN_AMOUNT);
    	  _;
    }

    /**
     * CONSTRUCTOR 
     * 
     * @dev Initialize the FinNexus Token
     * @param _minter The FinNexus Contribution Contract     
     */
    function CFuncToken(address _minter){
    	minter = _minter;
        abtToken = new AbtToken(this);
    }

    /**
     * func 
     * 
     * @dev init token contract
     * @param   _phase the phase for mint token
     * @param   _conStartTime the start time for converting cfunc to abt
     * @param   _conEndTime the end time for converting cfunc to abt
     * @param   _conRatio the conRatio for converting cfunc to abt
     */
    function init(uint _phase,uint _conStartTime,uint _conEndTime,uint _conRatio)
        external
        onlyMinter
    {   
       if (_phase == 2) { 
          //convert start time for phase 2 must be later than the convert end time for phase 1 
          require(_conStartTime > conEndTime);
          //record the data for 1st stage           
          firstPhaseCfunc2Abt = totalCfunc2Abt;
          totalCfunc2Abt = 0;

          firstPhaseConRatio = conRatio;
          firstPhaseTotalSupply = totalSupply;
          
          firstPhaseConStartTime = conStartTime;
          firstPhaseConEndTime = conEndTime;
       }   

       conStartTime = _conStartTime;
       conEndTime = _conEndTime;
       conRatio = _conRatio;
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
        maxWanTokenAmountNotReached(_amount)
    {
        //check parameter in ico minter contract
      	balances[_receipent] = balances[_receipent].add(_amount);
      	totalSupply = totalSupply.add(_amount);
    }  


    /**
     * public FUNCTION 
     * 
     * @dev convert cfunc to abt
     * @param _value The amount converting from cfunc to abt
     * 
     */ 
    function convert2Abt(uint _value) 
      onlyPayloadSize(2 * 32)
      public 
    {
        require(now >= conStartTime && now <= conEndTime);
        require(_value > 0);
        require(balances[msg.sender] >= _value);  

        //cal quota for convert in current phase,cal it here because we do not know totalSupply until now possible,80% is allowed to convert
        uint convertQuota  = totalSupply.sub(firstPhaseTotalSupply).mul(conRatio).div(DIVISOR);
        
        //totalCfunc2Abt is accumulator for current phase
        uint availble = convertQuota.sub(_value).sub(totalCfunc2Abt);
        
        //available token must be over the value converted to abt
        assert(availble >= _value);
        
      	balances[msg.sender] = balances[msg.sender].sub(_value);
        totalCfunc2Abt = totalCfunc2Abt.add(_value);
        abtToken.mintToken(msg.sender, _value); 
            
        emit ConvertCfunc2Abt(msg.sender,_value);
  
    }

    /**
     * public FUNCTION 
     * @dev mint cfunc quato for exchange
     * @param _receipent The destination account for exchange   
     * @param _amount The amount of token quato be sent to this address.
     * 
     */ 
    function mintExchangeQuota(address _receipent, uint _amount)
        external
        onlyMinter
    {
        if (exchangeBalances[_receipent] == 0) {
          exchangeAddress[exchangeCount] = _receipent; 
          exchangeCount = exchangeCount.add(1);
        }

      	exchangeBalances[_receipent] = exchangeBalances[_receipent].add(_amount);
    }
 
    /**
     * public FUNCTION 
     * @dev burn unused cfunc quato for exchange
     * 
     */ 
    function burnExchangeQuota()
        external
        onlyMinter
    {
        //after converting from cufnc to abt, burn quato is allowed
      	require(now > conEndTime);
      	
      	for (uint i = 0; i <= exchangeCount; i++) {
            address receipent = exchangeAddress[i]; 
            exchangeBalances[receipent] = 0;
            exchangeAddress[i] = 0x0;
        }
        
        exchangeCount = 0;
        
        totalSupply = totalSupply.sub(totalCfunc2Abt);
    }    

    /**
     * public FUNCTION 
     * 
     * @dev exchange mint token for common investor
     * @param _to The destination account owned mint tokens    
     * @param _value The amount of mint token be sent to this address.
     * 
     */  
    function exchangeMintToken(address _to, uint _value) 
        public     
        onlyPayloadSize(2 * 32) 
        maxWanTokenAmountNotReached(_value)
    {
       
        require(_value > 0);
        require(_to != 0x0);
        require(exchangeBalances[msg.sender] >= _value);

        exchangeBalances[msg.sender] = exchangeBalances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        totalSupply = totalSupply.add(_value);
        
        emit ExchangeSale(_to,_value);
    }

    /**
     * EXTERNAL FUNCTION 
     * 
     * @dev change token name
     * @param _name token name    
     * @param _symbol token symbol
     * 
     */  
    function changeTokenName(string _name, string _symbol)
        external
        onlyMinter
    {
        //check parameter in ico minter contract
        name = _name;
        symbol = _symbol;
    }


}


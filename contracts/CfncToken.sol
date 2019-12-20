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
import "./UM1SToken.sol";

/// @title FinNexus CFNC Token Contract
/// For more information about this token sale, please visit https://FinNexus.org

contract CfncToken is StandardToken {

    using SafeMath for uint;

    /// Constant token specific fields
    string public  name = "CfncCoin";
    string public  symbol = "CFNC";

    uint   public constant decimals = 18;

    /// FinNexus total tokens supply
    uint public MAX_TOTAL_TOKEN_AMOUNT = 500000000 ether;

    uint public constant DIVISOR = 1000;

    /// ERC20 compilant FinNexus UM1S token contact instance
    UM1SToken public um1sToken;

    /// FinNexus contribution contract
    address public minter;
    address public initiator;

    /// current phase convert start time
    uint public conStartTime;
    /// current phase convert end time
    uint public conEndTime;

    //the ratio for cfnc which can be changed to UM1S
    uint public conRatio;

    uint public totalSupply;
    uint public totalCfnc2UM1S;
    uint public totalMinted;

    /// the firs data for save
    uint public firstPhaseCfnc2UM1S;
    uint public firstPhaseTotalSupply;

    mapping (address => uint) public exchangeBalances;
    mapping (uint => address) public exchangeAddress;
    mapping (address => uint) public phase2Buyer;

    uint public exchangeCount;

    /*
     * EVENTS
     */
    event ConvertCfnc2UM1S(address indexed initiator,uint indexed value);

    event FirstPhaseParameters(uint indexed startTime,uint indexed endTime,uint indexed conRatio);
    event SecondPhaseParameters(uint  indexed startTime,uint  indexed endTime,uint indexed conRatio);

    /*
     * MODIFIERS
     */
    modifier onlyMinter {
    	  assert(msg.sender == minter);
    	  _;
    }

    modifier onlyInitiator {
    	  assert(msg.sender == initiator);
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
    function CfncToken(address _minter,address _initiator){
    	minter = _minter;
    	initiator = _initiator;

        um1sToken = new UM1SToken(this);
    }

    /**
     * func
     *
     * @dev init token contract
     * @param   _phase the phase for mint token
     * @param   _conStartTime the start time for converting cfnc to UM1S
     * @param   _conEndTime the end time for converting cfnc to UM1S
     * @param   _conRatio the conRatio for converting cfnc to UM1S
     */
    function init(uint _phase,uint _conStartTime,uint _conEndTime,uint _conRatio)
        public
        onlyInitiator
    {
       require(_phase == 1 || _phase == 2);
       require(_conStartTime > 0);
       require(_conEndTime > _conStartTime);
       require(_conRatio > 0);

       conStartTime = _conStartTime;
       conRatio = _conRatio;

       if (_phase == 1) {
           conEndTime = _conEndTime;
           emit FirstPhaseParameters(_conStartTime,_conEndTime,_conRatio);
       } else {
          //convert start time for phase 2 must be later than the convert end time for phase 1

          require(_conStartTime > conEndTime);

          conEndTime = _conEndTime;

          //record the data for 1st stage
          firstPhaseCfnc2UM1S = totalCfnc2UM1S;
          totalCfnc2UM1S = 0;

          firstPhaseTotalSupply = totalMinted;

          emit SecondPhaseParameters(_conStartTime,_conEndTime,_conRatio);

       }


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
      	totalMinted = totalMinted.add(_amount);

      	//phase2 record
      	if (firstPhaseTotalSupply > 0) {
      	    phase2Buyer[_receipent] = phase2Buyer[_receipent].add(_amount);
      	}
    }


    /**
     * public FUNCTION
     *
     * @dev convert cfnc to UM1S
     * @param _value The amount converting from cfnc to UM1S
     *
     */
    function convert2UM1S(uint _value)
      public
    {
        require(now >= conStartTime && now <= conEndTime);

        require(_value > 0.1 ether);
        require(balances[msg.sender] >= _value);

        if (firstPhaseTotalSupply > 0) {
       	    require(phase2Buyer[_receipent] >= value);
       	    phase2Buyer[_receipent] = phase2Buyer[_receipent].sub(_amount);
       	}

        //cal quota for convert in current phase,cal it here because we do not know totalSupply until now possible,80% is allowed to convert
        uint convertQuota  = totalMinted.sub(firstPhaseTotalSupply).mul(conRatio).div(DIVISOR);

        //totalCfnc2UM1S is accumulator for current phase
        uint availble = convertQuota.sub(_value).sub(totalCfnc2UM1S);

        //available token must be over the value converted to UM1S
        assert(availble >= _value);


      	balances[msg.sender] = balances[msg.sender].sub(_value);
        totalCfnc2UM1S = totalCfnc2UM1S.add(_value);

        um1sToken.mintToken(msg.sender, _value);
        totalSupply = totalSupply.sub(_value);

        emit ConvertCfnc2UM1S(msg.sender,_value);

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


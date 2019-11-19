pragma solidity ^0.4.24;

/*

  Copyright 2017 FinNexus Foundation.

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


import "./SafeMath.sol";
import "./Owned.sol";

/// @title FinNexus Contribution Contract
/// ICO Rules according: https://www.FinNexus.org/crowdsale
/// For more information about this token sale, please visit https://FinNexus.org

contract CFuncTokenInterface {
    function mintToken(address _receipent, uint _amount) external;
    function conEndTime()  public view returns(uint);
}

contract FinNexusContribution is Owned {

    using SafeMath for uint;

    /// Constant fields

    /// FinNexus total tokens supply
    uint public constant CFUNC_TOTAL_SUPPLY = 500000000 ether;

    /// ----------------------------------------------------------------------------------------------------
    /// |                                                  |                    |                 |          |
    /// |        PUBLIC SALE (PRESALE + OPEN SALE)         |      DEV TEAM      |    FOUNDATION   |  DYNAMIC |
    /// |                       30%                        |         25%        |       30%       |   15%    |
    /// ----------------------------------------------------------------------------------------------------
    uint public constant OPEN_SALE_STAKE = 300;

    uint public constant FIRST_OPEN_SALE_AMOUNT = 80000000 ether;
    uint public constant SECOND_OPEN_SALE_AMOUNT = 70000000 ether;

    // Reserved stakes
    uint public constant DEV_TEAM_STAKE = 250;   // 25%
    uint public constant FOUNDATION_STAKE = 300; // 30%
    uint public constant DYNAMIC_STAKE = 150;    // 15%

    uint public constant DIVISOR = 1000;

    /// Exchange rates for WAN
    uint public WAN_CFUNC_RATE ;

    /// Addresses of Patrons
    address public constant DEV_TEAM_HOLDER = 0xf851b2edae9d24876ed7645062331622e4f18a05;
    address public constant FOUNDATION_HOLDER = 0x8ce3708fdbe05a75135e5923e8acc36d22d18033;
    address public constant DYNAMIC_HOLDER = 0x414810cd259e89a63c6fb10326cfa00952fb4785;

        ///All deposited wan will be instantly forwarded to this address.
    address public walletAddress;

	///the pahse for Contribution is divied into 2 phase
    uint public CURRENT_PHASE = 1;

    ///max quota for open sale
    uint public MAX_OPEN_SOLD;

    ///max quota for exhange
    uint public MAX_EXCHANGE_MINT;

    ///contribution start time
    uint public startTime;
    ///contribution end time
    uint public endTime;

    ///accumulator for open sold tokens in current phase
    uint public openSoldTokens;
    ///accumulator for sold tokens in exchange in current phase
    uint public mintExchangeTokens;

    /// Due to an emergency, set this to true to halt the contribution
    bool public halted;

    /// ERC20 compilant FinNexus token contact instance
    address public cfuncTokenAddress;

    ///the indicator for initialized status
    bool public isInitialized = false;

    /*
     * EVENTS
     */

    event FirstPhaseTime(uint indexed startTime,uint indexed endTime);
    event SecondPhaseTime(uint indexed startTime,uint indexed endTime);
    event NewSale(address indexed destAddress, uint indexed wanCost, uint indexed gotTokens);
    event MintExchangeSale(address indexed exchangeAddr, uint indexed amount);

    event contribution(address indexed destAddress, uint indexed wanCost);
    /*
     * MODIFIERS
     */
    modifier onlyWallet {
        require(msg.sender == walletAddress);
        _;
    }

    modifier notHalted() {
        require(!halted);
        _;
    }

    modifier initialized() {
        require(isInitialized);
        _;
    }

    modifier notEarlierThan(uint x) {
        require(now >= x);
        _;
    }

    modifier earlierThan(uint x) {
        require(now < x);
        _;
    }

    modifier ceilingNotReached() {
        require(openSoldTokens < MAX_OPEN_SOLD);
        _;
    }

    modifier isSaleEnded() {
        require(now > endTime || openSoldTokens >= MAX_OPEN_SOLD);
        _;
    }


    /**
     * CONSTRUCTOR
     *
     * @dev Initialize the FinNexus contribution contract
     */
    function FinNexusContribution(){

    }

    /**
     * public function
     *
     * @dev change wallet address for recieving wan
     * @param _walletAddress the address for recieving cfunc tokens
     * @param _cfuncTokenAddress the address for cfunc token
     *
     */
    function initAddress(address _walletAddress,address _cfuncTokenAddress)
        public
        onlyOwner
    {
        require(_walletAddress != 0x0);
        require(_cfuncTokenAddress != 0x0);

        walletAddress = _walletAddress;
        cfuncTokenAddress = _cfuncTokenAddress;
    }


    /**
     * public function
     *
     * @dev Initialize the FinNexus contribution contract
     * @param _phase    init the different phase
     * @param _wanRatioOfSold   the ratio for open sale in different phase
     * @param _startTime    start time for open sale
     * @param _endTime  end time for open sale
     * @param _Wan2CfuncRate the change rate from wan to cfunc
     *
     */
    function init(  uint _phase,
                    uint _wanRatioOfSold,
                    uint _startTime,
                    uint _endTime,
                    uint _Wan2CfuncRate
                    )
        public
        onlyOwner
    {
        require(cfuncTokenAddress != 0x0 );
        require(_startTime > 0);
        require(_endTime > _startTime);
        require(_Wan2CfuncRate > 0);

        startTime = _startTime;
        endTime = _endTime;
        WAN_CFUNC_RATE =  _Wan2CfuncRate;

        if (_phase == 1) {
            /// Reserve tokens according FinNexus ICO rules
        	uint stakeMultiplier = CFUNC_TOTAL_SUPPLY.div(DIVISOR);
    		/// mint tokens for dirrent holder
            CFuncTokenInterface(cfuncTokenAddress).mintToken(DEV_TEAM_HOLDER, DEV_TEAM_STAKE.mul(stakeMultiplier));
            CFuncTokenInterface(cfuncTokenAddress).mintToken(FOUNDATION_HOLDER, FOUNDATION_STAKE.mul(stakeMultiplier));
            CFuncTokenInterface(cfuncTokenAddress).mintToken(DYNAMIC_HOLDER, DYNAMIC_STAKE.mul(stakeMultiplier));

            MAX_OPEN_SOLD = FIRST_OPEN_SALE_AMOUNT.mul(_wanRatioOfSold).div(DIVISOR);
            MAX_EXCHANGE_MINT = FIRST_OPEN_SALE_AMOUNT.sub(MAX_OPEN_SOLD);

            emit FirstPhaseTime(_startTime,_endTime);

        } else {

            require(_phase == 2);
            require(_startTime > CFuncTokenInterface(cfuncTokenAddress).conEndTime());

            MAX_OPEN_SOLD = SECOND_OPEN_SALE_AMOUNT.mul(_wanRatioOfSold).div(DIVISOR);
            MAX_EXCHANGE_MINT = SECOND_OPEN_SALE_AMOUNT.sub(MAX_OPEN_SOLD);

            //initialize variable in the first phase
            mintExchangeTokens = 0;
            openSoldTokens = 0;

            CURRENT_PHASE = 2;

            emit SecondPhaseTime(_startTime,_endTime);
        }

        isInitialized = true;
    }

    /**
     * public function
     *
     * @dev minting cfunc tokens for exchange
     * @param _exchangeAddr the exchange address for recieving tokens
     * @param _amount the token amount for exchange
     *
     */
    function mintExchangeToken(address _exchangeAddr, uint _amount)
        public
        notHalted
        initialized
        onlyWallet
    {
        uint availToken = MAX_EXCHANGE_MINT.sub(mintExchangeTokens);
        if (availToken >= _amount) {
            mintExchangeTokens = mintExchangeTokens.add(_amount);
            CFuncTokenInterface(cfuncTokenAddress).mintToken(_exchangeAddr, _amount);
            emit MintExchangeSale(_exchangeAddr,_amount);
        } else {
            CFuncTokenInterface(cfuncTokenAddress).mintToken(_exchangeAddr,availToken);
            emit MintExchangeSale(_exchangeAddr,availToken);
        }
    }


    /**
     * Fallback function
     *
     * @dev If anybody sends Wan directly to this  contract, consider he is getting wan token
     */
    function () public payable {
    	buyCFuncCoin(msg.sender);
    }

    /**
     * public function
     *
     * @dev minting cfunc tokens for exchange
     * @param _receipient the address for recieving cfunc tokens
     *
     */
    function buyCFuncCoin(address _receipient)
        public
        payable
        notHalted
        ceilingNotReached
        initialized
        notEarlierThan(startTime)
        earlierThan(endTime)
    {
        require(_receipient != 0x0);
        require(msg.value >= 0.1 ether);

        // Do not allow contracts to game the system
        require(tx.origin == msg.sender);

        buyNormal(_receipient);
    }

    /**
     * public function
     * @dev Emergency situation that requires contribution period to stop,Contributing not possible anymore.
     */

    function halt() public onlyOwner{
        halted = true;
    }

    /**
     * public function
     * @dev Emergency situation resolved, Contributing becomes possible again withing the outlined restrictions.
     */

    function unHalt() public onlyOwner{
        halted = false;
    }

    /**
     * public function
     *
     * @dev set rate from wan to cfunc
     * @param _Wan2CfuncRate the exchange rate
     *
     */
    function setExchangeRate(uint _Wan2CfuncRate) public onlyOwner{
        require(_Wan2CfuncRate != 0);
        WAN_CFUNC_RATE =  _Wan2CfuncRate;
    }

    /**
     * public function
     *
     * @dev changed wallet address for Emergency
     * @param _newAddress new address
     *
     */
    function changeWalletAddress(address _newAddress) onlyWallet {
        walletAddress = _newAddress;
    }

    //////////////// internal function ////////////////////////////

    /// @dev Buy FinNexus token normally
    function buyNormal(address receipient) internal {

        // protect partner quota in stage one
        uint tokenAvailable = MAX_OPEN_SOLD.sub(openSoldTokens);
        require(tokenAvailable > 0);

    	uint toFund;
    	uint toCollect;
    	(toFund, toCollect) = costAndBuyTokens(tokenAvailable);

        buyCommon(receipient, toFund, toCollect);
    }

    /// @dev Utility function for bug FinNexus token
    function buyCommon(address receipient, uint toFund, uint tokenCollect) internal {
        require(msg.value >= toFund); // double check

        if(toFund > 0) {

            CFuncTokenInterface(cfuncTokenAddress).mintToken(receipient, tokenCollect);
            openSoldTokens = openSoldTokens.add(tokenCollect);

            //transfer wan to specified address
            walletAddress.transfer(toFund);

            emit NewSale(receipient, toFund, tokenCollect);
        }

        uint toReturn = msg.value.sub(toFund);
        if(toReturn > 0) {
            msg.sender.transfer(toReturn);
        }
    }

    /// @dev Utility function for calculate available tokens and cost wans
    function costAndBuyTokens(uint availableToken) constant internal returns (uint costValue, uint getTokens){

    	getTokens = WAN_CFUNC_RATE.mul(msg.value).div(DIVISOR);

    	if(availableToken >= getTokens){
    		costValue = msg.value;
    	} else {
    		costValue = availableToken.mul(DIVISOR).div(WAN_CFUNC_RATE);
    		getTokens = availableToken;
    	}
    }

}

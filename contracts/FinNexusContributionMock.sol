pragma solidity ^0.4.24;

import './FinNexusContribution.sol';

contract FinNexusContributionMock is FinNexusContribution{

    function FinNexusContributionMock(){

    }

    function setMockedMaxOpenSoldTokens(uint _maxopenSoldTokens){
        MAX_OPEN_SOLD = _maxopenSoldTokens;
    }

	function setMockedMaxExchangeMint(uint _exchangeMint){
		MAX_EXCHANGE_MINT = _exchangeMint;
	}
}
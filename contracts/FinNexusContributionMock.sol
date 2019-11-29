pragma solidity ^0.4.24;

import './FinNexusContribution.sol';

contract FinNexusContributionMock is FinNexusContribution{

    function FinNexusContributionMock(){

    }


	function setMockedOpenSoldTokensRemain(uint remainToken){
		openSoldTokens = MAX_OPEN_SOLD - remainToken * (10**18);
	}

    function setMockedMaxOpenSoldTokens(uint _maxopenSoldTokens){
        MAX_OPEN_SOLD = _maxopenSoldTokens;
    }
}
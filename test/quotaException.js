require('truffle-test-utils').init()
require('./constant.js')

global.FinNexusSol = artifacts.require('./FinNexusContributionMock.sol')
global.FinNexusABI = artifacts.require('./FinNexusContributionMock.sol').abi
global.FinNexus = web3.eth.contract(FinNexusABI)

////////////////////////////////////////////////////////////////////////////////////

let FinNexusContributionInstance,
    FinNexusContributionInstanceAddress,
    CFuncTokenInstance,
    CFuncTokenInstanceAddress,
    UM1SInstance,
    UM1SInstanceAddress,
    PHASE1_StartTime,
    PHASE1_EndTime,
    PHASE1_ConTokenStartTime,
    PHASE1_ConTokenEndTime,
    PHASE2_StartTime,
    PHASE2_EndTime,
    PHASE2_ConTokenStartTime,
    PHASE2_ConTokenEndTime

////////////////////////////////////////////////////////////////////////////////////////
contract('', async ([owner]) => {


    it('[40000000] Deploy contracts', async () => {

        owner = OWNER_ADDRESS;
        // unlock accounts
        await web3.personal.unlockAccount(owner, 'wl', 99999);
        await web3.personal.unlockAccount(USER1_ADDRESS, 'wl', 99999);
        await web3.personal.unlockAccount(USER2_ADDRESS, 'wl', 99999);

        console.log(colors.green('[INFO] owner: ', owner));

        // deploy token manager
        FinNexusContributionInstance = await FinNexusSol.new({from: owner});

        FinNexusContributionInstanceAddress = FinNexusContributionInstance.address;

        console.log(colors.green('[INFO] FinNexusContributionInstance address:', FinNexusContributionInstanceAddress));


        CFuncTokenInstance = await CFuncTokenSol.new(FinNexusContributionInstanceAddress, owner, {from: owner});
        CFuncTokenInstanceAddress = CFuncTokenInstance.address
        console.log(colors.green('[INFO] CFuncTokenInstance address:', CFuncTokenInstanceAddress));


        UM1SInstanceAddress = await CFuncTokenInstance.um1sToken();
        console.log(colors.green('[INFO] UM1SInstance address:', UM1SInstanceAddress));
        UM1SInstance = UM1SToken.at(UM1SInstanceAddress);

        console.log(colors.green('[INFO] Contracts deployed success!', ''));


    })


    it('[40000010] initialize contract should success', async () => {

        PHASE1_StartTime = Date.now() / 1000 + 60;
        PHASE1_EndTime = PHASE1_StartTime + 20;

        PHASE1_ConTokenStartTime = PHASE1_EndTime + 10;
        PHASE1_ConTokenEndTime = PHASE1_ConTokenStartTime + 20;


        console.log(colors.green('Phase1 start time: ', PHASE1_StartTime));


        let ret = await FinNexusContributionInstance.initAddress(WALLET_ADDRESS, CFuncTokenInstanceAddress, {from: owner});

        let gotWalletAddress = await FinNexusContributionInstance.walletAddress();
        let tokenAddress = await FinNexusContributionInstance.cfuncTokenAddress();

        console.log(colors.green('gotWalletAddress: ', gotWalletAddress));
        console.log(colors.green('tokenAddress: ', tokenAddress));

        assert.equal(gotWalletAddress, WALLET_ADDRESS)
        assert.equal(tokenAddress, CFuncTokenInstanceAddress);

        ret = await FinNexusContributionInstance.init(PHASE1,
            PHASE1_WanRatioOfSold,
            PHASE1_StartTime,
            PHASE1_EndTime,
            PHASE1_Wan2CfuncRate, {from: owner});
        //console.log(ret)

        let gotPhase1 = await FinNexusContributionInstance.CURRENT_PHASE();
        let gotStartTime = await FinNexusContributionInstance.startTime();
        let gotEndTime = await FinNexusContributionInstance.endTime();
        let gotWAN_CFUNC_RATE = await FinNexusContributionInstance.WAN_CFUNC_RATE();
        let initialized = await FinNexusContributionInstance.isInitialized();

        assert.equal(gotPhase1, PHASE1);
        assert.equal(gotStartTime, parseInt(PHASE1_StartTime));
        assert.equal(gotEndTime, parseInt(PHASE1_EndTime));
        assert.equal(gotWAN_CFUNC_RATE, PHASE1_Wan2CfuncRate);
        assert.equal(initialized, true);

        let gotMAX_OPEN_SOLD = await FinNexusContributionInstance.MAX_OPEN_SOLD();
        let gotMAX_EXCHANGE_MINT = await FinNexusContributionInstance.MAX_EXCHANGE_MINT();

        console.log(colors.green('gotMAX_OPEN_SOLD: ', gotMAX_OPEN_SOLD, MAX_OPEN_SOLD));

        console.log(colors.green('gotMAX_EXCHANGE_MINT: ', gotMAX_EXCHANGE_MINT, MAX_EXCHANGE_MINT));

        ret = await CFuncTokenInstance.init(PHASE1, PHASE1_ConTokenStartTime, PHASE1_ConTokenEndTime, PHASE1_CFunc2UM1SRatio);
        //console.log(ret)

        let gotConStartTime = await CFuncTokenInstance.conStartTime();
        let gotConEndTime = await CFuncTokenInstance.conEndTime();
        let gotConRatio = await CFuncTokenInstance.conRatio();

        assert.equal(gotConStartTime, parseInt(PHASE1_ConTokenStartTime));
        assert.equal(gotConEndTime, parseInt(PHASE1_ConTokenEndTime));
        assert.equal(gotConRatio, PHASE1_CFunc2UM1SRatio);

        assert.equal(gotMAX_EXCHANGE_MINT.toNumber(), MAX_EXCHANGE_MINT.toNumber());
        assert.equal(gotMAX_OPEN_SOLD.toNumber(), MAX_OPEN_SOLD.toNumber());


        assert.web3Event(ret, {
            event: 'FirstPhaseParameters',
            args: {
                startTime: parseInt(PHASE1_ConTokenStartTime),
                endTime: parseInt(PHASE1_ConTokenEndTime),
                conRatio: PHASE1_CFunc2UM1SRatio
            }
        });

    })

/*

    it('[20000100] buy token with api function in contract,should fail because not reach start time', async () => {

        let retError;

        try {

            var preTokens = await CFuncTokenInstance.balanceOf(USER1_ADDRESS);

            var preBalance = await web3.eth.getBalance(WALLET_ADDRESS);

            ret = await FinNexusContributionInstance.buyCFuncCoin(USER1_ADDRESS,
                {   from:USER1_ADDRESS,
                    value:web3.toWei(WAN_CONTRIBUTE_AMOUNT),
                    gas: 4700000,
                    gasPrice: "0x"+(GasPrice).toString(16)
                });

            expectTokens = new BigNumber(WAN_CONTRIBUTE_AMOUNT).mul(ether).mul(PHASE1_Wan2CfuncRate).div(DIVIDER);

            gotTokens = await CFuncTokenInstance.balanceOf(USER1_ADDRESS);

            console.log("function got tokens=",gotTokens.toNumber());

            assert.equal(gotTokens.sub(preTokens).toNumber(), expectTokens.toNumber());

            var afterBalance = await web3.eth.getBalance(WALLET_ADDRESS);

            assert.equal(afterBalance - preBalance,web3.toWei(WAN_CONTRIBUTE_AMOUNT));

        } catch (err) {
            retError = err;
        }

        assert.notEqual(retError, undefined, 'buy token fail with api,error must be thrown');
    })


    it('[20000200] user using fallback to buy coin with wan,should fail because not reach start time', async () => {
        let retError;

        try {

            var preTokens = await CFuncTokenInstance.balanceOf(USER1_ADDRESS);

            var preBalance = await web3.eth.getBalance(WALLET_ADDRESS);

            txhash = await web3.eth.sendTransaction({from:USER1_ADDRESS,
                to:FinNexusContributionInstanceAddress,
                value:web3.toWei(WAN_CONTRIBUTE_AMOUNT),
            });

            wait(function(){return web3.eth.getTransaction(txhash).blockNumber != null;});

            expectTokens = new BigNumber(WAN_CONTRIBUTE_AMOUNT).mul(ether).mul(PHASE1_Wan2CfuncRate).div(DIVIDER);

            gotTokens = await CFuncTokenInstance.balanceOf(USER1_ADDRESS);

            console.log("fallback got tokens=",gotTokens.toNumber());

            assert.equal(gotTokens.sub(preTokens).toNumber(), expectTokens.toNumber());

            var afterBalance = await web3.eth.getBalance(WALLET_ADDRESS);
            assert.equal(afterBalance - preBalance,web3.toWei(WAN_CONTRIBUTE_AMOUNT));
        } catch (err) {
            retError = err;
        }

        assert.notEqual(retError, undefined, 'buy token fail with fallback,error must be thrown');
    })




    it('[20000600] user using fallback to buy coin with wan,should fail because passed time', async () => {
        let retError;
        wait(function(){return Date.now() / 1000 > PHASE1_EndTime});

        try {

            var preTokens = await CFuncTokenInstance.balanceOf(USER1_ADDRESS);

            var preBalance = await web3.eth.getBalance(WALLET_ADDRESS);

            txhash = await web3.eth.sendTransaction({from:USER1_ADDRESS,
                to:FinNexusContributionInstanceAddress,
                value:web3.toWei(WAN_CONTRIBUTE_AMOUNT),
            });

            wait(function(){return web3.eth.getTransaction(txhash).blockNumber != null;});

            expectTokens = new BigNumber(WAN_CONTRIBUTE_AMOUNT).mul(ether).mul(PHASE1_Wan2CfuncRate).div(DIVIDER);

            gotTokens = await CFuncTokenInstance.balanceOf(USER1_ADDRESS);

            console.log("fallback got tokens=",gotTokens.toNumber());

            assert.equal(gotTokens.sub(preTokens).toNumber(), expectTokens.toNumber());

            var afterBalance = await web3.eth.getBalance(WALLET_ADDRESS);
            assert.equal(afterBalance - preBalance,web3.toWei(WAN_CONTRIBUTE_AMOUNT));
        } catch (err) {
            retError = err;
        }

        assert.notEqual(retError, undefined, 'buy token fail with fallback,error must be thrown');
    })
*/
})
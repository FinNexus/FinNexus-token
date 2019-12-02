require('truffle-test-utils').init()
require('./constant.js')

FinNexusSolMock = artifacts.require('./FinNexusContributionMock.sol')
FinNexusABIMock = artifacts.require('./FinNexusContributionMock.sol').abi
FinNexusMock = web3.eth.contract(FinNexusABI)

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
        FinNexusContributionInstance = await FinNexusSolMock.new({from: owner});

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

        PHASE1_StartTime = Date.now()/1000;
        PHASE1_EndTime = PHASE1_StartTime + 2*TIME_INTERVAL;

        PHASE1_ConTokenStartTime = PHASE1_StartTime;
        PHASE1_ConTokenEndTime = PHASE1_StartTime + 2*TIME_INTERVAL;

        PHASE1_Wan2CfuncRate = 2000;//one wan will get 2 cfunc
        WAN_CONTRIBUTE_AMOUNT = 10;
        MAX_EXCHANGE_MINT = 10;

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



        ret = await CFuncTokenInstance.init(PHASE1, PHASE1_ConTokenStartTime, PHASE1_ConTokenEndTime, PHASE1_CFunc2UM1SRatio);

        assert.web3Event(ret, {
            event: 'FirstPhaseParameters',
            args: {
                startTime: parseInt(PHASE1_ConTokenStartTime),
                endTime: parseInt(PHASE1_ConTokenEndTime),
                conRatio: PHASE1_CFunc2UM1SRatio
            }
        });

        //changed max open sold
        ret = await  FinNexusContributionInstance.setMockedMaxOpenSoldTokens(web3.toWei(WAN_CONTRIBUTE_AMOUNT),{from:owner});
        //console.log(ret)

        ret = await  FinNexusContributionInstance.setMockedMaxExchangeMint(web3.toWei(MAX_EXCHANGE_MINT),{from:owner});
        //console.log(ret)

        let gotMAX_OPEN_SOLD = await FinNexusContributionInstance.MAX_OPEN_SOLD();
        let gotMAX_EXCHANGE_MINT = await FinNexusContributionInstance.MAX_EXCHANGE_MINT();

        console.log(colors.green('gotMAX_OPEN_SOLD: ', gotMAX_OPEN_SOLD, web3.toWei(WAN_CONTRIBUTE_AMOUNT)));

        console.log(colors.green('gotMAX_EXCHANGE_MINT: ', gotMAX_EXCHANGE_MINT, MAX_EXCHANGE_MINT));


        let gotConStartTime = await CFuncTokenInstance.conStartTime();
        let gotConEndTime = await CFuncTokenInstance.conEndTime();
        let gotConRatio = await CFuncTokenInstance.conRatio();

        assert.equal(gotConStartTime, parseInt(PHASE1_ConTokenStartTime));
        assert.equal(gotConEndTime, parseInt(PHASE1_ConTokenEndTime));
        assert.equal(gotConRatio, PHASE1_CFunc2UM1SRatio);

        assert.equal(gotMAX_EXCHANGE_MINT.toNumber(), web3.toWei(MAX_EXCHANGE_MINT));

        assert.equal(gotMAX_OPEN_SOLD.toNumber(), web3.toWei(WAN_CONTRIBUTE_AMOUNT));


    })



    it('[40000100] buy token with api function in contract,should success,but only get 10 token and send back to rest wan', async () => {


            var preTokens = await CFuncTokenInstance.balanceOf(USER1_ADDRESS);

            var preBalance = await web3.eth.getBalance(WALLET_ADDRESS);

            ret = await FinNexusContributionInstance.buyCFuncCoin(USER1_ADDRESS,
                {   from:USER1_ADDRESS,
                    value:web3.toWei(2*WAN_CONTRIBUTE_AMOUNT),
                    gas: 4700000,
                    gasPrice: "0x"+(GasPrice).toString(16)
                });

            expectTokens = new BigNumber(WAN_CONTRIBUTE_AMOUNT).mul(ether);

            gotTokens = await CFuncTokenInstance.balanceOf(USER1_ADDRESS);

            console.log("function got tokens=",gotTokens.toNumber());

            assert.equal(gotTokens.sub(preTokens).toNumber(), expectTokens.toNumber());

            var afterBalance = await web3.eth.getBalance(WALLET_ADDRESS);

            console.log("changed balance",afterBalance - preBalance)

            assert.equal((afterBalance - preBalance )>web3.toWei(WAN_CONTRIBUTE_AMOUNT/2 - 0.5)&&(afterBalance - preBalance )<=web3.toWei(WAN_CONTRIBUTE_AMOUNT/2),true);

    })

})
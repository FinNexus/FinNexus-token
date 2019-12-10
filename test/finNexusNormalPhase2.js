require('truffle-test-utils').init()
require('./constant.js')

////////////////////////////////////////////////////////////////////////////////////

let FinNexusContributionInstance,
    FinNexusContributionInstanceAddress,
    CfncTokenInstance,
    CfncTokenInstanceAddress,
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


  it('[30000000] Deploy contracts', async () => {

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


    CfncTokenInstance = await CfncTokenSol.new(FinNexusContributionInstanceAddress,owner,{from:owner});
    CfncTokenInstanceAddress = CfncTokenInstance.address
    console.log(colors.green('[INFO] CfncTokenInstance address:', CfncTokenInstanceAddress));


    UM1SInstanceAddress = await CfncTokenInstance.um1sToken();
    console.log(colors.green('[INFO] UM1SInstance address:', UM1SInstanceAddress));
    UM1SInstance = UM1SToken.at(UM1SInstanceAddress);

    console.log(colors.green('[INFO] Contracts deployed success!', ''));


  })


  it('[30000100] initialize contract should success', async () => {

    PHASE1_StartTime = Date.now()/1000;
    PHASE1_EndTime = PHASE1_StartTime + 120;

    PHASE1_ConTokenStartTime = PHASE1_StartTime;
    PHASE1_ConTokenEndTime = PHASE1_StartTime + 120;


    console.log(colors.green('Phase1 start time: ',PHASE1_StartTime));


      let ret = await FinNexusContributionInstance.initAddress(WALLET_ADDRESS,CfncTokenInstanceAddress,{from:owner});

      let gotWalletAddress = await FinNexusContributionInstance.walletAddress();
      let tokenAddress =  await FinNexusContributionInstance.cfncTokenAddress();

      console.log(colors.green('gotWalletAddress: ',gotWalletAddress));
      console.log(colors.green('tokenAddress: ',tokenAddress));

      assert.equal(gotWalletAddress,WALLET_ADDRESS)
      assert.equal(tokenAddress,CfncTokenInstanceAddress);

      ret = await FinNexusContributionInstance.init(PHASE1,
                                              PHASE1_WanRatioOfSold,
                                              PHASE1_StartTime,
                                              PHASE1_EndTime,
                                              PHASE1_Wan2CfncRate,{from:owner});
      //console.log(ret)

      let gotPhase1 =  await FinNexusContributionInstance.CURRENT_PHASE();
      let gotStartTime =  await FinNexusContributionInstance.startTime();
      let gotEndTime =  await FinNexusContributionInstance.endTime();
      let gotWAN_CFNC_RATE =  await FinNexusContributionInstance.WAN_CFNC_RATE();
      let initialized = await FinNexusContributionInstance.isInitialized();

      assert.equal(gotPhase1,PHASE1);
      assert.equal(gotStartTime,parseInt(PHASE1_StartTime));
      assert.equal(gotEndTime,parseInt(PHASE1_EndTime));
      assert.equal(gotWAN_CFNC_RATE,PHASE1_Wan2CfncRate);
      assert.equal(initialized,true);

      let gotMAX_OPEN_SOLD =  await FinNexusContributionInstance.MAX_OPEN_SOLD();
      let gotMAX_EXCHANGE_MINT =  await FinNexusContributionInstance.MAX_EXCHANGE_MINT();

      console.log(colors.green('gotMAX_OPEN_SOLD: ',gotMAX_OPEN_SOLD,MAX_OPEN_SOLD));

      console.log(colors.green('gotMAX_EXCHANGE_MINT: ',gotMAX_EXCHANGE_MINT,MAX_EXCHANGE_MINT));

      ret = await CfncTokenInstance.init(PHASE1,PHASE1_ConTokenStartTime,PHASE1_ConTokenEndTime,PHASE1_Cfnc2UM1SRatio,{from:owner});
      //console.log(ret)

      let gotConStartTime =  await CfncTokenInstance.conStartTime();
      let gotConEndTime =  await CfncTokenInstance.conEndTime();
      let gotConRatio =  await CfncTokenInstance.conRatio();

      assert.equal(gotConStartTime,parseInt(PHASE1_ConTokenStartTime));
      assert.equal(gotConEndTime,parseInt(PHASE1_ConTokenEndTime));
      assert.equal(gotConRatio,PHASE1_Cfnc2UM1SRatio);

      assert.equal(gotMAX_EXCHANGE_MINT.toNumber(),MAX_EXCHANGE_MINT.toNumber());
      assert.equal(gotMAX_OPEN_SOLD.toNumber(),MAX_OPEN_SOLD.toNumber());


      assert.web3Event(ret, {
            event: 'FirstPhaseParameters',
            args: {
                startTime: parseInt(PHASE1_ConTokenStartTime),
                endTime: parseInt(PHASE1_ConTokenEndTime),
                conRatio: PHASE1_Cfnc2UM1SRatio
            }
      })  ;

  })



  it('[30000200] mint Cfnc for exchange,should success ', async () => {

        var preTokens = await CfncTokenInstance.balanceOf(EXCHANGE1_ADDRESS);

        let ret = await FinNexusContributionInstance.mintExchangeToken( EXCHANGE1_ADDRESS,
                                                                    MAX_EXCHANGE_MINT,
                                                                    {from:WALLET_ADDRESS});
       // console.log(ret)

        gotTokens = await CfncTokenInstance.balanceOf(EXCHANGE1_ADDRESS);

        console.log("function got tokens=",gotTokens);

        assert.equal(gotTokens - preTokens,MAX_EXCHANGE_MINT);
   })



  it('[30000300] user using normal func to buy coin with wan ,should success ', async () => {

        var preTokens = await CfncTokenInstance.balanceOf(USER1_ADDRESS);

        var preBalance = await web3.eth.getBalance(WALLET_ADDRESS);

        ret = await FinNexusContributionInstance.buyCfncCoin(USER1_ADDRESS,
            {   from:USER1_ADDRESS,
                value:web3.toWei(WAN_CONTRIBUTE_AMOUNT),
                gas: 4700000,
                gasPrice: "0x"+(GasPrice).toString(16)
            });

        expectTokens = new BigNumber(WAN_CONTRIBUTE_AMOUNT).mul(ether).mul(PHASE1_Wan2CfncRate).div(DIVIDER);

        gotTokens = await CfncTokenInstance.balanceOf(USER1_ADDRESS);

        console.log("function got tokens=",gotTokens.toNumber());

        assert.equal(gotTokens.sub(preTokens).toNumber(), expectTokens.toNumber());

        var afterBalance = await web3.eth.getBalance(WALLET_ADDRESS);

        assert.equal(afterBalance - preBalance,web3.toWei(WAN_CONTRIBUTE_AMOUNT));

   })


    it('[3000400] user convert cfnc to UM1S,should success ', async () => {
        //user1's token from  [90008900]
        var pretUM1SToken =  await UM1SInstance.balanceOf(USER1_ADDRESS)

        var cfncTokens = await CfncTokenInstance.balanceOf(USER1_ADDRESS);
        var cft = new BigNumber(cfncTokens).mul(PHASE1_Cfnc2UM1SRatio).div(DIVIDER);
        console.log('cufnc tokens=',cfncTokens.toNumber(),"covert tokens=",cft.toNumber());

        var ret = await CfncTokenInstance.convert2UM1S(cft.toNumber(),{from:USER1_ADDRESS});

        //console.log(ret);

        var expectUM1S = cft.div(10);

        var gotTokens = await UM1SInstance.balanceOf(USER1_ADDRESS);

        console.log("user1 got UM1S tokens=",gotTokens);

        assert.equal(gotTokens.sub(pretUM1SToken).toNumber(), expectUM1S.toNumber());
    })


    it('[30000500] initialize contract for phase2 should success', async () => {

        wait(function(){return Date.now() / 1000 > PHASE1_ConTokenEndTime});

        PHASE2_StartTime = PHASE1_ConTokenEndTime + 10;
        PHASE2_EndTime = PHASE2_StartTime + 2*TIME_INTERVAL;

        PHASE2_ConTokenStartTime = PHASE2_StartTime;
        PHASE2_ConTokenEndTime = PHASE2_StartTime + 2*TIME_INTERVAL + 10;



        console.log(colors.green('Phase2 start time: ',PHASE2_StartTime));

        ret = await FinNexusContributionInstance.init(PHASE2,
            PHASE2_WanRatioOfSold,
            PHASE2_StartTime,
            PHASE2_EndTime,
            PHASE2_Wan2CfncRate,{from:owner});


        let gotPhase2 =  await FinNexusContributionInstance.CURRENT_PHASE();
        let gotStartTime =  await FinNexusContributionInstance.startTime();
        let gotEndTime =  await FinNexusContributionInstance.endTime();
        let gotWAN_CFNC_RATE =  await FinNexusContributionInstance.WAN_CFNC_RATE();
        let initialized = await FinNexusContributionInstance.isInitialized();

        assert.equal(gotPhase2,PHASE2);
        assert.equal(gotStartTime,parseInt(PHASE2_StartTime));
        assert.equal(gotEndTime,parseInt(PHASE2_EndTime));
        assert.equal(gotWAN_CFNC_RATE,PHASE2_Wan2CfncRate);
        assert.equal(initialized,true);

        let gotMAX_OPEN_SOLD =  await FinNexusContributionInstance.MAX_OPEN_SOLD();
        let gotMAX_EXCHANGE_MINT =  await FinNexusContributionInstance.MAX_EXCHANGE_MINT();

        console.log(colors.green('gotMAX_OPEN_SOLD: ',gotMAX_OPEN_SOLD,MAX_OPEN_SOLD_PHASE2));

        console.log(colors.green('gotMAX_EXCHANGE_MINT: ',gotMAX_EXCHANGE_MINT,MAX_EXCHANGE_MINT_PHASE2));

        let conEndTime =  await CfncTokenInstance.conEndTime();

        console.log(conEndTime.toNumber(),PHASE2_ConTokenStartTime,conEndTime.toNumber() < PHASE2_ConTokenStartTime );

        ret = await CfncTokenInstance.init(PHASE2,PHASE2_ConTokenStartTime,PHASE2_ConTokenEndTime,PHASE2_Cfnc2UM1SRatio,{from:owner});
        //console.log(ret)

        let gotConStartTime =  await CfncTokenInstance.conStartTime();
        let gotConEndTime =  await CfncTokenInstance.conEndTime();
        let gotConRatio =  await CfncTokenInstance.conRatio();

        assert.equal(gotConStartTime,parseInt(PHASE2_ConTokenStartTime));
        assert.equal(gotConEndTime,parseInt(PHASE2_ConTokenEndTime));
        assert.equal(gotConRatio,PHASE2_Cfnc2UM1SRatio);

        assert.equal(gotMAX_EXCHANGE_MINT.toNumber(),MAX_EXCHANGE_MINT_PHASE2.toNumber());
        assert.equal(gotMAX_OPEN_SOLD.toNumber(),MAX_OPEN_SOLD_PHASE2.toNumber());

        assert.web3Event(ret, {
            event: 'SecondPhaseParameters',
            args: {
                startTime: parseInt(PHASE2_ConTokenStartTime),
                endTime: parseInt(PHASE2_ConTokenEndTime),
                conRatio: PHASE2_Cfnc2UM1SRatio
            }
        })  ;

    })


    it('[30000600] user using fallback to buy coin with wan ,should success ', async () => {

        wait(function(){return Date.now() / 1000 > PHASE2_StartTime});

        var preTokens = await CfncTokenInstance.balanceOf(USER1_ADDRESS);

        var preBalance = await web3.eth.getBalance(WALLET_ADDRESS);

        txhash = await web3.eth.sendTransaction({from:USER1_ADDRESS,
            to:FinNexusContributionInstanceAddress,
            value:web3.toWei(WAN_CONTRIBUTE_AMOUNT),
        });

        wait(function(){return web3.eth.getTransaction(txhash).blockNumber != null;});

        expectTokens = new BigNumber(WAN_CONTRIBUTE_AMOUNT).mul(ether).mul(PHASE1_Wan2CfncRate).div(DIVIDER);

        gotTokens = await CfncTokenInstance.balanceOf(USER1_ADDRESS);

        console.log("fallback got tokens=",gotTokens.toNumber());

        assert.equal(gotTokens.sub(preTokens).toNumber(), expectTokens.toNumber());

        var afterBalance = await web3.eth.getBalance(WALLET_ADDRESS);
        assert.equal(afterBalance - preBalance,web3.toWei(WAN_CONTRIBUTE_AMOUNT));

    })


    it('[3000700] user1 transfer cfnc to user2,should success ', async () => {


        var cfncTokens = await CfncTokenInstance.balanceOf(USER1_ADDRESS);

        var ret = await CfncTokenInstance.transfer(USER2_ADDRESS,cfncTokens.toNumber(),{from:USER1_ADDRESS});


        var user1Tokens = await CfncTokenInstance.balanceOf(USER1_ADDRESS);

        console.log("user1 UM1S got tokens=",user1Tokens);
        assert.equal(user1Tokens.toNumber(),0);

        var user2Tokens = await CfncTokenInstance.balanceOf(USER2_ADDRESS);

        console.log("user2 got tokens=",user2Tokens);

        assert.equal(user2Tokens.toNumber(),cfncTokens);

    })


    it('[3000800] user1 transfer UM1S to user2,should success ', async () => {


        var user1UM1STokens = await UM1SInstance.balanceOf(USER1_ADDRESS);
        console.log("user1 UM1S tokens=",user1UM1STokens.toNumber());

        var txhash = await UM1SInstance.transfer(USER2_ADDRESS,user1UM1STokens.toNumber(),{from:USER1_ADDRESS});
        console.log(txhash);

        wait(function(){return web3.eth.getTransaction(txhash).blockNumber != null;});

        var user1Tokens = await UM1SInstance.balanceOf(USER1_ADDRESS);
        assert.equal(user1Tokens.toNumber(),0);

        var user2Tokens = await UM1SInstance.balanceOf(USER2_ADDRESS);
        console.log("user2 UM1S tokens=",user2Tokens);

        assert.equal(user2Tokens.toNumber(),user1UM1STokens);

    })



})




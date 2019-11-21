require('truffle-test-utils').init()
const colors = require('colors/safe')
const web3 = global.web3
//needed to change the ip address:port that will be used
web3.setProvider(new web3.providers.HttpProvider('http://192.168.1.58:18545'));
const BigNumber = require('bignumber.js')

const FinNexusSol = artifacts.require('./FinNexusContribution.sol')
const FinNexusABI = artifacts.require('./FinNexusContribution.sol').abi
const FinNexus = web3.eth.contract(FinNexusABI)

const CFuncTokenSol = artifacts.require('./CFuncToken.sol')
const CFuncTokenABI = artifacts.require('./CFuncToken.sol').abi
const CFuncToken = web3.eth.contract(CFuncTokenABI)

const UM1SABI = artifacts.require('./UM1SToken.sol').abi
const UM1SToken = web3.eth.contract(UM1SABI)


const OWNER_ADDRESS = '0xf7a2681f8cf9661b6877de86034166422cd8c308'
// ERC20 compliant token addresses
const WALLET_ADDRESS = '0xf851b2edae9d24876ed7645062331622e4f18a05'
const DEV_TEAM_HOLDER = '0x8ce3708fdbe05a75135e5923e8acc36d22d18033'
const FOUNDATION_HOLDER = '0x414810cd259e89a63c6fb10326cfa00952fb4785'
const DYNAMIC_HOLDER = '0xb957c97b508a10851724d7b68698f88803338ced'

const USER1_ADDRESS = '0xf48ca621440226f0e98d73f9538404e573930864';
const USER2_ADDRESS = '0xf09ad5c6fe391a420d45397b50fefe5d7fe81ea9';
const EXCHANGE1_ADDRESS = '0x3449fc52745be7235cb89ad23df4c73a811f5811';
const EXCHANGE2_ADDRESS = '0xabbba0a37c3164285c615becf233936c7248440e';

const emptyAddress = '0x0000000000000000000000000000000000000000';

const FIRST_OPEN_SALE_AMOUNT = 80000000 ;
const SECOND_OPEN_SALE_AMOUNT = 70000000 ;



//supposed 1 usdt = 5 wan
//         1 usdt = 10 cfunc
//         1 wan = 2 cfunc

const PHASE1 = 1
const PHASE1_WanRatioOfSold = 100 //10%,  it is mul 1000
const PHASE1_Wan2CfuncRate = 2100 //2.1,  it is mul 1000
const PHASE1_CFunc2UM1SRatio = 800 //80%,  it is mul 1000

const PHASE2 = 2
const PHASE2_WanRatioOfSold = 100 //10%,  it is mul 1000
const PHASE2_Wan2CfuncRate = 2100 //2.1,  it is mul 1000
const PHASE2_CFunc2UM1SRatio = 800 //80%,  it is mul 1000

const DIVIDER = 1000

const TIME_INTERVAL = 300 //300 seconds,5 minutes

const WAN_CONTRIBUTE_AMOUNT = 10.1 //10.1 WAN

const ether = new BigNumber(Math.pow(10, 18));

const GasPrice = 180000000000

let MAX_OPEN_SOLD =  new BigNumber(FIRST_OPEN_SALE_AMOUNT).mul(new BigNumber(PHASE1_WanRatioOfSold));
MAX_OPEN_SOLD = MAX_OPEN_SOLD.mul(ether).div(new BigNumber(DIVIDER));

let MAX_EXCHANGE_MINT =  new BigNumber(FIRST_OPEN_SALE_AMOUNT).mul(ether).sub(new BigNumber(MAX_OPEN_SOLD));

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

////////////////////////////////////////////////////////////////////////////////////
function sleep(numberMillis) {
    var now = new Date();
    var exitTime = now.getTime() + numberMillis;
    while (true) {
        now = new Date();
        if (now.getTime() > exitTime)
            return;
    }
}

var wait = function (conditionFunc) {
    var loopLimit = 100;
    var loopTimes = 0;
    while (!conditionFunc()) {
        sleep(1000);
        loopTimes++;
        if(loopTimes>=loopLimit){
            throw Error("wait timeout! conditionFunc:" + conditionFunc)
        }
    }
}



////////////////////////////////////////////////////////////////////////////////////////
contract('', async ([owner]) => {


  it('[10000000] Deploy contracts', async () => {

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


    CFuncTokenInstance = await CFuncTokenSol.new(FinNexusContributionInstanceAddress,owner,{from:owner});
    CFuncTokenInstanceAddress = CFuncTokenInstance.address
    console.log(colors.green('[INFO] CFuncTokenInstance address:', CFuncTokenInstanceAddress));


    UM1SInstanceAddress = await CFuncTokenInstance.um1sToken();
    console.log(colors.green('[INFO] UM1SInstance address:', UM1SInstanceAddress));
    UM1SInstance = UM1SToken.at(UM1SInstanceAddress);

    console.log(colors.green('[INFO] Contracts deployed success!', ''));


  })


  it('[10000010] initialize contract should success', async () => {

    PHASE1_StartTime = Date.now()/1000;
    PHASE1_EndTime = PHASE1_StartTime + 2*TIME_INTERVAL;

    PHASE1_ConTokenStartTime = PHASE1_StartTime;
    PHASE1_ConTokenEndTime = PHASE1_StartTime + 2*TIME_INTERVAL;


    console.log(colors.green('Phase1 start time: ',PHASE1_StartTime));


      let ret = await FinNexusContributionInstance.initAddress(WALLET_ADDRESS,CFuncTokenInstanceAddress,{from:owner});

      let gotWalletAddress = await FinNexusContributionInstance.walletAddress();
      let tokenAddress =  await FinNexusContributionInstance.cfuncTokenAddress();

      console.log(colors.green('gotWalletAddress: ',gotWalletAddress));
      console.log(colors.green('tokenAddress: ',tokenAddress));

      assert.equal(gotWalletAddress,WALLET_ADDRESS)
      assert.equal(tokenAddress,CFuncTokenInstanceAddress);

      ret = await FinNexusContributionInstance.init(PHASE1,
                                              PHASE1_WanRatioOfSold,
                                              PHASE1_StartTime,
                                              PHASE1_EndTime,
                                              PHASE1_Wan2CfuncRate,{from:owner});
      //console.log(ret)

      let gotPhase1 =  await FinNexusContributionInstance.CURRENT_PHASE();
      let gotStartTime =  await FinNexusContributionInstance.startTime();
      let gotEndTime =  await FinNexusContributionInstance.endTime();
      let gotWAN_CFUNC_RATE =  await FinNexusContributionInstance.WAN_CFUNC_RATE();
      let initialized = await FinNexusContributionInstance.isInitialized();

      assert.equal(gotPhase1,PHASE1);
      assert.equal(gotStartTime,parseInt(PHASE1_StartTime));
      assert.equal(gotEndTime,parseInt(PHASE1_EndTime));
      assert.equal(gotWAN_CFUNC_RATE,PHASE1_Wan2CfuncRate);
      assert.equal(initialized,true);

      let gotMAX_OPEN_SOLD =  await FinNexusContributionInstance.MAX_OPEN_SOLD();
      let gotMAX_EXCHANGE_MINT =  await FinNexusContributionInstance.MAX_EXCHANGE_MINT();

      console.log(colors.green('gotMAX_OPEN_SOLD: ',gotMAX_OPEN_SOLD,MAX_OPEN_SOLD));

      console.log(colors.green('gotMAX_EXCHANGE_MINT: ',gotMAX_EXCHANGE_MINT,MAX_EXCHANGE_MINT));

      ret = await CFuncTokenInstance.init(PHASE1,PHASE1_ConTokenStartTime,PHASE1_ConTokenEndTime,PHASE1_CFunc2UM1SRatio);
      //console.log(ret)

      let gotConStartTime =  await CFuncTokenInstance.conStartTime();
      let gotConEndTime =  await CFuncTokenInstance.conEndTime();
      let gotConRatio =  await CFuncTokenInstance.conRatio();

      assert.equal(gotConStartTime,parseInt(PHASE1_ConTokenStartTime));
      assert.equal(gotConEndTime,parseInt(PHASE1_ConTokenEndTime));
      assert.equal(gotConRatio,PHASE1_CFunc2UM1SRatio);

      assert.equal(gotMAX_EXCHANGE_MINT.toNumber(),MAX_EXCHANGE_MINT.toNumber());
      assert.equal(gotMAX_OPEN_SOLD.toNumber(),MAX_OPEN_SOLD.toNumber());


      assert.web3Event(ret, {
            event: 'FirstPhaseParameters',
            args: {
                startTime: parseInt(PHASE1_ConTokenStartTime),
                endTime: parseInt(PHASE1_ConTokenEndTime),
                conRatio: PHASE1_CFunc2UM1SRatio
            }
      })  ;

  })



  it('[90000880] mint Cfunc for exchange,should success ', async () => {

        var preTokens = await CFuncTokenInstance.balanceOf(EXCHANGE1_ADDRESS);

        let ret = await FinNexusContributionInstance.mintExchangeToken( EXCHANGE1_ADDRESS,
                                                                    MAX_EXCHANGE_MINT,
                                                                    {from:WALLET_ADDRESS});
       // console.log(ret)

        gotTokens = await CFuncTokenInstance.balanceOf(EXCHANGE1_ADDRESS);

        console.log("function got tokens=",gotTokens);

        assert.equal(gotTokens - preTokens,MAX_EXCHANGE_MINT);
   })



  it('[90008900] user using normal func to buy coin with wan ,should success ', async () => {

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

   })


    it('[90008910] user convert cfunc to UM1S,should success ', async () => {
        //user1's token from  [90008900]
        var pretUM1SToken =  await UM1SInstance.balanceOf(USER1_ADDRESS)

        var cfuncTokens = await CFuncTokenInstance.balanceOf(USER1_ADDRESS);
        var cft = new BigNumber(cfuncTokens).mul(PHASE1_CFunc2UM1SRatio).div(DIVIDER);
        console.log('cufnc tokens=',cfuncTokens.toNumber(),"covert tokens=",cft.toNumber());

        var ret = await CFuncTokenInstance.convert2UM1S(cft.toNumber(),{from:USER1_ADDRESS});

        //console.log(ret);

        var expectUM1S = cft.div(10);

        var gotTokens = await UM1SInstance.balanceOf(USER1_ADDRESS);

        console.log("user1 got UM1S tokens=",gotTokens);

        assert.equal(gotTokens.sub(pretUM1SToken).toNumber(), expectUM1S.toNumber());
    })


    it('[90009000] user using fallback to buy coin with wan ,should success ', async () => {

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

     })


    it('[90009010] user1 transfer cfunc to user2,should success ', async () => {


        var cfuncTokens = await CFuncTokenInstance.balanceOf(USER1_ADDRESS);

        var ret = await CFuncTokenInstance.transfer(USER2_ADDRESS,cfuncTokens.toNumber(),{from:USER1_ADDRESS});


        var user1Tokens = await CFuncTokenInstance.balanceOf(USER1_ADDRESS);

        console.log("user1 UM1S got tokens=",user1Tokens);
        assert.equal(user1Tokens.toNumber(),0);

        var user2Tokens = await CFuncTokenInstance.balanceOf(USER2_ADDRESS);

        console.log("user2 got tokens=",user2Tokens);

        assert.equal(user2Tokens.toNumber(),cfuncTokens);

    })


    it('[90009020] user1 transfer UM1S to user2,should success ', async () => {


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




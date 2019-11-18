require('truffle-test-utils').init()
const colors = require('colors/safe')
const web3 = global.web3
const BigNumber = require('bignumber.js')

const FinNexusSol = artifacts.require('./FinNexusContribution.sol')
const FinNexusABI = artifacts.require('./FinNexusContribution.sol').abi
const FinNexus = web3.eth.contract(FinNexusABI)

const CFuncTokenSol = artifacts.require('./CFuncToken.sol')
const CFuncTokenABI = artifacts.require('./CFuncToken.sol').abi
const CFuncToken = web3.eth.contract(CFuncTokenABI)

const AbtTokenABI = artifacts.require('./AbtToken.sol').abi
const AbtToken = web3.eth.contract(AbtTokenABI)


const OWNER_ADDRESS = '0xf7a2681f8cf9661b6877de86034166422cd8c308'
// ERC20 compliant token addresses
const WALLET_ADDRESS = '0xf851b2edae9d24876ed7645062331622e4f18a05'
const DEV_TEAM_HOLDER = '0x8ce3708fdbe05a75135e5923e8acc36d22d18033'
const FOUNDATION_HOLDER = '0x414810cd259e89a63c6fb10326cfa00952fb4785'
const DYNAMIC_HOLDER = '0xb957c97b508a10851724d7b68698f88803338ced'

const USER1_ADDRESS = '0xf48ca621440226f0e98d73f9538404e573930864';
const USER2_ADDRESS = '0xf09ad5c6fe391a420d45397b50fefe5d7fe81ea9';

const emptyAddress = '0x0000000000000000000000000000000000000000';

//supposed 1 usdt = 5 wan
//         1 usdt = 10 cfunc
//         1 wan = 2 cfunc

const PHASE1 = 1
const PHASE1_WanRatioOfSold = 100 //10%,  it is mul 1000
const PHASE1_Wan2CfuncRate = 2100 //2.1,  it is mul 1000
const PHASE1_CFunc2AbtRatio = 800 //80%,  it is mul 1000

const PHASE2 = 2
const PHASE2_WanRatioOfSold = 100 //10%,  it is mul 1000
const PHASE2_Wan2CfuncRate = 2100 //2.1,  it is mul 1000
const PHASE2_CFunc2AbtRatio = 800 //80%,  it is mul 1000

const DIVIDER = 1000

const TIME_INTERVAL = 300 //300 seconds,5 minutes

const WAN_CONTRIBUTE_AMOUNT = 10.1 //10.1 WAN

const ether = new BigNumber(Math.pow(10, 18));

const GasPrice = 180000000000
////////////////////////////////////////////////////////////////////////////////////

let FinNexusContributionInstance,
    FinNexusContributionInstanceAddress,
    CFuncTokenInstance,
    CFuncTokenInstanceAddress,
    AbtTokenInstance,
    AbtTokenInstanceAddress,
    PHASE1_StartTime,
    PHASE1_EndTime,
    PHASE1_ConTokenStartTime,
    PHASE1_ConTokenEndTime,
    PHASE2_StartTime,
    PHASE2_EndTime,
    PHASE2_ConTokenStartTime,
    PHASE2_ConTokenEndTime

////////////////////////////////////////////////////////////////////////////////////
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function setHalt(contract, state, operator) {
    await contract.setHalt(state, {from: operator})
    assert.equal(await contract.halted(), state)
}

function wrappedWeb3SendTransaction(obj, showLog) {
    return new Promise( (resolve, reject) => {
        web3.eth.sendTransaction(obj, function(err, result){
            if(showLog){
                logSeperator();
                console.log('err' + err);
            }
            if(err) {
                return reject(err);
            }
            resolve();
        });
    });
}

async function assertWalletReceivedFund(prevBalance, receivedFundInEther){
    var postWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));
    assert.equal(postWalletBalance.sub(prevBalance),  receivedFundInEther);
}

async function assertWalletReceivedFundNearly(prevBalance, receivedFundInEther){
    var postWalletBalance = await web3.fromWei(web3.eth.getBalance(wanWallet));
    assert.ok(postWalletBalance.sub(prevBalance).sub(receivedFundInEther).abs() < 0.01);
}


async function assertUserReceivedLockedToken(addr, prevBalance, receivedTokenInEther, log){
    var postUserTokens = await web3.fromWei(await wanContract.lockedBalanceOf(addr));
    if(false){
        console.log('pre: ' + prevBalance);
        console.log('post: ' + postUserTokens);
        console.log('postUserTokens.sub(prevBalance): ' + postUserTokens.sub(prevBalance));
        console.log('receivedTokenInEther: ' + receivedTokenInEther);
    }
    assert.equal(postUserTokens.sub(prevBalance),  receivedTokenInEther);
}

////////////////////////////////////////////////////////////////////////////////////////
contract('', async ([owner]) => {

  it('Deploy contracts', async () => {

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


    AbtTokenInstanceAddress = await CFuncTokenInstance.abtToken();
    console.log(colors.green('[INFO] AbtTokenInstance address:', AbtTokenInstanceAddress));
    AbtTokenInstance = AbtToken.at(AbtTokenInstanceAddress);

    console.log(colors.green('[INFO] Contracts deployed success!', ''));


  })


  it('[Contract initialize] initialize contract should success', async () => {

    PHASE1_StartTime = Date.now()/1000;
    PHASE1_EndTime = PHASE1_StartTime + TIME_INTERVAL;
    PHASE1_ConTokenStartTime = PHASE1_StartTime + 2*TIME_INTERVAL;
    PHASE1_ConTokenEndTime = PHASE1_StartTime + 3*TIME_INTERVAL;


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

      console.log(colors.green('gotMAX_OPEN_SOLD: ',gotMAX_OPEN_SOLD));
      console.log(colors.green('gotMAX_EXCHANGE_MINT: ',gotMAX_EXCHANGE_MINT));

      ret = await CFuncTokenInstance.init(PHASE1,PHASE1_ConTokenStartTime,PHASE1_ConTokenEndTime,PHASE1_CFunc2AbtRatio);
      //console.log(ret)

      let gotConStartTime =  await CFuncTokenInstance.conStartTime();
      let gotConEndTime =  await CFuncTokenInstance.conEndTime();
      let gotConRatio =  await CFuncTokenInstance.conRatio();

      assert.equal(gotConStartTime,parseInt(PHASE1_ConTokenStartTime));
      assert.equal(gotConEndTime,parseInt(PHASE1_ConTokenEndTime));
      assert.equal(gotConRatio,PHASE1_CFunc2AbtRatio);

      assert.web3Event(ret, {
            event: 'FirstPhaseParameters',
            args: {
                startTime: parseInt(PHASE1_ConTokenStartTime),
                endTime: parseInt(PHASE1_ConTokenEndTime),
                conRatio: PHASE1_CFunc2AbtRatio
            }
      })  ;


  })

  it('[contribution contract] user using normal func to buy coin with wan ,should success ', async () => {

        var preTokens = await CFuncTokenInstance.balanceOf(USER1_ADDRESS);

        // await wrappedWeb3SendTransaction({
        //     from: USER1_ADDRESS,
        //     to:FinNexusContributionInstanceAddress,
        //     value:  WAN_CONTRIBUTE_AMOUNT * ether,
        //     gas:1000000
        // }).catch(() => {} );

        ret = await FinNexusContributionInstance.buyCFuncCoin(USER1_ADDRESS,
                                                        {   from:USER1_ADDRESS,
                                                            value:web3.toWei(WAN_CONTRIBUTE_AMOUNT),
                                                            gas: 4700000,
                                                            gasPrice: "0x"+(GasPrice).toString(16)
                                                        });
        console.log(ret);

        expectTokens = WAN_CONTRIBUTE_AMOUNT * ether * PHASE1_Wan2CfuncRate / DIVIDER;
        gotTokens = await CFuncTokenInstance.balanceOf(USER1_ADDRESS);

        console.log("got tokens=",gotTokens);

        assert.equal(gotTokens.sub(preTokens).toNumber(), expectTokens);

  })



})




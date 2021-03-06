import './App.css';
import React from "react"
import cube from "./Dice_Images_GIFS/cube.png";
import dice1 from "./Dice_Images_GIFS/dice-six-faces-one.png";
import dice2 from "./Dice_Images_GIFS/dice-six-faces-two.png";
import dice3 from "./Dice_Images_GIFS/dice-six-faces-three.png";
import dice4 from "./Dice_Images_GIFS/dice-six-faces-four.png";
import dice5 from "./Dice_Images_GIFS/dice-six-faces-five.png";
import dice6 from "./Dice_Images_GIFS/dice-six-faces-six.png";
import waiting from "./Dice_Images_GIFS/dice_animation.gif";
import ante from "./Dice_Images_GIFS/Stacking_Chips.gif";
import { Container, Row, Col, DropdownMenu, Dropdown, 
  DropdownToggle, DropdownItem, Button, Form, Label, Input, Table, FormText} from 'reactstrap';
import { GAMBLE_ABI, GAMBLE_ADDRESS } from './config';
import Web3 from 'web3';

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.toggle = this.toggle.bind(this);
    this.toggleSideBets = this.toggleSideBets.bind(this);
    this.state = {
      account: "",
      betType: "Type of Bet",
      betAmount: "0",
      betPlaced: false,
      contractInstance: "",
      diceValue1: cube,
      diceValue2: cube,
      diceList: [dice1, dice2, dice3, dice4, dice5, dice6],
      dropdownOpen: false,
      gameFlow: ["Place bet to start round", "Roll Dice", "Evaluating the Roll", "Please connect your wallet!"],
      point: "None",
      previousDice1: "",
      previousDice2: "",
      rollFinished: true,
      rollEvaluated: true,
      randomRequestCounter: 0,
      pending: false,
      walletConnected: false,
      web3Provider: ""
    };
  }

  componentDidMount() {
    window.addEventListener('load', function() {
      if(!window.ethereum) {
        alert("Please install Metamask to play!");
        return
      }
    })
    this.loadBlockchainData(); 
  }

  //Load instance of contract and subscribe to the events
  async loadBlockchainData() {
    this.setState({
      web3Provider: await new Web3(Web3.givenProvider || "http://localhost:8545")
    }) 
    let networkType = await this.state.web3Provider.eth.net.getNetworkType();
    if(networkType !== 'kovan'){
      alert('Must be on the kovan network! \nPlease switch to the Kovan network and reload the page!')
    } else {
      /* Only uses the first account */
      this.setState({
        contractInstance: new this.state.web3Provider.eth.Contract(GAMBLE_ABI, GAMBLE_ADDRESS)
      });
    }
  }

  toggle() {
    this.setState((prevState) => ({
      dropdownOpen: !prevState.dropdownOpen
    }));
  }

  toggleSideBets() {
    this.setState((prevStateSide) => ({
      dropDownSideBets: !prevStateSide.dropDownSideBets
    }));
  }

  setGame(betType, betValue){
    let bet = (betType === "Pass") ? 0 : 1;
    
    this.state.contractInstance.once('BetPlaced', () => {
      this.setState({
        betPlaced: true,
        pending: false,
        resultTriggered: false
      });
    });
    this.state.contractInstance.methods.createGame(bet).send({
      from: this.state.account, value: betValue
    });
    this.setState({
      pending: true
    })

    // Subscribe to all events from the contract
    // Search from lastest block number
    this.state.contractInstance.once('Winner', () => {
      if (!this.state.resultTriggered){
        alert("Winner! Congratulations! You won " + 2 * this.state.betAmount + " finney!");
        this.setState({resultTriggered : true});
      }
      setTimeout(() => {
        this.setState({
          betType: "Type of Bet",
          betPlaced: false,
          point: "None",
          diceValue1: cube,
          diceValue2: cube,
          previousDice1: this.state.diceValue1,
          previousDice2: this.state.diceValue2
        })
      }, 1000);
    });

    this.state.contractInstance.once('Loser', () => {
      if (!this.state.resultTriggered){
        this.setState({resultTriggered : true});
        alert("Sorry! You lost the bet!")
      }
      setTimeout(() => {
        this.setState({
          betType: "Type of Bet",
          betPlaced: false,
          point: "None",
          diceValue1: cube,
          diceValue2: cube,
          previousDice1: this.state.diceValue1,
          previousDice2: this.state.diceValue2
        })
      }, 1000);
    });

    this.state.contractInstance.once('Point', (error, event) => {
      this.setState({
        point: event.returnValues.point
      });
      alert("Your point is: " + this.state.point);
    });
  }
  
  playGame() {
    let contractInstance = this.state.contractInstance;
    
    this.state.contractInstance.once('RequestedRandomness', () => {
      let counter = this.state.randomRequestCounter;
      this.setState({randomRequestCounter: counter + 1});
    })

    this.state.contractInstance.once('RequestedRandomness', () => {
      let counter = this.state.randomRequestCounter;
      this.setState({randomRequestCounter: counter + 1});
    })

    this.state.contractInstance.once('DiceResults', (error, event)  => {
      let rollOne = this.state.diceList[event.returnValues.roll1 - 1];
      let rollTwo = this.state.diceList[event.returnValues.roll2 - 1];
      this.setState({
        diceValue1: rollOne,
        diceValue2: rollTwo,
        rollFinished: true,
        rollEvaluated: false,
      });
      contractInstance.methods.evaluateRoll().send({from: this.state.account});
    });

    this.state.contractInstance.once('RollEvaluated', (error, event) => {
      this.setState({
        pending: false,
        rollEvaluated: true,
      });
    });

    this.state.contractInstance.methods.getRandomNumber().send({from: this.state.account});
    this.state.contractInstance.methods.getRandomNumber().send({from: this.state.account});
    this.setState({
      pending: true
    })
  }

  async connectWallet() {
    if(this.state.web3Provider){
      let accounts = await window.ethereum.request({method: 'eth_requestAccounts'});
      this.setState({
        account: accounts[0],
        walletConnected: true
      });
    alert("You are connected! Let's play!")
    }
  }
    
  displayProcess() {
    if (!this.state.walletConnected) {
      return this.state.gameFlow[3];
    }
    else if (!this.state.betPlaced && this.state.point === "None" ) {
      return this.state.gameFlow[0];
    }
    else if (this.state.betPlaced && this.state.rollEvaluated){
      return this.state.gameFlow[1];
    }
    else if (this.state.betPlaced && this.state.rollFinished && !this.state.rollEvaluated){
      return this.state.gameFlow[2];
    }
  }

  render() {
   return (
    <div className="App" >
      <Container>
        <h1 className='display-3'>Craps Game</h1>
        <br></br>
        <Row 
          className='dice-header' 
        >
          <Col>
          </Col>
          <Col
          >
            <img src={this.state.diceValue1} className="dice" alt="logo" />
          </Col>
          <Col
          >
            <img src={this.state.diceValue2} className="dice" alt="logo" />
          </Col>
          <Col>
          </Col>
        </Row>
        <br></br>
        <Row
          className='display'
        >
          <Col>
          <Button
            onClick={async () => {
              this.connectWallet();
            }}
            style={{backgroundColor: this.state.walletConnected ? 'grey' : "blue"}}
          >Connect Wallet</Button>
          </Col>
          <Col>
          <Label>
            Main Bets
          </Label>
          <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggle} 
            disabled={this.state.betPlaced || !this.state.walletConnected}>
              <DropdownToggle caret>
                {this.state.betType}
              </DropdownToggle>
              <DropdownMenu>
                <DropdownItem onClick={() => {this.setState({betType: "Pass"})}}>Pass</DropdownItem>
                <DropdownItem onClick={() => {this.setState({betType: "No Pass"})} }>No Pass</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </Col>
          <br></br>
          <Col  xs='auto'>
            <Form >
              <Label>
                Bet Amount in Finney
                </Label>
                <br></br>
                  <FormText>
                    [min bet: 1 Finney (0.001 ETH)]
                  </FormText>
                <Input type="number" min="0" value={this.state.betAmount} 
                  disabled={this.state.betPlaced || !this.state.walletConnected} 
                  onChange={(e) => {
                    if (!this.state.betPlaced) {
                      this.setState({betAmount: e.target.value})
                    }
                  }}></Input>
            </Form>
            <br></br>
          </Col>
          <Col>
            <Button onClick={() => {
              if(Web3.utils.toWei(this.state.betAmount, 'finney') < 1000000000000000 || 
              (this.state.betType !== 'Pass' && this.state.betType !== 'No Pass')) {
                alert("Invalid Bet or Bet amount is too low!")
              }
                else {
                  this.setGame(this.state.betType, Web3.utils.toWei(this.state.betAmount, 'finney'));
                }         
              }
            } disabled={this.state.betPlaced || !this.state.walletConnected}
              style={{
                backgroundColor: this.state.betPlaced || !this.state.walletConnected ? 'grey' : 'blue'
              }}
            >
              Start Round
            </Button>
            <br></br><br></br>
            <Button onClick={() => {
              this.playGame();
              this.setState({
                previousDice1: this.state.diceValue1,
                previousDice2: this.state.diceValue2
              })
              this.setState({
                diceValue1: cube,
                diceValue2: cube 
              })
            }} 
            disabled={!(this.state.betPlaced && this.state.rollFinished) || this.state.pending || !this.state.walletConnected}
            style={{
              backgroundColor: (!(this.state.betPlaced && this.state.rollFinished) ||
               this.state.pending) ? 'grey' : 'blue'
            }}
            >
              Roll!
            </Button>
            <br></br><br></br>
            <Button onClick={() => {
              if (window.confirm("Are you sure you want to cancel this round?\n"
                    +"All pending transactions will not be utilized.")){
                this.state.contractInstance.methods.quitGame().send({from: this.state.account});
                this.setState({
                  betType: "Type of Bet",
                  betAmount: "0",
                  betPlaced: false,
                  diceValue1: cube,
                  diceValue2: cube,
                  point: "None",
                  previousDice1: cube,
                  previousDice2: cube,
                  rollFinished: true,
                  rollEvaluated: true,
                  pending: false
                })
                this.state.contractInstance.methods.withdrawEther(Web3.utils.toWei(
                  this.state.betAmount, 'finney'
                  )).send({from: this.state.account})
              }
            }} disabled={!this.state.walletConnected} >
              Cancel round
            </Button>
          </Col>
          <Col>
            <Button
              onClick={() => {
                if (this.state.randomRequestCounter % 2 === 1) {
                  this.state.contractInstance.methods.getRandomNumber().send({from: this.state.account})
                }
                // In case evaluated roll event does not emit 
                else if (this.state.rollFinished && !this.state.rollEvaluated) {
                  this.state.contractInstance.methods.evaluateRoll().send({from: this.state.account})
                // In case one of the getRandomNumber() fails
                }
                else if (this.state.rollEvaluated){
                  this.setState({
                    pending: false,
                    rollEvaluated: true,
                  });
                }
              }}
              disabled={!this.state.walletConnected}
            >
              Unstuck
            </Button>
          </Col>
        </Row>
        <br></br>
        <Row>
          <Col md='9'>
            <Table bordered className='settings'>
              <thead>
                <tr>
                  <th style={{color: "blue"}}>
                    Bet Type
                  </th>
                  <th>
                    Bet Placed
                  </th>
                  <th>
                    Bet amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>
                    Pass
                  </th>
                  <td>
                    {this.state.betType === "Pass" && this.state.betPlaced ? "Placed" : ""}
                  </td>
                  <td>
                    {this.state.betType === "Pass" ? this.state.betAmount : ""}
                  </td>
                </tr>
                <tr>
                  <th>No Pass</th>
                  <td>
                    {this.state.betType === "No Pass" && this.state.betPlaced ? "Placed" : ""}
                  </td>
                  <td>
                    {this.state.betType === "No Pass" ? this.state.betAmount : ""}
                  </td>
                </tr>
              </tbody>
            </Table>
          </Col>
          <Col md='3'>
            <Table bordered className='settings'>
              <tbody>
                <tr>
                  <th style={{width: '15%'}}>
                    Point
                  </th>
                  <th style={{width: '15%'}}>
                    Previous roll
                  </th> 
                </tr>
                <tr>
                  <td>
                    {this.state.point}
                  </td>
                  <td>
                    <div className='productsContainer'>
                      <img style={{width: '15%'}} alt='' src={this.state.previousDice1}/> 
                      <img style={{width: '15%'}} alt='' src={this.state.previousDice2}/>
                    </div>
                  </td>
                </tr>
              </tbody> 
            </Table>
          </Col>
        </Row>
      </Container>
      <br></br>
      <div>
          <h2>{this.displayProcess()}</h2>
      </div>
      <br></br>
      <div style={{visibility: this.state.pending ? 'visible' : 'hidden'}}>
        <img src={this.state.betPlaced ? waiting : ante} alt='Cannot be found'/>
        <br></br>
        Transaction processing...
      </div>
    </div>   
    ); 
  }
}



import { PolymerElement, html } from './node_modules/@polymer/polymer/polymer-element.js';
import {PlayersOrderBook} from './market-primitives/orderbook.js'

import './examples/elo-state-selection.js'
import './examples/elo-info-table.js'
import './market-primitives/spread-graph.js'
import './market-primitives/profit-graph.js'
import './market-primitives/stepwise-calculator.js'
import './market-primitives/ws.js'

const MIN_BID = 0;
const MAX_ASK = 2147483647;

class MarketSession extends PolymerElement {

    static get template() {
        return html`
        <style>
            :host{
                width:100vw;
                height:100vh;

                /* Custom Color Variables */
                --my-bid-fill:#FAFF7F;
                --my-offer-fill:#41EAD4;
                /* Change in spread graph.js interpolateRGB */
                /* Unable to call var(style) within the d3 function */
                --other-bid-fill:#CC8400;
                --other-offer-fill:#00719E;

                --bid-line-stroke:#FCD997;
                --offer-line-stroke:#99E2FF;
                --background-color-white:#FFFFF0;
                --background-color-blue:#4F759B;
            }

            .middle-section-container{
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
                align-items: center;
                font-weight: bold;
                height: 27vh;
                width: 100vw; 
                background: var(--background-color-blue) ;
                border-top: 3px solid #ED6A5A;
                border-bottom: 3px solid #ED6A5A;
            }

            info-table {
                width: 60%;
                height: 100%;
            }

            profit-graph {
                width: 100%;
                height: 300px;
            }

            state-selection {
                width: 40%;
                height: 100%;
            }

            spread-graph {
                width: 100%;
                height: 200px;
                cursor:pointer;
            }
            .graph-disabled  {
                cursor:not-allowed;
                pointer-events:none;
            }

            // overlay styling and animation
            #overlay{
                width:100%;
                height:100%;
                position:absolute;
                background-color:grey;
                opacity:0.3;
            }
            .session-on{
                animation-name: activate-interface;
                animation-duration: 1s;
                animation-fill-mode: forwards;
            }
            .session-off{
                pointer-events:none;
            }
            @keyframes activate-interface {
                100% {
                    pointer-events:all;
                    background-color:transparent;
                    opacity:1;
                }
            }
        </style>
            <ws-connection id="websocket" url-to-connect={{websocketUrl}}> </ws-connection>
            <stepwise-calculator run-forever={{subscribesSpeed}} value={{speedCost}}
                unit-size={{speedUnitCost}}> </stepwise-calculator>
           
            <div id='overlay' class$='[[_activeSession(isSessionActive)]]'>
                <spread-graph class$='[[_isSpreadGraphDisabled(role)]]' orders={{orderBook}} my-bid={{myBid}} 
                    my-offer={{myOffer}} best-bid={{bestBid}} best-offer={{bestOffer}}> </spread-graph>
                <div class="middle-section-container">       
                    <elo-info-table inventory={{inventory}}
                        cash={{cash}} order-imbalance={{orderImbalance}}
                        endowment={{wealth}} best-bid={{bestBid}}
                        best-offer={{bestOffer}} my-bid={{myBid}} my-offer={{myOffer}}> 
                    </elo-info-table>
                    <elo-state-selection role={{role}} slider-defaults={{sliderDefaults}}
                        speed-on={{subscribesSpeed}}> 
                    </elo-state-selection>
                </div>
                <profit-graph profit={{wealth}} is-running={{isSessionActive}}>
                </profit-graph>
            </div>
    `;
    }
    static get properties() {
      return {
        eventListeners: Object,
        eventHandlers: Object,
        sliderDefaults: Object,
        events: Object,
        playerId: Number,
        role: String,
        startRole: String,
        referencePrice: {type: Number,
            value: 0},
        orderImbalance: {type: Number,
            value: 0},
        orderBook: Object,
        bestBid: Number,
        volumeBestBid: Number,
        bestOffer: Number,
        volumeBestOffer: Number,
        myBid: Number,
        myOffer: Number,
        wealth: {
            type: Number,
            computed: '_calculateWealth(cash, totalCost, referencePrice, inventory)'
        },
        inventory: {type: Number,
            value: 0},
        cash: {
            type: Number,
            computed: '_calculateCash(totalCost)'
        },
        speedUnitCost: Number,
        speedCost: {type: Number, value: 0},
        totalCost: {
            type: Number, 
            value: 0, 
            computed: '_calculateCost(speedCost)'},
        subscribesSpeed: {
            type: Boolean, 
            value: false,
            reflectToAttribute: true
        },
        isSessionActive:{
            type: Boolean,
            value: false,
        },
        websocketUrl: {
            type: Object,
            value: function () {
                let protocol = 'ws://';
                if (window.location.protocol === 'https:') {
                    protocol = 'wss://';
                    }
                const url = (
                    protocol +
                    window.location.host +
                    '/hft/' +
                    OTREE_CONSTANTS.subsessionId + '/' +
                    OTREE_CONSTANTS.marketId + '/' +
                    OTREE_CONSTANTS.playerId + '/'
                )
                return url
            },
        }
      }
    }

    constructor() {
        super();

        this.orderBook = new PlayersOrderBook(this.playerId, this, 'orderBook');
        //Starting Role
        this.role = 'out';
        this.addEventListener('user-input', this.outboundMessage.bind(this))
        this.addEventListener('inbound-ws-message', this.inboundMessage.bind(this))
    }

    ready(){
        super.ready();
        // we need a proper way to scale initial values
        // maybe a constants component
        this.playerId = OTREE_CONSTANTS.playerId
        this.cash = OTREE_CONSTANTS.initialEndowment * 0.0001
        this.speedUnitCost = OTREE_CONSTANTS.speedCost * 0.000001
        this.inventory = 0
        this.orderImbalance = 0
    }

    outboundMessage(event) {
        const messagePayload = event.detail
        let cleanMessage = this._msgSanitize(messagePayload, 'outbound')
        let wsMessage = new CustomEvent('ws-message', {bubbles: true, composed: true, 
            detail: messagePayload })
        this.$.websocket.dispatchEvent(wsMessage)
    }
    
    inboundMessage(event) {
        const messagePayload = event.detail
        let cleanMessage = this._msgSanitize(messagePayload, 'inbound')
        const messageType = cleanMessage.type
        const handlers = this.eventHandlers[messageType]
        for (let i = 0; i < handlers.length; i++) {
            let handlerName = handlers[i]
            this[handlerName](cleanMessage)
        }
    }
    
    _handleExchangeMessage(message) {
        this.orderBook.recv(message)
        if (message.player_id == this.playerId) {
            let mode = message.type == 'executed' || message.type == 'canceled' ?
                'remove' : 'add'
            this._myBidOfferUpdate(message.price, message.buy_sell_indicator, mode=mode)
        }

        // notify a subproperty 
        // so observer on property is called
        this.notifyPath('orderBook._bidPriceSlots')
    }
    
    _handleExecuted(message) {
        if (message.player_id == this.playerId) {
        let cashChange = message.buy_sell_indicator == 'B' ?  - message.execution_price :
            message.execution_price
        this.cash += cashChange
        this.inventory = message.inventory
        }
    }
    
    _handleBestBidOfferUpdate(message) {
        this.bestBid = message.best_bid
        this.bestOffer = message.best_offer
        this.volumeBestBid = message.volume_at_best_bid
        this.volumeBestOffer = message.volume_at_best_offer
    }

    _handleRoleConfirm(message) {
        if (message.player_id == this.playerId) {
            this.role = message.role_name
        }

    }
    _handleSystemEvent(message) {
        if (message.code == 'S') {
            this.isSessionActive = true
        }
    }

    _handleSpeedConfirm(message){
        if (message.player_id == this.playerId) {
            this.subscribesSpeed = message.value
        }  
    }

    _handleReferencePrice(message) {
        this.referencePrice = message.price
    }

    _handleTakerCue(message) {}

    _handleOrderImbalance(message){
        this.orderImbalance = message.value
    }
    
    _myBidOfferUpdate(price, buySellIndicator, mode='add') {
        switch (buySellIndicator) {
            case 'B':
                this.myBid = mode == 'add' ? price : 0
                break
            case 'S':
                this.myOffer = mode == 'add' ? price : 0
                break
        }
    }

    _inventoryValueChange(inventory, cash, bestBid, bestOffer) {
        let result = null;
        if (inventory <= 0 && bestOffer != MAX_ASK) {
            result = inventory * bestOffer
        } else if (inventory > 0 && bestBid) {
            result = inventory * bestBid
        }
        return result
    }

    _activeSession(isActive){
        return (isActive == true) ? 'session-on' : 'session-off';
    }
    _isSpreadGraphDisabled(playerRole){
        return (playerRole == 'manual') ? '' : 'graph-disabled';
    }

    _msgSanitize (messagePayload, direction) {
        if (this.events[direction].hasOwnProperty(messagePayload.type)) {

            let cleanMessage = {}
            let fieldsTypes = this.events[direction][messagePayload.type]
            for (let key in fieldsTypes) {
                let fieldParser = fieldsTypes[key]
                if (!messagePayload.hasOwnProperty(key)) {
                    console.error(`error: ${key} missing in ${messagePayload}`)
                    return ;
                }

                let rawValue = messagePayload[key]
                if (typeof rawValue == 'undefined' || rawValue === null) {
                    console.error(`invalid value: ${rawValue} for key: ${key}`)
                }

                let cleanValue = fieldParser(rawValue)

                if (typeof cleanValue == 'undefined' || cleanValue === null) {
                    console.error(`parser: ${fieldParser} returned ${cleanValue} `)
                }

                cleanMessage[key] = cleanValue
            }
            return cleanMessage;
        }
        else {
            console.error(`invalid message type: ${messagePayload.type} in ${messagePayload}`);
        }
    }

    _calculateCost(speedCost) {
        // we should revisit this rounding issue
        // in general we want to integers
        return Math.round(speedCost)
    }

    _calculateCash (totalCost) {
        return Math.round(this.cash - totalCost)
    }

    _calculateWealth(cash, totalCost, referencePrice, inventory) {
        const out = Math.round(cash - totalCost + referencePrice * inventory) 
        return out
    }

}

customElements.define('elo-market-session', MarketSession)
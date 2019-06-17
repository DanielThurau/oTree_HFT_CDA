import {html,PolymerElement} from '../node_modules/@polymer/polymer/polymer-element.js';

/*
 * A single cell on the results page
 *
 * Pie chart cannibalized from https://www.highcharts.com/demo/pie-legend
 */
export class ResultsCell extends PolymerElement {
  constructor(){
    super();
  }

  static get template() {
    return html `
    <style>
      .outer {
        display: flex;
        justify-content: space-around;
        padding: 5px;
      }
      .data {
	display: inline-block;
      }
      h2 {
	margin: 2%;
      }
    </style>

    <div style="text-align:center; padding:10px;" class="wrapper" id="parent">
      <h2>[[ name ]]</h2>
      <!--
      <table style="display:inline-block; text-align:center;">
        <tr>
          <td style="display:inline-block;">
            <div id="container" class="container"></div>
          </td>
          <td style="display:inline-block; margin=10px;">
            <div id="container2" class="container"></div>
          </td>

        </tr>
      </table> -->
      <div class="outer">
        <div id="container" class="container"></div>
        <div id="container2" class="container"></div>
      </div>
      <div style="display:inline-block; text-align:center;">
        <span>Average Sensitivity of Algorithms</span>
        <hr style="width: 60%">
        <span class="data"><strong>Inventory:</strong> [[ invSensitivity ]]</span>
        <span class="data"><strong>Signed Volume:</strong> [[ signedVolume ]]</span>
        <span class="data"><strong>External Feed:</strong> [[ externalFeed ]]</span>
      </div>
    </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    const strategies = this.strategies;
    let strategiesData = [];
    for(let key in strategies) {
      strategiesData.push({
        name: key,
        y: strategies[key]
      })
    }

    const payoff = this.net;
    let payoffData = [];
    payoffData.push(payoff);

    const tax = payoff > 0 ? this.tax : - this.tax;
    let taxData = [];
    if (tax > 0) {
      taxData.push(tax);
    }

    //let lowVal = Math.min(this.width, this.height);
    //let width = lowVal;
    //let height = lowVal;
    let width = this.width;
    let height = this.height;
    const parentStyle = "text-align:center; line-height:10px; width:" + width + "px; height:" + height + "px";
    width = width/2.5;
    height = height/1.4;
    let containerStyle = "width:" + width + "px; height:" + height + "px";
    let container2Style = "width:" + width + "px; height:" + height + "px";
    this.$.parent.setAttribute("style", parentStyle);
    this.$.container.setAttribute("style", containerStyle);
    this.$.container2.setAttribute("style", container2Style);

    let chart1 = Highcharts.chart(this.$.container, {
      chart: {
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: 'pie',
        size: '100%',
        spacingLeft: 0,
        spacingRight: 0
      },
      title: {
        text: 'Strategies'
      },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
      },
      credits: {
        enabled: false
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            padding: 0
          },
          showInLegend: false
        }
      },
      series: [{
        name: 'Strategies',
        colorByPoint: true,
        data: strategiesData
      }]
    });

    let chart2 = Highcharts.chart(this.$.container2, {
      chart: {
        type: 'column',
        size: '80%'
      },
      title: {
        text: 'Payoff'
      },
      xAxis: {
        categories: [" "],
        crosshair: true
      },
      yAxis: {
        max: 200,
        min: -200,
        title: {
          text: ''
        }
      },
      credits: {
        enabled: false
      },
      plotOptions: {
        column: {
          stacking: 'normal',
          pointPadding: 0,
          groupPadding: 0,
          borderWidth: 0,
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true
          },
          showInLegend: true
        }
      },
      series: [{
        name: "Net Payoff",
        data: payoffData,
        showInLegend: true,
        index: 1
      },
      {
        name: "Tax",
        data: taxData,
        showInLegend: true,
        index: 0,
        color: '#FF0000'
      }
      ]
    });

    chart1.setSize();
    chart2.setSize();
    chart2.reflow();
  }

  static get properties() {
    return {
      strategies: {
        type: Object,
        //value: {the:10, value:20}
      },
      net: {
        type: Number,
      },
      tax: {
        type: Number,
      },
      name: {
        type: String,
        //value: "Sample Name"
      },
      invSensitivity: {
        type: Number,
        //value: 5.1
      },
      signedVolume: {
        type: Number,
        //value: 3.7
      },
      externalFeed: {
        type: Number,
        //value: 4.0
      },
      width: {
        type: Number,
        //value: 300
      },
      height: {
        type: Number,
        //value: 300
      }
    }
  }

}

window.customElements.define('results-cell', ResultsCell);

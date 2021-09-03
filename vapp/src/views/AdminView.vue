<template>
  <div>

    <v-row>
      <v-col>
        <v-btn @click="loadLastTx">
          Load Last tx
        </v-btn>

        <v-btn @click="filter">
          Only work
        </v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col lg="7">

        <Table title="Before" :total="totalBefore" :items="itemsBefore"/>
        <Table title="After" :total="totalAfter" :items="itemsAfter"/>

        <v-card v-if="false" height="85vh" class="overflow-y-auto">
          <v-stepper
              vertical
              v-model="position"
          >
            <template v-for="(item, index) in logs">

              <v-stepper-step editable :complete="position > index + 1" :step="index + 1">
                <h2>
                  {{ getContractName(item.address) }}: {{ item.name }}
                </h2>
              </v-stepper-step>

            </template>
          </v-stepper>
        </v-card>
      </v-col>
      <v-col lg="5">

        <v-row dense>
          <v-col>
            <v-card>
              <v-card-title>Transactions</v-card-title>
              <v-card-text>
                <v-data-table
                    dense
                    fixed-header
                    disable-sort
                    :items-per-page="30"
                    :items="transactionList"
                    single-expand
                    hide-default-footer
                    :headers="headers"
                    @click:row="loadTx"
                >

                  <template v-slot:item.ovn="{ item }">
                    <div v-if="item.ovn">
                      <p>{{ item.ovn.result > 0 ? '+' : '' }}{{ item.ovn.result }}</p>
                    </div>
                  </template>

                  <template v-slot:item.usdc="{ item }">
<!--                    <div v-if="item.usdc">-->
<!--                      <p>{{ item.usdc > 0 ? '+' : '' }}{{ item.usdc}}</p>-->
<!--                    </div>-->
                  </template>
                  <template v-slot:item.amUSDC="{ item }">
                    <div v-if="item.amUSDC">
                      <p>Before: {{ item.amUSDC.before }}</p>
                      <p>After: {{ item.amUSDC.after }}</p>
                      <p>Result: {{ item.amUSDC.result }}</p>
                    </div>
                  </template>

                  <template v-slot:item.am3CRV="{ item }">
                    <div v-if="item.am3CRV">
                      <p>Before: {{ item.am3CRV.before }}</p>
                      <p>After: {{ item.am3CRV.after }}</p>
                      <p>Result: {{ item.am3CRV.result }}</p>
                    </div>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-col>

        </v-row>
        <v-card v-if="lastTx" class="mt-1">
          <v-card-title>Event</v-card-title>
          <v-card-text>
            <p>Contract: {{ getContractName(lastTx.address) }}</p>
            <p>Method: {{ lastTx.name }}</p>
            <p>Arguments:</p>
            <template v-for="event in lastTx.events">

              <template v-if="event.type === 'address'">
                <p>{{ event.name }} : {{ event.type }} : {{ getContractName(event.value) }}</p>
              </template>
              <template v-else>
                <p>{{ event.name }} : {{ event.type }} : {{ event.value }}</p>

              </template>

            </template>

            <v-expansion-panels>
              <v-expansion-panel
              >
                <v-expansion-panel-header>
                  Verbose
                </v-expansion-panel-header>
                <v-expansion-panel-content>
                  {{ lastTx }}
                </v-expansion-panel-content>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
      </v-col>

    </v-row>
  </div>
</template>

<script>
import {mapGetters} from "vuex";
import Table from "../components/admin/Table";
import accounting from "accounting-js";

export default {
  name: "AdminView",
  components: {Table},
  data: () => ({

    transactionList: [],
    headers: [
      {text: "Number", value: 'number'},
      {text: "Type", value: 'type'},
      {text: "Gas", value: 'gasUsed'},
      {text: "OVN", value: 'ovn'},
      {text: "USDC", value: 'usdc'},
      {text: "amUSDC", value: 'amUSDC'},
      {text: "am3CRV", value: 'am3CRV'},
    ],
    logs: [],
    block: null,
    position: null,

    itemsAfter: [],
    totalAfter: {},
    itemsBefore: [],
    totalBefore: {},
  }),

  computed: {

    ...mapGetters('logTransactions', ['txView', 'transactions']),
    ...mapGetters('profile', ['web3', 'contracts', 'contractNames', 'account']),


    lastTx: function () {
      return this.logs[this.position - 1];
    },

  },


  created() {
    this.loadLastTx();
  },

  methods: {

    getContractName(address) {


      if (address === '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174') {
        return 'USDC';
      }

      if (address === '0x1a13F4Ca1d028320A707D99520AbFefca3998b7F')
        return 'aUSDC';

      if (address === '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270')
        return 'ConnectorAAVE'

      if (address === '0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171')
        return 'Curve'

      if (address === '0xca551016676d0d88a2edeaf3e9cb9cb2205f3f86')
        return 'Exchange'

      if (address === '0xa0df350d2637096571f7a701cbc1c5fde30df76a')
        return 'Your Account'

      if (address === '0xcb13353a2c2b98baec9a5ecea764fd2d2c63aa45')
        return 'Portfolio Manager'

      for (let prop in this.contracts) {

        let contract = this.contracts[prop];
        if (contract.options.address === address)
          return this.contractNames[address];
      }


      return address
    },

    filter() {
      this.transactionList = this.transactionList.filter(value => value.type === 'Mint' || value.type === 'Redeem');
    },

    loadLastTx() {


      let self = this;

      this.transactionList = [];

      this.web3.eth.getBlockNumber().then(async value => {

        let to = value;

        for (let i = 0; i < 15; i++) {

          if (to <= 0)
            return

          self.web3.eth.getBlock(to).then(block => {

            let item = {
              block: block,
              number: block.number,
              gasUsed: block.gasUsed,
            };

            this.loadTx(item);
            this.transactionList.push(item)

          });


          to = to - 1;
        }
      });
    },

    parseLog(item, log) {


      if (log.name === 'BusinessEventPrice') {
        console.log(log)
        let find = log.events.find(value => value.name === 'label');

        if (find.value === 'after') {

          find = log.events.find(value => value.name === 'prices');

          if (find.value.symbol === 'USDC')
            item.usdc= parseInt(find.value.bookValue) / 10 ** parseInt(find.value.decimals);
        }

      }


      if (log.name === 'BusinessEvent') {

        let event = log.events.find(value => value.value === 'ovnBalance');

        if (event) {

          let find = log.events.find(value => value.name === 'beforeAmount');

          let ovn = {}
          ovn.before = find.value / 10 ** 6;

          find = log.events.find(value => value.name === 'afterAmount');
          ovn.after = find.value / 10 ** 6;

          ovn.result = ovn.after - ovn.before;

          item.ovn = ovn;
        }


        event = log.events.find(value => value.value === 'am3CRV');

        if (event) {

          let find = log.events.find(value => value.name === 'beforeAmount');

          let am3CRV = {}
          am3CRV.before = find.value / 10 ** 6;

          find = log.events.find(value => value.name === 'afterAmount');
          am3CRV.after = find.value / 10 ** 6;

          am3CRV.result = am3CRV.after - am3CRV.before;

          item.am3CRV = am3CRV;
        }


        event = log.events.find(value => value.value === 'amUSDC');

        if (event) {

          let find = log.events.find(value => value.name === 'beforeAmount');

          let amUSDC = {}
          amUSDC.before = find.value / 10 ** 6;

          find = log.events.find(value => value.name === 'afterAmount');
          amUSDC.after = find.value / 10 ** 6;

          amUSDC.result = amUSDC.after - amUSDC.before;

          item.amUSDC = amUSDC;
        }


      }

      if (log.name === 'EventUnStake') {


      }

      if (log.name === 'EventExchange') {
        let find = log.events.find(value => value.value === 'buy');

        if (find) {
          let find = log.events.find(value => value.name === 'amount');
          item.ovnIn = find.value / 10 ** 6;
          item.type = 'Mint'
        }

        find = log.events.find(value => value.value === 'redeem');

        if (find) {
          find = log.events.find(value => value.name === 'amount');
          item.ovnOut = find.value / 10 ** 6;
          item.type = 'Redeem'
        }
      }

      if (item.type === 'Un Known' && log.name === 'Approval') {
        item.type = 'Approval';
      }


    },


    loadTables(log) {


      if (log.name === 'BusinessEventPrice') {
        console.log(log)
        let find = log.events.find(value => value.name === 'label');

        let array;

        if (find.value === 'after')
          array = this.itemsAfter;
        else
          array = this.itemsBefore;

        find = log.events.find(value => value.name === 'prices');
        array.push(this.convertItem(find.value))
      }


      if (log.name === 'BusinessEvent') {

        let event = log.events.find(value => value.value === 'ovnBalance');

        if (event) {

          let find = log.events.find(value => value.name === 'beforeAmount');
          this.totalBefore.ovn = find.value / 10 ** 6;

          find = log.events.find(value => value.name === 'afterAmount');
          this.totalAfter.ovn = find.value / 10 ** 6;



        }
      }
    },

    convertItem(element) {


      let accountingConfig = {
        symbol: "",
        precision: 6,
        thousand: " ",
      };

      try {
        let bookValue = parseInt(element.bookValue) / 10 ** parseInt(element.decimals);
        let liquidationValue = parseInt(element.liquidationValue) / 10 ** parseInt(element.decimals);
        ;
        let price = parseFloat(this.web3.utils.fromWei(element.price))

        let liquidationPrice = 0
        let bookPrice = 0

        if (liquidationValue !== 0 && bookValue !== 0)
          liquidationPrice = liquidationValue / bookValue;

        if (bookValue !== 0 && price !== 0)
          bookPrice = bookValue * price

        return {
          symbol: element.symbol,
          bookValue: accounting.formatMoney(bookValue, accountingConfig),
          price: accounting.formatMoney(price, accountingConfig),
          bookPrice: accounting.formatMoney(bookPrice, accountingConfig),
          liquidationPrice: accounting.formatMoney(liquidationPrice, accountingConfig),
          liquidationValue: accounting.formatMoney(liquidationValue, accountingConfig),
        };
      } catch (e) {
        console.log(e)
      }
    }
    ,

    loadTx(item) {

      this.itemsAfter = [];
      this.itemsBefore = [];
      this.totalAfter = {};
      this.totalBefore = {};

      let self = this;
      self.block = item.block;
      self.transaction = [];
      self.logs = [];

      for (let i = 0; i < self.block.transactions.length; i++) {
        let transaction = self.block.transactions[i];

        self.web3.eth.getTransactionReceipt(transaction, function (e, receipt) {
          self.transactions.push(receipt);

          let logs = self.$abiDecoder.decodeLogs(receipt.logs);
          for (let j = 0; j < logs.length; j++) {
            let log = logs[j];
            self.parseLog(item, log);
            self.loadTables(log);
          }

        });
      }
    }
  }
}
</script>

<style scoped>

</style>

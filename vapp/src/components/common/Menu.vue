<template>
  <v-row justify="center">
    <div class="hidden-xs-only">
      <span v-bind:class="activeTabSave" @click="goToAction('/')">Earn</span>
      <span v-bind:class="activeTabDashboard" class=" ml-10"
            @click="goToAction('/fund')">Portfolio & performance</span>
      <span v-bind:class="activeTabStats" class="ml-10" @click="goToAction('/stats')">Stats</span>
    </div>
    <div class="hidden-sm-and-up mt-10">
      <v-select class="menu-select" flat solo color="#5686B2" :items="menus" v-model="menu" item-value="to"
                @input="pushUrl" item-text="name"/>
    </div>
  </v-row>
</template>

<script>
import {mapGetters} from "vuex";

export default {
  name: "Menu",
  data: () => ({
    exitAppShow: false,
    direction: 'top',
    fab: false,
    tab: null,
    currentDate: null,
    showLimitTooltip: false,

    ethLogo: require('../../assets/currencies/eth.svg'),
    polLogo: require('../../assets/currencies/pol.svg'),

    tabId: 1,

    menu: null,

    menus: [
      {
        name: 'Earn',
        to: '/',
        id: 1
      },
      {
        name: 'Fund performance',
        to: '/fund',
        id: 2,
      },
      {
        name: 'Stats',
        to: '/stats',
        id: 3,
      },
    ]
  }),


  computed: {

    ...mapGetters('web3', ['account', 'web3', 'contractNames', 'networkId']),



    activeTabSave: function () {
      return {
        'active-tab': this.tabId === 1,
        'in-active-tab': this.tabId !== 1,
      }
    },

    activeTabDashboard: function () {
      return {
        'active-tab': this.tabId === 2,
        'in-active-tab': this.tabId !== 2,
      }
    },


    activeTabStats: function () {
      return {
        'active-tab': this.tabId === 3,
        'in-active-tab': this.tabId !== 3,
      }
    },
  },


  created() {

    let path = this.$router.history.current.path;
    let find = this.menus.find(value => value.to === path);
    if (find) {
      this.menu = find;
      this.tabId = find.id;
    }

  },


  methods: {


    goToAction(id) {

      let menu = this.menus.find(value => value.to === id);

      if (menu === this.menu)
        return;
      else {
        this.$router.push(id)
        this.menu = menu;
        this.tabId = menu.id;
      }

    },

    pushUrl(to) {
      this.$router.push(to)
    },





  }
}
</script>

<style scoped>
.tabs {
  font-size: 25px;
}

.active-tab {
  color: #5686B2;
  font-size: 25px;
  font-weight: bold;
  border-bottom: 4px solid #171717;
  cursor: pointer;
}

.menu-select {
  width: 150px;
  font-size: 25px;
  color: #171717;
}

.in-active-tab {
  color: #5686B2;
  font-size: 25px;
  font-weight: bold;
  cursor: pointer;
}


</style>

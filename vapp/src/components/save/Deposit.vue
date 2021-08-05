<template>
 <div>
   <v-row dense>
     <v-col cols="10" class="pb-0 mb-0">
       <v-text-field class="pb-0 mb-0" label="0.0" outlined dense></v-text-field>
     </v-col>

     <v-col cols="2">
       <v-menu
           left
           bottom
       >
         <template v-slot:activator="{ on, attrs }">
           <v-btn
               icon
               v-bind="attrs"
               v-on="on"
           >
             {{ currency.name }}
           </v-btn>
         </template>

         <v-list>
           <v-list-item
               v-for="item in currencies"
               :key="item.id"
               @click="selectItem(item)"
           >
             <v-list-item-title>{{ item.name }}</v-list-item-title>
           </v-list-item>
         </v-list>
       </v-menu>
     </v-col>
   </v-row>

   <v-row dense class="justify-center">
     <v-icon large>mdi-arrow-down</v-icon>
   </v-row>

   <v-row dense>

     <v-col cols="10">
       <v-text-field readonly label="0.0" outlined dense></v-text-field>
     </v-col>
     <v-col cols="2">
       <v-img :src="buyCurrency.image"/>
       <v-btn
       >
         {{ buyCurrency.name }}
       </v-btn>
     </v-col>
   </v-row>

   <v-row dense class="justify-center">
     <v-btn small outlined>Enter an amount</v-btn>
   </v-row>
 </div>
</template>

<script>
export default {
  name: "Deposit",

  data: () => ({
    menu: false,
    tab: null,
    currency: null,

    currencies: [],

    buyCurrency: {
      id: 'overnight',
      name: 'OVN',
      image: require('../../assets/currencies//usdc.svg')
    }
  }),

  created() {

    this.currencies.push({id: 'usdc', name: 'USDC', image: require('../../assets/currencies/dai.svg')});
    this.currencies.push({id: 'musd', name: 'mUSD', image: require('../../assets/currencies/mUsdc.svg')});
    this.currencies.push({id: 'dai', name: 'DAI', image: require('../../assets/currencies/dai.svg')});

    this.currency = this.currencies[0];
  },

  methods: {

    selectItem(item) {
      this.currency = item;
    }
  }
}
</script>

<style scoped>

</style>

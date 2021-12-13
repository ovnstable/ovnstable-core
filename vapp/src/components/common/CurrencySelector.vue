<template>
  <v-menu
      rounded="lg"
      offset-y
      @input="setShow"
  >
    <template v-slot:activator="{ attrs, on }">
      <v-btn
          :height="heightBtn"
          v-bind="attrs"
          v-on="on"
          text
          :class="btnMainClass "
      >
          <div class="image-icon">
              <v-img :src="selectedItem.image"/>
          </div>
        <span class="text-btn ml-2">{{ selectedItem.title }}</span>
        <v-icon v-if="!show && !readonly">mdi-arrow-down</v-icon>
        <v-icon v-if="show && !readonly">mdi-arrow-up</v-icon>
      </v-btn>
    </template>

    <v-list v-if="!readonly">
      <v-list-item
          v-for="item in items"
          :key="item.id"
          link
          @click="setItem(item)"
      >
          <v-list-item-avatar>
              <div class="image-icon">
                  <v-img :src="item.image"/>
              </div>
        </v-list-item-avatar>
        <v-list-item-title class="text-btn" v-text="item.title"></v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
export default {
  name: "CurrencySelector",

  props: {
    readonly: {
      type: Boolean,
      default: false,
    },
    heightBtn: {
      type: String,
      default: '50px'
    },
    classBtn: {
      type: String
    },

    selectedItem: {
      type: Object,
    },
    items: {
      type: Array,
      default: [],
    },
  },
  data: () => ({
    show: false,
  }),

  computed: {

    btnMainClass: function (){
      return "main-btn" + " " + this.classBtn;
    }
  },

  methods: {

    setShow(value) {
      this.show = value;
    },
    setItem(item) {
      this.selectedItem = item;
    }
  }
}
</script>

<style scoped>

.image-icon {
    width: 40px;
    height: 40px;
}
.text-btn{
  font-size: 1.125rem;
  color: rgb(37, 39, 45);
  font-weight: 800;
}

.main-btn {
  background-color: rgb(255, 255, 255);
  border-radius: 10px;
}

.main-btn:hover {
  background-color: rgba(247,247,247,1);
}

.main-btn:focus {
  background-color: rgba(247,247,247,1);
}
.main-btn:focus:before {
  background-color: rgba(247,247,247,1);
}
</style>

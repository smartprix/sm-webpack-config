import Vue from 'vue';

import App from './App.vue';
import createRouter from './router';
import createStore from './vuex';

Vue.config.productionTip = false;

// export a factory function for creating fresh app, router and store instances
export default function createApp() {
	return new Vue({
		store: createStore(),
		router: createRouter(),
		render: h => h(App),
	});
}

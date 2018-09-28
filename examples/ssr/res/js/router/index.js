import Vue from 'vue';
import Router from 'vue-router';
import Hello from '../components/Hello.vue';

Vue.use(Router);

export default function createRouter() {
	return new Router({
		mode: 'history',
		scrollBehavior: () => ({y: 0}),
		routes: [
			{path: '/hello', component: Hello, name: 'Hello'},
		],
	});
}

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { loadThemePreference } from "./services/theme";

import "./assets/style.css";

loadThemePreference();

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");
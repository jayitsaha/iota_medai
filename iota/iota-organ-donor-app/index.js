import { registerRootComponent } from 'expo';
import App from './App';

// Log to confirm this file is being loaded
console.log('Index.js is loading App.js as the root component');

// Register App.js as the main component
registerRootComponent(App);
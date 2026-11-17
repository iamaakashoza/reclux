import { mount } from 'svelte';
import '../../styles/tokens.css';
import App from './App.svelte';
import { applyLook } from '../../lib/settings';

applyLook();

export default mount(App, { target: document.getElementById('app')! });

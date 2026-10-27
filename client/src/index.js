// The server address comes from Stashr (see utils/apiBase.js), so it has to be known before any other module reads it.
import { resolveApiBase } from './utils/apiBase';

resolveApiBase().finally(() => import('./bootstrap'));

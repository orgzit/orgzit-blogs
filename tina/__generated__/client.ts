import { createClient } from "tinacms/dist/client";
import { queries } from "./types.js";
export const client = createClient({ cacheDir: '/Users/afzalansari/orgzit-blogs/tina/__generated__/.cache/1783587438648', url: process.env.TINA_LOCAL_URL || 'https://content.tinajs.io/2.4/content/9dd68aa3-cac3-48a2-a4aa-2b88e58846e2/github/main', token: '740fa4de945316a125e3ab302a63f63b92a96152', queries,  });
export default client;
  
import { createClient } from "tinacms/dist/client";
import { queries } from "./types.js";
export const client = createClient({ url: 'http://localhost:4001/graphql', token: '740fa4de945316a125e3ab302a63f63b92a96152', queries,  });
export default client;
  
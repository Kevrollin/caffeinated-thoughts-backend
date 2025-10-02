import { createServer } from './server.js';
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const app = createServer();
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Caffeinated Thoughts API listening on port ${port}`);
});

import express from 'express';

const app = express();
const port = 3002;
app.use(express.json());



app.listen(port, () => {
    console.log(`Trias Client listening at http://localhost:${port}`);
});

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { filesRouter } from './routes/files.js';
import { quotesRouter } from './routes/quotes.js';
import { ordersRouter } from './routes/orders.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/orders', ordersRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CutQuote backend running on port ${PORT}`);
});

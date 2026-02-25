import mysql from 'mysql';
import config from './config.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import profileRoutes from "./profileRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, "client/build")));

// Profile routes
app.use("/api/profile", profileRoutes);
// API Routes
// TODO: Implement the following endpoints:
// GET /api/movies - retrieve all movies from database  
// POST /api/reviews - create a new movie review

app.listen(port, () => console.log(`Listening on port ${port}`)); //for the dev version

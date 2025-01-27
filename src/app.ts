import dotenv from "dotenv";
dotenv.config();
import express from "express";
import referenceRouter from "./routes/references";
import productsRouter from "./routes/products";
import custodiansRouter from "./routes/custodians";

const app = express();
app.use(express.json());

// Register routes
console.log("1. Registering reference routes");
app.use("/api/references", referenceRouter);
console.log("2. Registering product routes");
app.use("/api", productsRouter);
console.log("Registering custodian routes");
app.use("/api", custodiansRouter);

export default app;
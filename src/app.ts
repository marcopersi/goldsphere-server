import dotenv from "dotenv";
dotenv.config();
import express from "express";
import referenceRouter from "./routes/references";
import productsRouter from "./routes/products";
import custodiansRouter from "./routes/custodians";
import portfolioRouter from "./routes/portfolio";
import orderRouter from "./routes/orders";
import userRouter from "./routes/users";

const app = express();
app.use(express.json());

// Register routes
console.log("1. Registering reference routes");
app.use("/api/references", referenceRouter);
console.log("2. Registering product routes");
app.use("/api", productsRouter);
console.log("3. Registering custodian routes");
app.use("/api", custodiansRouter);
console.log("4. Registering portfolio routes");
app.use("/api", portfolioRouter);
console.log("5. Registering order routes");
app.use("/api", orderRouter);
console.log("6. Registering user routes");
app.use("/api", userRouter);

export default app;
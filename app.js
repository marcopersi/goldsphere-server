const express = require('express');
const app = express();
const port = 11215;

const referenceRoutes = require('./src/routes/references');
app.use('/api', referenceRoutes);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

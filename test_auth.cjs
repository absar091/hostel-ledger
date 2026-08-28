const express = require('express');
const app = express();

app.get('/*', (req, res) => {
  res.send('Mock login');
});
app.listen(3001, () => {
    console.log("Mock server running on 3001");
});

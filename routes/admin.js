const express = require('express');
const router = express.Router();
const Room = require('../models/room');

/* GET users listing. */
router.get('/clearAll', (req, res) => {
  Room.deleteMany({},(err, data) => {
    return res.status(200).json({
      status: err ? "Failed" : "Success",
      ack: err || data
    })
  });
});

module.exports = router;

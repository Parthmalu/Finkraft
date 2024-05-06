const express = require("express");
const multer = require("multer");
const fs = require("fs");
const csv = require("csv-parser");
// const bodyParser = require("body-parser");
const app = express();
// app.use(bodyParser.text());
app.use(express.json());
const upload = multer({ dest: "uploads/" });

const mongoose = require("mongoose");
const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    transactionDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true },
    invoiceURL: { type: String, required: true },
  },
  {
    versionKey: false,
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

mongoose.connect(
  "mongodb+srv://parthmalu788:Parth0831601@finkart.4lvstwl.mongodb.net/?retryWrites=true&w=majority&appName=finkart"
);

app.post("/upload", upload.single("file"), (req, res) => {
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      for (const transaction of results) {
        await Transaction.updateOne(
          { transactionId: transaction.TransactionID }, // Match transaction by TransactionID
          {
            $set: {
              customerName: transaction.CustomerName,
              transactionDate: new Date(transaction.TransactionDate),
              amount: parseFloat(transaction.Amount),
              status: transaction.Status,
              invoiceURL: transaction.InvoiceURL,
            },
          },
          { upsert: true } // Upsert option: update or insert
        );
      }
      res.send("Transactions processed successfully");
    });
});

// Retrieve all transactions
app.get("/transactions", async (req, res) => {
  try {
    const transactions = await Transaction.find();
    console.log(transactions);
    res.json(transactions);
  } catch (error) {
    res.status(500).send("Error retrieving transactions: " + error.message);
  }
});

// Retrieve a specific transaction by transactionId
app.get("/transactions/:transactionId", async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId,
    });
    if (!transaction) {
      res.status(404).send("Transaction not found");
    } else {
      console.log(transaction);
      res.json(transaction);
    }
  } catch (error) {
    res.status(500).send("Error retrieving transaction: " + error.message);
  }
});

//Get transactions by name
app.post("/transactions/by-name", async (req, res) => {
  try {
    const { customerName } = req.body; // Accessing the name from request body
    if (!customerName) {
      return res.status(400).send("Customer name is required.");
    }

    const transactions = await Transaction.find({ customerName: customerName });

    if (transactions.length === 0) {
      return res
        .status(404)
        .send("No transactions found for the specified customer.");
    }

    res.json(transactions);
  } catch (error) {
    res.status(500).send("Error fetching transactions: " + error.message);
  }
});

//Get transactions by status
app.post("/transactions/by-status", async (req, res) => {
  try {
    const { status } = req.body; // Accessing the name from request body
    if (!status) {
      return res.status(400).send("Status is required.");
    }

    const transactions = await Transaction.find({ status: status });

    if (transactions.length === 0) {
      return res
        .status(404)
        .send("No transactions found for the specified status.");
    }

    res.json(transactions);
  } catch (error) {
    res.status(500).send("Error fetching transactions: " + error.message);
  }
});

// Get transactions by array of transaction IDs
app.post("/transactions", async (req, res) => {
  try {
    const transactionIds = req.body.transactionIds;
    if (
      !transactionIds ||
      !Array.isArray(transactionIds) ||
      transactionIds.length === 0
    ) {
      return res
        .status(400)
        .send("Invalid input: Provide an array of transaction IDs.");
    }

    const transactions = await Transaction.find({
      transactionId: { $in: transactionIds },
    });

    if (transactions.length === 0) {
      return res
        .status(404)
        .send("No transactions found for the provided IDs.");
    }

    res.json(transactions);
  } catch (error) {
    res.status(500).send("Error fetching transactions: " + error.message);
  }
});

//Get transactions on a particular date
app.post("/transactions/by-date", async (req, res) => {
  try {
    const { transactionDate } = req.body; // Accessing the date from request body
    if (!transactionDate) {
      return res.status(400).send("Transaction date is required.");
    }

    // Ensure the date is in the correct format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
      return res.status(400).send("Invalid date format. Use YYYY-MM-DD.");
    }

    // Parse date and set up date range for the entire day
    const startDate = new Date(transactionDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);

    const transactions = await Transaction.find({
      transactionDate: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    if (transactions.length === 0) {
      return res
        .status(404)
        .send("No transactions found for the specified date.");
    }

    res.json(transactions);
  } catch (error) {
    res.status(500).send("Error fetching transactions: " + error.message);
  }
});

//Get transactions by date range
app.post("/transactions/by-date-range", async (req, res) => {
  try {
    const { startDate, endDate } = req.body; // Accessing dates from request body
    if (!startDate || !endDate) {
      return res.status(400).send("Both start date and end date are required.");
    }

    // Ensure the dates are in the correct format
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ) {
      return res.status(400).send("Invalid date format. Use YYYY-MM-DD.");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1); // Adjusting end date to include the entire last day

    const transactions = await Transaction.find({
      transactionDate: {
        $gte: start,
        $lt: end,
      },
    });

    if (transactions.length === 0) {
      return res
        .status(404)
        .send("No transactions found within the specified date range.");
    }

    res.json(transactions);
  } catch (error) {
    res.status(500).send("Error fetching transactions: " + error.message);
  }
});

// Update a particular transaction by transactionId
app.put("/transactions/:transactionId", async (req, res) => {
  try {
    console.log(req.body, req.params);
    const { customerName, amount, transactionDate, status, invoiceURL } =
      req.body;
    const updatedTransaction = await Transaction.findOneAndUpdate(
      { transactionId: req.params.transactionId },
      {
        $set: {
          customerName,
          transactionDate: new Date(transactionDate),
          amount,
          status,
          invoiceURL,
        },
      },
      { new: true } // Return the updated document
    );

    if (!updatedTransaction) {
      res.status(404).send("Transaction not found");
    } else {
      console.log(updatedTransaction);
      res.json(updatedTransaction);
    }
  } catch (error) {
    res.status(500).send("Error updating transaction: " + error.message);
  }
});

// Delete a particular transaction by transactionId
app.delete("/transactions/:transactionId", async (req, res) => {
  try {
    const deletedTransaction = await Transaction.findOneAndDelete({
      transactionId: req.params.transactionId,
    });
    if (!deletedTransaction) {
      res.status(404).send("Transaction not found");
    } else {
      console.log(deletedTransaction);
      res.json(deletedTransaction);
    }
  } catch (error) {
    res.status(500).send("Error deleting transaction: " + error.message);
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const express = require("express");
//const secretKey = require("./config/stripeKey.json").secretKey;
//const stripe = require("stripe")(secretKey, {
//  apiVersion: "2019-11-05"
//});
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const pet = require("arkvatar-ts");
const cron = require("node-cron");
const cors = require("cors");

let serviceAccount = require("./config/serviceAccountKey.json");
const app = express();

// Setup for Body Parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

//Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
let db = admin.firestore();

// Add crone to run check every midnight
cron.schedule("0 0 0 * * *", () => {
  db.collection("pets")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        let data = doc.data();
        let history = data.history;
        history.shift();
        if (!data.hasPaid) {
          history.push(data.todaySaved);
          let hp = data.hp - 2;
          db.collection("pets")
            .doc(data.owner)
            .update({ hp });
        } else {
          history.push(data.todaySaved);
          let hasPaid = false;
          let todaySaved = 0;
          db.collection("pets")
            .doc(data.owner)
            .update({ hasPaid, todaySaved });
        }
      });
    });
});

// Add user details in firebase store
app.post("/user/set", (req, res) => {
  let userModel = req.body;
  db.collection("users")
    .doc(userModel.id)
    .get()
    .then(doc => {
      if (!doc.exists) {
        (async () => {
          // Crypto Type are the full name of a cryptocurrency, Ethereum or Ark for example.
          /* eslint-disable-next-line no-unused-vars */
          const response = await pet.store(userModel.email, "Ethereum");
        })();
        userModel.isNew = true;
        userModel.target = 0;
        userModel.daily = 0;
        userModel.savings = 0;
        // new user save to db
        db.collection("users")
          .doc(userModel.id)
          .set(userModel, { merge: true });
        res.send(userModel);
      } else {
        // existing user get data from db
        db.collection("users")
          .doc(userModel.id)
          .set(userModel, { merge: true });
        db.collection("users")
          .doc(userModel.id)
          .get()
          .then(doc => res.send(doc.data()));
      }
    });
});

//Add pet details in firebase store
app.post("/pet/set", (req, res) => {
  let petModel = req.body;
  db.collection("pets")
    .doc(petModel.owner)
    .get()
    .then(doc => {
      if (!doc.exists) {
        petModel.xp = 0;
        petModel.hp = 100;
        petModel.level = 0;
        petModel.hasPaid = false;
        petModel.todaySaved = 0;
        petModel.history = [0, 0, 0, 0, 0, 0, 0];
        // new pet save to db
        db.collection("pets")
          .doc(petModel.owner)
          .set(petModel, { merge: true });
        res.send(petModel);
      } else {
        // Calculating the level score based on xp
        petModel.level = Math.floor((Math.sqrt(25 + 40 * petModel.xp) - 5) / 10);
        // existing user get data from db
        db.collection("pets")
          .doc(petModel.owner)
          .set(petModel, { merge: true });
        db.collection("pets")
          .doc(petModel.owner)
          .get()
          .then(doc => res.send(doc.data()));
      }
    });
});

//Send pet details back to client side
app.post("/pet/get/:email", (req, res) => {
  let email = req.params.email;
  /* eslint-disable-next-line no-unused-vars */
  let petQuery = db
    .collection("pets")
    .doc(email)
    .get()
    .then(doc => {
      if (doc.exists) {
        res.send(doc.data());
      } else {
        res.send({
          set: false
        });
      }
    });
});

//Create leaderboard based on xp of pet (top 3)
/* eslint-disable-next-line no-unused-vars */
app.post("/leaderboard/:email", (req, res) => {
  let email = req.params.email;
  // let name, xp;
  let array = [];
  let counter = 1,
    ownerRank;
  db.collection("pets")
    .orderBy("xp", "desc")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        let dataPet = doc.data();
        if (dataPet.owner === email) {
          ownerRank = counter;
        }
        if (counter <= 3) {
          array.push(dataPet);
        }
        counter++;
      });
      res.send({ array, ownerRank });
    });
});

/*
//Add stripe payment gateway integration
// eslint-disable-next-line no-unused-vars 
app.post("/payment/:amount", (req, res) => {
  const amount = req.params.amount;
  stripe.customers.create({
    email: req.body.stripeEmail,
    source: req.body.stripeToken
  }).then(customer => {
    stripe.charges.create({
      amount,
      description: "Unicorn Savings",
      currency: "inr",
      customer: customer.id
    }).then(() => { res.send("Your pet is happy with your performance.")})
    .catch(err => {
      res.status(500).send({error: "Payment Failed,your pet is hungry!"});
    });
  });
});*/

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Listening on port ${port}`));

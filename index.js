//const process.env.PORT = 4000;
require("dotenv").config();
const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { response } = require("express");

app.use(express.json());

app.use(cors());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  next();
});
//Database connection with MongoDB
// mongoose.connect("mongodb+srv://masterjinkal:Jinkal123@cluster0.oiumjlq.mongodb.net/towntrove");
mongoose.connect(
  process.env.MONGODB_URI ||
    "mongodb+srv://masterjinkal:Jinkal123@cluster0.oiumjlq.mongodb.net/towntrove"
);

//API creation

app.get("/", (req, res) => {
  res.send("Express App is Running");
});

//Image storage engine

const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

// Creating upload end point for images
app.use("/images", express.static("upload/images"));
app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    mage_url: `https://${req.get("host")}/images/${req.file.filename}`,
    //image_url: `${req.protocol}://${req.get("host")}/images/${req.file.filename}`,
  });
});

// app.post("/upload", upload.single("product"), (req, res) => {
//   res.json({
//     success: 1,
//     image_url: http://localhost:4000/images/${req.file.filename},
//   });
// });

//Schema for creating products

const Product = mongoose.model("Product", {
  id: {
    type: Number,
    require: true,
  },
  name: {
    type: String,
    require: true,
  },
  image: {
    type: String,
    require: true,
  },
  category: {
    type: String,
    require: true,
  },
  new_price: {
    type: Number,
    require: true,
  },
  old_price: {
    type: Number,
    require: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;
  if (products.length > 0) {
    //means product is available in our database
    let last_product_array = products.slice(-1); //in this array, we will get only last product
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } //data base has no product, it is empty
  else {
    id = 1;
  }

  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
  });
  //now we have to save the product in the database
  await product.save();
  //generate response for the frontend
  res.json({
    success: true,
    name: req.body.name,
  });
});

//Creating API for deleting products (from our database)
app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  res.json({
    success: true,
    name: req.body.name,
  });
});

app.get("/allproducts", async (req, res) => {
  let products = await Product.find({});

  // Modify products to include necessary details and image URL
  const modifiedProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    new_price: product.new_price,
    old_price: product.old_price,
    image: product.image, // Construct image URL using retrieved filename
  }));

  res.send(modifiedProducts);
});

//API for user creation
//Schema creation for user model
const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

//Creating Endpoint for registering the user
app.post("/signup", async (req, res) => {
  //will check that emailid and password we are getting, are already exixting or not
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    //account already available
    return res.status(400).json({
      success: false,
      errors: "existing user found with same e-mail address",
    });
  }
  //if no already exixting user, create the empty cart
  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }

  //using the cart, we will create the user
  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });

  //save user in database
  await user.save();

  //after creating the user, we will use JWT authentication

  const data = {
    user: {
      id: user.id,
    },
  };

  //generating token
  const token = jwt.sign(data, process.env.JWT_SECRET); //using secret_ecom, our token wont be readable
  //then token will be generated
  res.json({ success: true, token });
});

//Creatinf endpoint for user login
app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      //if password true, creating user object
      const data = {
        user: {
          id: user.id,
        },
      };
      //create token using jwt
      const token = jwt.sign(data, process.env.JWT_SECRET);
      //create response using json method
      res.json({ success: true, token });
    } //password incorrect
    else {
      res.json({ success: false, errors: "Wrong Password" });
    }
  } //if user is not available with particular e-mail id
  else {
    res.json({ success: false, errors: "Wrong E-mail ID" });
  }
});

//Creating endpoint for New Collection data
app.get("/newcollection", async (req, res) => {
  let products = await Product.find({});
  //we will slice the product array
  const modifiedProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    new_price: product.new_price,
    old_price: product.old_price,
    // ... other desired details
    image: product.image, // Construct image URL using retrieved filename
  }));

  let newcollection = modifiedProducts.slice(1).slice(-8); //using this, we will get recently added new products in newcollection array
  res.send(newcollection);
});

//Creating endpoint for popular-in-women section
app.get("/popularinwomen", async (req, res) => {
  let products = await Product.find({ category: "women" }); //it will search for women categrory in schema and all in this will be added to products

  const modifiedProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    new_price: product.new_price,
    old_price: product.old_price,
    // ... other desired details
    image: product.image, // Construct image URL using retrieved filename
  }));

  let popular_in_women = modifiedProducts.slice(0, 4);

  res.send(popular_in_women);
});

//Creating middleware to fetch user
const fetchUser = async (req, res, next) => {
  //we will take auth-token, verify it using jwt and then find the user
  const token = req.header("auth-token"); //auth-token is key name
  if (!token) {
    //token is not available
    res.status(401).send({ errors: "Please authenticate using valid token" });
  } else {
    try {
      const data = jwt.verify(token, process.env.JWT_SECRET); //using salt process.env.JWT_SECRET to hide data
      req.user = data.user;
      next(); //execute next function passed as parameter
    } catch (error) {
      //display error
      res
        .status(401)
        .send({ errors: "Please authenticate using a valid token" });
    }
  }
};

//creating endpoint to add cartproducts in mongodb
//creating endpoint for adding products in cartData
app.post("/addtocart", fetchUser, async (req, res) => {
  //now using auth-token, we will find user and update cartdata in particular itemId
  //will have to create middleware

  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  //save this modified data in mongo db
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Added");
});

//creating endpoint/API to remove product frm cart data
app.post("/removefromcart", fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  //save that data in db
  if (userData.cartData[req.body.itemId] > 0) {
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate(
      { _id: req.user.id },
      { cartData: userData.cartData }
    );
    res.send("Removed");
  }
});

//when we login an account, all the cartdata is retrieved
//creating endpoint to get cart data
app.post("/getcart", fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

app.listen(port, (error) => {
  if (!error) {
    console.log("Server Running on PORT " + port);
  } else {
    console.log("Error: " + error);
  }
});
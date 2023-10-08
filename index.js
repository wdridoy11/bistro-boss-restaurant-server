const express = require("express");
const app= express();
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT =(req,res,next)=>{
    const authorization = req.headers.authorization;
    if(!authorization){
        return res.status(401).send({error: true, message:"unauthorization access"})
    }
    // bearer token
    const token = authorization.split(' ')[1];
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
      if(err){
          return res.status(401).send({error: true, message:"unauthorization access"})
      }
      req.decoded = decoded;
      next()
    })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v2v9b72.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
     client.connect();

    const menuCollection = client.db("bistro_bossDB").collection("menu");
    const usersCollection = client.db("bistro_bossDB").collection("users");
    const cartsCollection = client.db("bistro_bossDB").collection("carts");
    const reviewsCollection = client.db("bistro_bossDB").collection("reviews");
    const paymentCollection = client.db("bistro_bossDB").collection("payment");

    app.post("/jwt",(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:`1h`})
      res.send(token)
    })
      /*
      0. do not show secure links to those who should not see the links
      1. use jwt token: verifyJWT
      2. use verify Admin middleware
       */
// warning : use verifyJWT before using verifyAdmin
    const verifyAdmin = async (req,res,next) =>{
        const email = req.decoded.email;
        const query = { email: email};
        const user = await usersCollection.findOne(query);
        if(user?.role !== "admin"){
          return res.status(403).send({error: true, message:"Forbidden Message"})
        }
        next();
      }

    // get users from database
    app.get("/users",verifyJWT,verifyAdmin, async(req,res)=>{
      const result = await usersCollection.find().toArray();
      res.send(result);
    })
    
    // create user apis and send data mongodb database
    app.post("/users",async(req,res)=>{
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query);
      if(existingUser){
        return res.send({message:"user already exists"})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    // security layer: verifyJWT
    app.get("/users/admin/:email",verifyJWT,async(req,res)=>{
      const email = req.params.email;
      if(req.decoded.email !== email){
        res.send({admin:false})
      }
    })
    // create admin using id 
    app.patch("/users/admin/:id",async(req,res)=>{
      const id = req.params.id;
      console.log(id)
      const filter = {_id : new ObjectId(id)}
      const updateDoc={
        $set:{
          role:"admin"
        }
      }
      const result = await usersCollection.updateOne(filter,updateDoc);
      res.send(result)
    });

    // user delete
    app.delete("/users/:id",async(req,res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })

    // menus item get apis from database
    app.get("/menus",async(req,res)=>{
      const result = await menuCollection.find().toArray();
      res.send(result);
    })

    // user reviews apis data get from database
    app.get("/reviews",async(req,res)=>{
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    })

    // get carts apis using email
    app.get("/carts",verifyJWT, async (req,res)=>{
      const email = req.query.email;
      if(!email){
        res.send([])
      }
      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({error: true, message:"Frobidden access"})
      }
        const query = {email: email}
        const result = await cartsCollection.find(query).toArray();
        res.send(result)
    })

    // menus carts apis added post data
    app.post("/carts",async(req,res)=>{
      const item = req.body;
      const result = await cartsCollection.insertOne(item)
      res.send(result)
    });

    // delete carts menu apis from database
    app.delete("/carts/:id",async(req,res)=>{
      const id = req.params.id;
      const query ={_id : new ObjectId(id)}
      const result = await cartsCollection.deleteOne(query);
      res.send(result)
    })

    // stripe payment intent
    app.post("/create-payment-intent",verifyJWT, async(req,res)=>{
        const {price} = req.body;
        const amount = parseInt(price*100);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types:['card']
        })
        res.send({
          clientSecret: paymentIntent.client_secret
        })
    })

    app.post("/payment", verifyJWT, async(req,res)=>{
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);
      const query ={_id : {$in: payment.cardItems.map((id)=>new ObjectId(id))}}
      const deleteResult = await cartsCollection.deleteMany(query);
      res.send({result:insertResult,deleteResult});
    })

    app.get("/payment", async(req,res)=>{
      const result = await paymentCollection.find().toArray();
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res)=>{
res.send("boss is running");
})

app.listen(port,()=>{
    console.log("bistro boss is running ",port)
})
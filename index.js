const express = require("express");
require('dotenv').config();
const app= express();
const cors = require('cors');
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


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
    // 
    const menuCollection = client.db("bistro_bossDB").collection("menu");
    const usersCollection = client.db("bistro_bossDB").collection("users");
    const cartsCollection = client.db("bistro_bossDB").collection("carts");
    const reviewsCollection = client.db("bistro_bossDB").collection("reviews");


    // create user and send data mongodb database
    app.post("/users",async(req,res)=>{
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    // menus item get from database
    app.get("/menus",async(req,res)=>{
      const result = await menuCollection.find().toArray();
      res.send(result);
    })

    // user reviews data get from database
    app.get("/reviews",async(req,res)=>{
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    })

    // get carts using email
    app.get("/carts",async (req,res)=>{
      const email = req.query.email;
      if(!email){
        res.send([])
      }else{
        const query = {email: email}
        const result = await cartsCollection.find(query).toArray();
        res.send(result)
      }
    })

    // menus carts added post data
    app.post("/carts",async(req,res)=>{
      const item = req.body;
      const result = await cartsCollection.insertOne(item)
      res.send(result)
    });

    app.delete("/carts/:id",async(req,res)=>{
      const id = req.params.id;
      const query ={_id : new ObjectId(id)}
      const result = await cartsCollection.deleteOne(query);
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
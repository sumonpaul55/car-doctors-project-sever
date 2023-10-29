const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require("cors");
const cookieParse = require("cookie-parser")
const app = express();
const jwt = require("jsonwebtoken")
require("dotenv").config();
const port = process.env.PORT || 5000;
// middleware

app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173',
    // preflightContinue: false,
    // optionsSuccessStatus: 204,
})
);
app.use(cookieParse());
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nrfwsc1.mongodb.net/?retryWrites=true&w=majority`;
// console.log(process.env.DB_PASS)
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// const logger = (req, res, next) => {
//     console.log("Calling", req.host, req.originalUrl);
//     next();
// }
// verify token functions 
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: "Un Authorized Access" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "unauthrized Access" })
        }
        res.user = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // auth and authentication related apis
        app.post("/jwt", (req, res) => {
            const user = req.body;
            // console.log(process.env.ACCESS_TOKEN)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "1h" })
            res.cookie("token", token, {
                httpOnly: true,
                secure: false,
                sameSite: "strict"
            }).send({ success: true })
        })

        // get all data from database
        const serviceCollection = client.db("cars-doctors").collection("services");
        const bookingsCollections = client.db("cars-doctors").collection("bookings");


        app.get("/services", async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })
        // get one data for checkout page
        app.get("/checkout/:id", async (req, res) => {
            console.log("from checkout", req.user)
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const options = {
                projection: { price: 1, title: 1, service_id: 1, img: 1 }
            }
            const result = await serviceCollection.findOne(query, options)
            res.send(result)
        })
        // getting data for booked page
        app.get("/bookings", verifyToken, async (req, res) => {
            // console.log(req.query.email)
            // console.log(res.user.email)
            if (res.user.email !== req.query.email) {
                return res.status(403).send({ message: "forbidden access" })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query?.email }
            }
            const result = await bookingsCollections.find(query).toArray();
            res.send(result)
            // console.log(req.cookies.token) //token is getting form clent side
        })
        // post method for bookings
        app.post("/bookings", async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollections.insertOne(booking)
            res.send(result)
        });
        // update booking data
        app.patch("/bookings/:id", async (req, res) => {
            const updatedData = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDocs = {
                $set: {
                    status: updatedData.status
                }
            }
            const result = await bookingsCollections.updateOne(filter, updateDocs)
            res.send(result)
        })
        // delete a bookings
        app.delete("/deleteBookings/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingsCollections.deleteOne(query)
            res.send(result)
        })
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



// app.get("/", (req, res) => {
//     res.send("My Server is running")
// })

app.listen(port, () => {
    console.log(`Car doctors Server is running in ${port}`)
})
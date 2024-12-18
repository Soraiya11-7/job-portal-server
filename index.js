require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5173',
          'https://job-portal-9aa1f.web.app',
          'https://job-portal-9aa1f.firebaseapp.com'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const logger = (req, res, next) => {
  // console.log('inside the logger');
  next();
}

const verifyToken = (req, res, next) => {
  // console.log('inside the verify Token');
  const token = req?.cookies?.token ;

  if(!token) {
    return res.status(401).send({message: 'Unauthorized Access'})
  }

jwt.verify(token, process.env.JWT_SECRET, (err,decoded) => {
  if(err){
    return res.status(401).send({message: 'Unauthorized Access'})
  }
  req.user = decoded;
  next();
})

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_SECRET_KEY}@cluster0.uoi62.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");

 //....................jobs related apis................
 const jobsCollection = client.db('job_portal').collection('jobs');
 const jobApplicationCollections = client.db('job_portal').collection('jobs_application');

 app.get('/jobs', async(req, res) =>{
    const cursor = jobsCollection.find();
    const result = await cursor.toArray();
    res.send(result);
 })

//token (Access, Refresh(NID))
//Auth related Apis 
app.post('/jwt', async(req,res) =>{
  const user = req.body;
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '10h' });

  res
  .cookie('token', token,{
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  })
  .send({success: true});

})

//logout
app.post('/logout', (req,res)=>{
  res
  .clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  })
  .send({success: true});

})

 //apply related............

app.get('/job-application', verifyToken, async(req,res) =>{
  const email = req.query.email;
  const query = {applicant_email: email};

  if(req.user.email !== req.query.email){
    return res.status(403).send({message: 'Forbidden Access'})
  }

  // console.log('cookies', req.cookies );
  const result = await jobApplicationCollections.find(query).toArray();
   
  //aggregate data
  for(const application of result ){
    const query2 = {_id: new ObjectId(application.job_id)}; //job er id
    const job = await jobsCollection.findOne(query2);
    if(job){
      application.title = job.title;
      application.company = job.company;
      application.location = job.location;
      application.company_logo = job.company_logo;
    }
  }
  
  res.send(result);
})

 app.post('/job-application', async(req,res) =>{
  const application = req.body;
  const result = await jobApplicationCollections.insertOne(application);
  res.send(result);

 })


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Job is falling from the sky');
});

app.listen(port, () => {
    console.log(`Job is waiting at : ${port}`);
})

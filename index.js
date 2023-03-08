const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')

let mongoose;
try {
  mongoose = require("mongoose");
  mongoose.connect(process.env.MONGO_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true
  });


} catch (e) {
  console.log(e);
}
const userSchema = new mongoose.Schema({
  username: String, 
  log: [{
    description: String, 
    duration: Number,
    date: String
  }]
});
const User = mongoose.model('User', userSchema)

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
  // console.log("==== POST req to /api/users ====")
  // console.log("User's name in the request: ", req.body.username)
  // find user
  User.findOne({ username: req.body.username })
    .then((foundUser) => {
      if (foundUser) {
        console.log("Found user: ", foundUser)
        res.json({
          username: foundUser.username,
          _id: foundUser._id
        })
      } else {
        // console.log("User ", req.body.username, " not found, let's add it")
        const user = new User({
          username: req.body.username
        });
        user.save().then(() => {
          // console.log("User ", req.body.username, " successfully saved!");
          User.findOne({ username: req.body.username })
            .then((justCreatedUser) => {
              // console.log("Found just created user: ", justCreatedUser)
              res.json({
                username: justCreatedUser.username,
                _id: justCreatedUser._id
              })
            })
            .catch((err) => {
              //When there are errors We handle them here
              console.log("There is an error while find just created user: ", err);
            });
        })
          .catch(err => console.log(err))
      }
    })
    .catch((err) => {
      //When there are errors We handle them here
      console.log(err);
    });
})

app.post('/api/users/:_id/exercises', (req, res) => {
  // console.log("==== POST req to /api/users/:_id/exercises ====")

  const body = JSON.parse(JSON.stringify(req.body))
  const params = JSON.parse(JSON.stringify(req.params))
  
  // console.log("Requested body is: ", body)
  // console.log("Requested params is: ", params)
  let id
  req.body[':_id'] == undefined ? id = params['_id'] : id = body[':_id']
  User.findOne({ _id: id })
    .then((foundUser) => {
      // console.log("User found by ID: ", foundUser)
      // console.log("Date field is: ", req.body.date)
      
      let result = {
        _id        : id, 
        username   : foundUser.username,
        date       : '',
        duration   : Number(body.duration),
        description: body.description   
      }
      let exerDate
      if (req.body.date == '' || req.body.date == undefined) {
        // console.log("Date in params is empty string or indefined")
        const timeElapsed = Date.now()
        // console.log("Time elapsed is: ", timeElapsed)
        exerDate = new Date(timeElapsed)
        
      } else {
        
        exerDate = new Date(req.body.date)
      }
      // console.log("exerDate is: ", exerDate)        
      result.date = exerDate.toDateString()
      // console.log("Saving to DB: ", result)
      foundUser.log.push({
        description: result.description,
        duration   : result.duration,
        date       : result.date,
      })
      foundUser.save().then(savedUser => {
        // console.log("User", savedUser, "successfuly saved!")
      })
      .catch((err) => {
        // When there are errors We handle them here
        console.log("There is an error while saving user: ", err);
      })
      // console.log("Sending to user (result): ", result)
      res.json(result)
    })
    .catch((err) => {
      //When there are errors We handle them here
      console.log(err);
    });
})

app.get('/api/users', (req, res) => {
  // console.log("====== a GET request ==========")
  User.find({})
    .then((docs) => {
      const listOfUsers = []
      docs.map(doc => {
        listOfUsers.push({
          username: doc.username,
          _id: doc._id
        })
      })
      // console.log("Docs found in a GET request: ", listOfUsers)
      res.json(listOfUsers)
    })
    .catch((err) => {
      //When there are errors We handle them here
      console.log("There is an error while requesting all users: ", err);
    });
});

app.get('/api/users/:_id/logs', (req, res) => {
  // console.log("==== a GET request to /api/users/:_id/logs ====")
  const params = JSON.parse(JSON.stringify(req.params))
  const id = params._id
  let { from, to, limit } = req.query
  // console.log("From, to and limit are: ", from, to, limit)
  // console.log("Requested id is: ", id)
  User.findOne({ _id: id })
    .then((foundUser) => {
      // console.log("Found user is: ", foundUser)
      const logArray = foundUser.log.map(element => {
        // console.log("From and to in the callback: ", from, to)
        const exerciseDate = new Date(element.date)
        // console.log("Date of exercise: ", exerciseDate)
        if (from) {
          const fromDate = new Date(from);
          // console.log("From date: ", fromDate);
          if (exerciseDate < fromDate) return null
        }
        if (to) {
          const toDate = new Date(to);
          // console.log("To date: ", toDate);
          if (exerciseDate > toDate) return null
        }    
        var mydate = new Date('2014-04-03');
        // console.log(mydate.toDateString());
        return {
          description: element.description,
          duration: element.duration,
          date: element.date
        }
      }).filter(element => element)
      const result = {
        username: foundUser.username,
        count: (limit ? logArray.slice(0, limit) : logArray).length,
        _id: foundUser._id,
        log: limit ? logArray.slice(0, limit) : logArray 
      }
      // console.log("Sending back to user: ", result)
      res.json(result)
    })
    .catch((err) => {
      //When there are errors We handle them here
      console.log(err);
    });
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

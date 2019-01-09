const express = require('express')
const ejs = require('ejs')
const bodyParser = require('body-parser')
const Sequelize = require('sequelize')
const multer = require('multer')
const plugs = require('./plugs.js')
const app = express()
const pg = require('pg')
const bcrypt = require('bcrypt');
require('dotenv').config();
const passport = require('passport')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const LocalStrategy = require('passport-local').Strategy
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const db = require('./server/config/db.js');
const env = require('./server/config/env');
const path = require('path');
const port = process.env.PORT || 3000
const morgan = require('morgan');





const Op = Sequelize.Op
// const sequelize = new Sequelize(process.env.DATABASE_URL);

const sequelize = new Sequelize(plugs.tableName, plugs.dialect, plugs.pw,{
   host: plugs.localhost,
   port: plugs.port,
   dialect: plugs.dialect,
   $and : Op.and,
   $or: Op.or,
   $eq: Op.eq,
   $like: Op.like
})




const Blog = sequelize.define('blog',
   {
      title: Sequelize.STRING,
      content: Sequelize.STRING,
      date: Sequelize.DATE
   }
)



const sessionStore = new SequelizeStore({
    db: sequelize
  });

sessionStore.sync();




app.use(require('morgan')('combined'));
app.set('view engine', 'ejs')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}))
app.use(express.static('public'))
app.use(express.static('public'))
app.use(cookieParser());
app.use(session({
    key: 'user_sid',
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: 600000
    }
}));

const User = db.sequelize.define('users', {
    username: {
        type: Sequelize.STRING
    },
    email: {
        type: Sequelize.STRING
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    }
}, {
    hooks: {
        beforeCreate: (user) => {
            const salt = bcrypt.genSaltSync();
            user.password = bcrypt.hashSync(user.password, salt);
        }
    },
});

User.prototype.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
}

let message=""


db.sequelize.sync()
    .then(() => console.log('users table has been successfully created, if one doesn\'t exist'))
    .catch(error => console.log('This error occured', error));

    app.use((req, res, next) => {
        if (req.cookies.user_sid && !req.session.user) {
            res.clearCookie('user_sid');
        }
        next();
    });

    // middleware function to check for logged-in users
    const sessionChecker = (req, res, next) => {
        if (req.session.user && req.cookies.user_sid) {
            res.redirect('/dashboard');
        } else {
            next();
        }
    };

    // User routes related to exprews-session
    // route for Home-Page
    // app.get('/', sessionChecker, (req, res) => {
    //     res.redirect('/login');
    // });
    app.get("/", (req, res)=>{
      res.render('portfolio')
    })
passport.serializeUser(function(user, done) {
		console.log("*********SerializeUser*********")
      //done(null, {id: user.id, user: user.username});
      done(null, user)
});
//convert id in cookie to user details
	passport.deserializeUser(function(obj,done){
		console.log("--deserializeUser--");
		console.log(obj)
			done(null, obj);
	})

  passport.use('local-signup', new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true
  }, processSignupCallback));

  function processSignupCallback(req, username, password, done) {
      // first search to see if a user exists in our system with that email
      User.findOne({
          where: {
              'username' :  username
  				}
      })
      .then((user)=> {
          if (user) {
              // user exists call done() passing null and false
              return done(null, false);
          } else {

  // create the new user
  			let newUser = req.body; // make this more secure
  			User.create(newUser)
  			.then((user)=>{
  			    //once user is created call done with the created user
  			   // createdRecord.password = undefined;
  			   console.log("Yay!!! User created")
  			   // console.log(user)
  			    return done(null, user);
  			})

  		}
  	})
  }

  passport.use('local-login', new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true
  }, processLoginCallback));
  function processLoginCallback(req, username, password, done) {
  // first search to see if a user exists in our system with that email
  User.findOne({
      where: {
          'username' :  username
      },
  })
  .then((user)=> {
      if (!user) {
          // user exists call done() passing null and false
          return done(null, false);
      }else if(password !== user.password){
          return done(null, false)
        }else{
       console.log("Yay!!! User is logged in")
       // console.log(user)
        return done(null, user);
      }
  })

}

// app.use(session({
//   secret: 'keyboard cat',
//   store: sessionStore,
//   resave: false,
//   saveUninitialized: false
// }));
//
// app.use(passport.initialize());
// app.use(passport.session());
//
// app.get('/', (req, res)=>{
// return res.render('home')
// })

app.get('/blogs', (req,res)=>{
  Blog.findAll({order: ['title']}).then((rows)=>{
    return rows;
  }).then((rows)=>{
    return res.render('blogs', {rows, message})
  })
})

app.get('/search', (req, res)=>{
    let s = req.query.search
    Blog.findAll({
        where:
        {
            title:
            {
                $iLike: `${s}`
            }
        }
    })
    .then(rows =>{
        if(rows == ""){
            return res.render('blogs', {rows, message: "Not found"})
        }
        return res.render('blogs', {rows, message})
    })
})

app.route('/signup')
    .get(sessionChecker, (req, res) => {
        res.sendFile('signup.html', {
            root: 'public'
        });
    })
    .post((req, res) => {
        User.create({
                username: req.body.username,
                email: req.body.email,
                password: req.body.password
            })
            .then(user => {
                req.session.user = user.dataValues;
                res.redirect('/dashboard');
            })
            .catch(error => {
                res.redirect('/signup');
            });
    });

app.post('/add', (req, res)=>{
  Blog.create({
    title: req.body.title,
    content: req.body.content,
    date: req.body.date
  }).then(()=>{
    return res.redirect('/blogs')
  })
})

app.post('/edit/:id', (req,res)=>{
  let id = req.params.id
  Blog.findById(id)
  .then(row =>{
    return row
  })
  .then(row =>{
    return res.render('add-blog', {row})
  })
})


app.post('/delete/:id', (req,res)=>{
  let id = req.params.id
  Blog.findById(id)
  .then(row=>row.destroy(row)
  )
  .then(()=>{
    return res.redirect('/blogs')
     })
  })
  app.route('/login')
      .get(sessionChecker, (req, res) => {
          res.sendFile('login.html', {
              root: 'public'
          });
      })
      .post((req, res) => {
          var username = req.body.username,
              password = req.body.password;

          User.findOne({
              where: {
                  username: username
              }
          }).then(function(user) {
              if (!user) {
                  res.redirect('/login');
              } else if (!user.validPassword(password)) {
                  res.redirect('/login');
              } else {
                  req.session.user = user.dataValues;
                  res.redirect('/dashboard');
              }
          });
      });

  // route for user's dashboard
  app.get('/dashboard', (req, res) => {
      if (req.session.user && req.cookies.user_sid) {
          res.sendFile('dashboard.html', {
              root: 'public'
          });
      } else {
          res.redirect('/login');
      }
  });

  // route for user logout
  app.get('/logout', (req, res) => {
      if (req.session.user && req.cookies.user_sid) {
          res.clearCookie('user_sid');
          res.redirect('/');
      } else {
          res.redirect('/login');
      }
  });

  // End Express/User related routes

  // start multer related (local)
  const storage = multer.diskStorage({
      destination: './public/uploads',
      filename: (req, file, cb) => {
          // fieldname is name="photo", - "154461".jpg. naming convention has to be unique.
          // Date.now() would be different for everyone.
          cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
      }
  })

  // upload process definition
  const upload = multer({
      storage: storage
  }).single('image');

  // end multer related

  // start image related
  // define Pic
  const Pic = db.sequelize.define('pic', {
      name: Sequelize.STRING,
      description: Sequelize.STRING,
      comment: Sequelize.STRING,
      image: Sequelize.STRING
  })

  // define UserComment
  const UserComment = db.sequelize.define('usercomment', {
      content: Sequelize.STRING,
      commentername: Sequelize.STRING
  })

  // associations
  UserComment.belongsTo(Pic, {
      onDelete: 'cascade',
      hooks: true
  });
  User.hasMany(Pic);

  // end associations

  // get all pic related data (including name and description)
  app.get('/jwmBlogs', (req, res) => {
      Pic.findAll({}).then(function(data) {
          console.log('SOMETHING**********');
          console.log(data);
          console.log('WHERE IS THE DATA **********');
          // console.log(data[0].dataValues.image);
          // UserComment.findAll().then(function(commentdata) {
          // console.log(commentdata[0].dataValues.content);
          console.log('THIS IS THE COMMENT DATA********' + data);
          return res.render('pages/jwmBlogs', {
                  data
                  // commentdata
              })
              // })
      })
  })

  // render single image page
  app.get('/single-image', (req, res) => {
      res.render('pages/single-image');
  })

  // edit single image data
  app.post('/single-image/:picId', (req, res) => {
      let id = req.params.picId;
      Pic.findById(id)
          .then(data => {
              return data
          })
          .then(data => {
              UserComment.findAll({
                      where: {
                          picId: id
                      }
                  })
                  .then((commentdata) => {
                      console.log('THIS IS THE COMMENT DATA!!!************' + commentdata[0].dataValues.content);
                      return res.render('pages/single-image', {
                          user: req.user,
                          commentdata,
                          data,
                          picId: req.params.picId
                      })
                  })
          })
  })

  // updates the single image data on single image page
  app.get('/update/:picId', (req, res) => {
      let id = req.params.id;
      Pic.findById(id)
          .then((data) => data.update({
              name: req.body.name,
              description: req.body.description,
              comment: req.body.comment,
              image: req.file.filename
          }))
      return res.redirect('/single-image');
  })

  // what is missing is adding multiple comments below
  // single pic on single-image page
  // right now under current configuration can't figure it out
  // render comment by picId
  app.get('/add-comment/:picId', (req, res) => {
      let id = req.params.picId;
      Pic.findById(id)
          .then((data) => {
              UserComment.findById(id)
                  .then(commentdata => {
                      console.log('THIS IS THE COMMENT DATA***********' + commentdata);
                      return commentdata
                  })
                  .then((commentdata) => res.render('pages/single-image', {
                      data,
                      commentdata
                  }))
          })
  })

  // find all usercomments
  app.get('/add-comment/:picId', (req, res) => {
      let id = req.params.picId;
      UserComment.findAll({
              where: {
                  picId: id
              }
          })
          .then((commentdata) => {
              if (commentdata != undefined) {
                  return res.render('pages/single-image', {
                      picId: req.params.picId,
                      commentdata
                  })
              } else {
                  return res.render('pages/single-image', {
                      picId: req.params.picId,
                      commentdata
                  })
              }
          })
  })

  // add comment to pic by picId
  app.post('/add-comment/:picId', (req, res) => {
      let id = req.params.picId;
      console.log('THIS IS THE ID NUMBER*********' + id);
      UserComment.create({
              picId: req.params.picId,
              content: req.body.content,
              commentername: req.body.commentername
          })
          .then(() => {
              UserComment.findAll({
                      where: {
                          picId: id
                      }
                  })
                  .then((commentdata) => {
                      console.log('THIS IS THE COMMENT DATA!!!************' + commentdata[0].dataValues.content);
                      return res.render('pages/single-image', {
                          user: req.user,
                          commentdata,
                          picId: req.params.picId
                      })
                  })
          })
  })

  // end problem area re usercomments

  //upload image route possible because of multer
  app.post('/upload', (req, res) => {
      let id = req.params.id;
      upload(req, res, (err) => {
          if (err) {
              console.log(err);
          }
          console.log(req.body);
          console.log(req.file);

          Pic.create({
                  picId: req.body.id,
                  name: req.body.name,
                  description: req.body.description,
                  comment: req.body.comment,
                  image: req.file.filename
              })
              .then(() => {
                  return res.redirect('/jwmBlogs')
              })
      })

  })

  // delete image post
  app.post('/delete/:id', (req, res) => {
      let id = req.params.id;
      Pic.findById(id)
          .then((data) => data.destroy({
              where: {
                  id: req.params.id
              }
          }))
          .then((data) => data.update({
              name: req.body.name,
              description: req.body.description
          }))
      return res.redirect('/jwmBlogs')
  })

  // render edit-upload page for image post with particular id
  app.get('/edit-upload/:id', (req, res) => {
      let id = req.params.id;
      Pic.findById(id)
          .then((data) => {
              return data
          })
          .then(data => res.render('pages/edit-upload', {
              data
          }))
  })

  // update (image) upload edit
  app.post('/update/:id', (req, res) => {
      let id = req.params.id;
      Pic.findById(id)
          .then((data) => {
              console.log('THIS IS MORE DATA********' + data);
              Pic.update({
                  name: req.body.name,
                  description: req.body.description,
                  comment: req.body.comment
              }, {
                  where: {
                      id: id
                  }
              }).then(() => {
                  res.redirect('/jwmBlogs')
              })

          })
  })

  // route for handling 404 requests(unavailable routes)
  app.use(function(req, res, next) {
      res.status(404).send("Sorry can't find that!")
  });

app.listen(port, ()=>
console.log("okay works")
)

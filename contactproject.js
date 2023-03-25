const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
let sql;
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//creating database
const db = new sqlite3.Database('./database.db',sqlite3.OPEN_READWRITE,(err)=>{
    if(err) return console.error(err.message);
})

//Creating table for sqlite
//sql = 'CREATE TABLE users(id INTEGER PRIMARY KEY,firstname,lastname,phonenumber,email,street,city,state,zip,country,contact_phone,contact_email,contact_mail)';
//db.run(sql);

//drop table
//db.run("DROP TABLE users")

//Insert data into table
/*sql = 'INSERT INTO users(firstname,lastname,phonenumber,email) VALUES (?,?,?,?)';
db.run(sql,
    ["John","lee","123","123@123"],
    (err)=>{
    if(err) return console.error(err.message);
})*/

//Able to use pug and view

app.set('view-engine','pug')
app.use(express.urlencoded({extended: true}))
app.use(session({
  secret: 'my secret key',
  resave: false,
  saveUninitialized: false
}));

//Routes for pages

//logout
app.get('/logout', (req, res) => {
    req.session.isAuthenticated = false;
    res.redirect('/');
  });

//home page
app.get('/', (req, res) => {
  db.all('SELECT * FROM users', (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.sendStatus(500);
    }
    res.render('home.pug', { account: rows,users: rows, isAuthenticated: req.session.isAuthenticated });
  });
});

//Login Page
app.get('/login',(req,res)=>{
  res.render('login.pug', { isAuthenticated: req.session.isAuthenticated });
})

app.post('/login', async(req,res)=>{
  const {username, password} = req.body;
  
  // Check if username exists
  db.get('SELECT * FROM account WHERE username = ?', username, async (err, row) => {
    if (err) {
      console.error(err.message);
      return res.sendStatus(500);
    }
    
    if (!row) {
      const error = 'Sorry, couldn`t log you in...';
      return res.render('login.pug', { isAuthenticated: req.session.isAuthenticated, error });
    }
    
    // Check if password matches
    const isPasswordValid = await bcrypt.compare(password, row.password);
    if (!isPasswordValid) {
      const error = 'Sorry, couldn`t log you in...';
      return res.render('login.pug', { isAuthenticated: req.session.isAuthenticated, error });
    }
    
    // Authentication successful, set session
    req.session.isAuthenticated = true;
    res.redirect('/');
  });
});

    //Signup page
app.get('/signup',(req,res)=>{
    res.render('signup.pug', {hide_login: true})
})

app.post('/signup', async(req,res)=>{
    try {
      const {username, password, password2} = req.body;
      
      // Check if passwords match
      if (password !== password2) {
        const error = 'Passwords do not match!';
        return res.render('signup.pug', { hide_login: true, error });
      }
      
      // Check if username already exists
      const userExists = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM account WHERE username = ?', username, (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(Boolean(row));
          }
        });
      });
      
      if (userExists) {
        const error = 'Username already exists!';
        return res.render('signup.pug', { hide_login: true, error });
      }
  
        sql = 'INSERT INTO account(fname,lname,username,password) VALUES (?,?,?,?)';
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        db.run(sql,
            [req.body.fname,req.body.lname,
            req.body.username,hashedPassword],
            (err)=>{
            if(err) return console.error(err.message);
            })
        
        res.redirect('/')

    } catch {
        res.redirect('/signup')
    }   
})

  // Create contacts page

app.get('/create',(req,res)=>{
    res.render('create.pug',{ isAuthenticated: req.session.isAuthenticated})
})

app.post('/create', async(req,res)=>{
    try{
        /*users.push({
            firstname: req.body.firstName,
            lastname: req.body.lastName,
            phoneNumber: req.body.phoneNumber,
            email: req.body.email
        })*/

        const contactphone = (req.body.contactByPhone !== undefined) ? 1: 0;
        const contactemail = (req.body.contactByEmail !== undefined) ? 1: 0;
        const contactmail = (req.body.contactByMail !== undefined) ? 1: 0;

        sql = 'INSERT INTO users(firstname,lastname,phonenumber,email,street,city,state,zip,country,contact_phone,contact_email,contact_mail) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
            db.run(sql,
            [req.body.firstName,req.body.lastName,
                req.body.phoneNumber,req.body.email,
                req.body.street,req.body.city, req.body.state,
                req.body.zip,req.body.country,
                contactphone,contactemail,contactmail],
            (err)=>{
            if(err) return console.error(err.message);
            })
        res.redirect('/')

    }   catch{
        res.redirect('/create')
    }
})

//contactinfo

app.get('/:id', (req, res) => {
  db.all('SELECT * FROM users WHERE id = ?', [req.params.id], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.sendStatus(500);
    }
    res.render('contactinfo.pug', { account: rows, users: rows, isAuthenticated: req.session.isAuthenticated, id: req.params.id });
  });
});

//deleting contact info

app.get('/:id/delete', (req, res) => {
  const id = req.params.id;
  
  // Check if user is authenticated
  if (!req.session.isAuthenticated) {
    return res.status(401).send("Not Authorized");
  }
  
  db.get('SELECT * FROM users WHERE id = ?', id, (err, row) => {
    if (err) {
      console.error(err.message);
      return res.sendStatus(500);
    }
    
    if (!row) {
      return res.sendStatus(404);
    }
    
    // Render delete confirmation page
    res.render('delete.pug', { users: row, isAuthenticated: req.session.isAuthenticated });
  });
});

app.post('/:id/delete', (req, res) => {
  const id = req.params.id;

  // Delete user from database
  db.run('DELETE FROM users WHERE id = ?', id, (err) => {
    if (err) {
      console.error(err.message);
      return res.sendStatus(500);
    }
    
    res.redirect('/');
  });
});


//Edit contact info

app.get('/:id/edit',(req,res) =>{
  const id = req.params.id;
  
  // Check if user is authenticated
  if (!req.session.isAuthenticated) {
    return res.status(401).send("Not Authorized");
  }
  
  db.get('SELECT * FROM users WHERE id = ?', id, (err, row) => {
    if (err) {
      console.error(err.message);
      return res.sendStatus(500);
    }
    
    if (!row) {
      return res.sendStatus(404);
    }
    
    // Render edit page
    res.render('editcontact.pug',{ users: row, isAuthenticated: req.session.isAuthenticated });
  });
});

app.post('/:id/edit', (req, res) => {
  const id = req.params.id;
  const {
    firstName,
    lastName,
    phoneNumber,
    email,
    street,
    city,
    state,
    zip,
    country,
    contactByPhone,
    contactByEmail,
    contactByMail
  } = req.body;

  console.log(firstName);

  // Update the user data in the database
  const sql = 'UPDATE users SET firstname = ?, lastname = ?, phonenumber = ?, email = ?, street = ?, city = ?, state = ?, zip = ?, country = ?, contact_phone = ?, contact_email = ?, contact_mail = ? WHERE id = ?';
  const contactphone = (contactByPhone !== undefined) ? 1 : 0;
  const contactemail = (contactByEmail !== undefined) ? 1 : 0;
  const contactmail = (contactByMail !== undefined) ? 1 : 0;

  db.run(sql,
    [firstName, lastName, phoneNumber, email, street, city, state, zip, country, contactphone, contactemail, contactmail, id],
    (err) => {
      if (err) {
        console.error(err.message);
        return res.sendStatus(500);
      }
      res.redirect(`/${id}`);
    });
});


app.listen(3000)
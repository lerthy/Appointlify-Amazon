const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587, // or 465 for SSL
  secure: false, // true for 465, false for 587
  auth: {
    user: 'lerdi890@gmail.com',
    pass: 'pqof wgxz bfpn lxeh' // <-- Replace with your actual Gmail App Password
  }
});

transporter.sendMail({
  from: 'lerdi890@gmail.com',
  to: 'lerdi890@gmail.com',
  subject: 'SMTP Test',
  text: 'If you see this, SMTP works!'
}, (err, info) => {
  if (err) {
    console.error('SMTP ERROR:', err);
  } else {
    console.log('Success:', info);
  }
});

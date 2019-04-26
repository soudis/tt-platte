const nodemailer = require('nodemailer');
const Promise = require('bluebird');

const render = (res, view, parameters) => {
  return new Promise((resolve, reject) => {
    res.render(view, parameters, (err, html) => {
      if (err) {
        reject(err);
      } else {
        resolve(html);
      }
    }); 
  })  
}
/**
 * GET /contact
 * Contact form.
 */
exports.getContact = (req, res) => {
  const unknownUser = !(req.user);

  render(res, "contact", {unknownUser})
    .then(contact => res.send({html: contact}))
    .catch(error => sendError(res, error));
};

/**
 * POST /contact
 * Send a contact form via Nodemailer.
 */
exports.postContact = (req, res) => {
  let fromName;
  let fromEmail;
  if (!req.user) {
    req.assert('name', 'Name cannot be blank').notEmpty();
    req.assert('email', 'Email is not valid').isEmail();
  }
  req.assert('message', 'Message cannot be blank').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/contact');
  }

  if (!req.user) {
    fromName = req.body.name;
    fromEmail = req.body.email;
  } else {
    fromName = req.user.profile.name || '';
    fromEmail = req.user.email;
  }

  let transporter = nodemailer.createTransport({
    service: 'SendGrid',
    auth: {
      user: process.env.SENDGRID_USER,
      pass: process.env.SENDGRID_PASSWORD
    }
  });
  const mailOptions = {
    to: 'florian.humer@gmail.com',
    from: `${fromName} <${fromEmail}>`,
    subject: 'Anfrage | TT-Platte',
    text: req.body.message
  };

  return transporter.sendMail(mailOptions)
    .then(() => render(res, "partials/message", {message: "E-Mail wurde versandt"}))
    .then(html =>  res.send({html:html}))
    .catch((err) => {
      if (err.message === 'self signed certificate in certificate chain') {
        console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate. Use a valid certificate if in production.');
        transporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: process.env.SENDGRID_USER,
            pass: process.env.SENDGRID_PASSWORD
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        return transporter.sendMail(mailOptions);
      }
      console.log('ERROR: Could not send contact email after security downgrade.\n', err);
      req.flash('errors', { msg: 'Error sending the message. Please try again shortly.' });
      return false;
    })
    .then((result) => {
      if (result) {
        return render(res, "partials/message", {message: "E-Mail wurde versandt"})
          .then(html =>  res.send({html:html}))
      }
    })
    .catch((err) => {
      console.log('ERROR: Could not send contact email.\n', err);
      req.flash('errors', { msg: 'Error sending the message. Please try again shortly.' });
      return res.redirect('/contact');
    });
};

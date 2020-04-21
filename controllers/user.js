const { promisify } = require('util');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const _ = require('lodash');
const User = require('../models/User');

const randomBytesAsync = promisify(crypto.randomBytes);
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


const sendError = (res, error) => {
  console.log("ERROR: " + error);
  res.status(500).send(error);
}

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render("account/login", {title: "Login"});
};

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
  res.render("account/profile", {title: "Profil"});
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render("account/forgot", {title: "Passwort vergessen"});
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
  req.assert('email', 'E-Mailadresse nicht gültig').isEmail();
  req.assert('password', 'Das Passwort darf nicht leer sein').notEmpty();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/login');
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('errors', info);
      return res.redirect('/login');
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Du bist jetzt eingeloggt, ' + user.email + '!' });
      res.redirect('/');
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
  req.logout();
  req.session.destroy((err) => {
    if (err) console.log('Error : Failed to destroy the session during logout.', err);
    req.user = null;
    res.redirect('/');
  });
};

/**
 * GET /signup
 * Signup page.
 */
exports.getInvite= (req, res) => {
  if (!req.user) {
    return res.redirect('/');
  }
  res.render("account/invite", {title: "Benutzer*in Einladen"});
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postInvite = (req, res, next) => {
  req.assert('email', 'E-Mailadresse ist nicht gültig.').isEmail();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/invite');
  }


  const checkAndCreateUser = preliminaryPassword => 
	User.findOne({ email: req.body.email })
		.then(existingUser => {
			if (existingUser) {
				return existingUser;
			} else {
				const user = new User({
				    email: req.body.email,
				    password: preliminaryPassword
				});					
				return user.save();
			}
		})
  

  const createRandomToken = () => {
  	  return randomBytesAsync(16)
    	.then(buf => buf.toString('hex'))
    };

  const setRandomToken = token =>
    User
      .findOne({ email: req.body.email })
      .then((user) => {
      	    console.log("token: " + JSON.stringify(token));
	      	user.passwordResetToken = token;
	      	user.passwordResetExpires = Date.now() + 3600000; // 1 hour
	      	return user.save();
      });

  const sendSetPasswordEmail = (user) => {
    const token = user.passwordResetToken;
    let transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
    const mailOptions = {
      to: user.email,
      from: 'no-reply@tt-platte.org',
      subject: 'Erstelle einen Account auf tt-platte.org',
      text: 
`Du wurdest eingeladen einen Account auf tt-platte.org zu erstellen.\n\n
Bitte klicke auf den folgenden Link und setze dein Passwort:\n\n
http://${req.headers.host}/signup/${token}\n`
    };
    return transporter.sendMail(mailOptions)
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
          return transporter.sendMail(mailOptions)
        }
       throw 'E-Mail konnte nicht versandt werden';
        return err;
      });
  };

  createRandomToken()
  	.then(checkAndCreateUser)
  	.then(createRandomToken)
    .then(setRandomToken)
    .then(sendSetPasswordEmail)
    .then(() => {
        req.flash('success', { msg: `Eine E-mail mit einem Link wurde an ${req.body.email} versandt.` });
	    res.redirect('/');
    })
    .catch(error => {
    	req.flash('errors', { msg: error});
    	res.redirect('/invite');
    });
}  

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup= (req, res) => {

  User
    .findOne({ passwordResetToken: req.params.token })
    .where('passwordResetExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        req.flash('errors', { msg: 'Der Link zum Setzen des Passworts ist abgelaufen.' });
        return res.redirect('/');
      }
      res.render('account/signup', {
        title: 'Account Erstellen',
        user: user
      });
    });

};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = (req, res, next) => {
  req.assert('password', 'Passwort muss mindestes 4 Zeichen lang sein').len(4);
  req.assert('confirmPassword', 'Passwörter stimmen nicht überein').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/');
  }

  User.findOne({ email: req.body.email }, (err, existingUser) => {
    if (err) { return next(err); }
    if (!existingUser) {
      req.flash('errors', { msg: 'Für diese E-Mailadresse es keinen Account.' });
      return res.redirect('/');
    }
    existingUser.password = req.body.password;
    existingUser.save((err) => {
      if (err) { return next(err); }
      req.logIn(existingUser, (err) => {
        if (err) {
          return next(err);
        }
        req.flash('success', {msg: 'Account erstellt'});
        res.redirect('/');
      });
    });
  });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
  req.assert('email', 'Bitte eine gültige E-Mailadresse angeben.').isEmail();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.email = req.body.email || '';
    user.profile.name = req.body.name || '';
    user.profile.gender = req.body.gender || '';
    user.profile.location = req.body.location || '';
    user.profile.website = req.body.website || '';
    user.save((err) => {
      if (err) {
        if (err.code === 11000) {
          req.flash('errors', { msg: 'Für diese E-Mailadresse gibt es bereits einen Account.' });
          return res.redirect('/account');
        }
        return next(err);
      }
      req.flash('success', { msg: 'Accountinformation wurde geändert.' });
      res.redirect('/');
    });
  });
};

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
  req.assert('password', 'Das Passwort muss mindestens 4 Zeichen lang sein.').len(4);
  req.assert('confirmPassword', 'Die Passwörter stimmen nicht überein.').equals(req.body.password);  

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.password = req.body.password;
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Passwort wurde geändert' });
      res.redirect('/');
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
  User.deleteOne({ _id: req.user.id }, (err) => {
    if (err) { return next(err); }
    req.logout();
    req.flash('info', { msg: 'Dein Account wurde gelöscht.' });
    res.redirect('/');
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = (req, res, next) => {
  const { provider } = req.params;
  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user[provider.toLowerCase()] = undefined;
    const tokensWithoutProviderToUnlink = user.tokens.filter(token =>
      token.kind !== provider.toLowerCase());
    // Some auth providers do not provide an email address in the user profile.
    // As a result, we need to verify that unlinking the provider is safe by ensuring
    // that another login method exists.
    if (
      !(user.email && user.password)
      && tokensWithoutProviderToUnlink.length === 0
    ) {
      req.flash('errors', {
        msg: `The ${_.startCase(_.toLower(provider))} account cannot be unlinked without another form of login enabled.`
          + ' Please link another account or add an email address and password.'
      });
      return res.redirect('/account');
    }
    user.tokens = tokensWithoutProviderToUnlink;
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('info', { msg: `${_.startCase(_.toLower(provider))} account has been unlinked.` });
      res.redirect('/account');
    });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  User
    .findOne({ passwordResetToken: req.params.token })
    .where('passwordResetExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        req.flash('errors', { msg: 'Der Link zum Zurücksetzen des Passworts ist abgelaufen.' });
        return res.redirect('/forgot');
      }
      res.render('account/reset', {
        title: 'Passwort Zurücksetzen'
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
  req.assert('password', 'Das Passwort muss mindestens 4 Zeichen lang sein.').len(4);
  req.assert('confirm', 'Die Passwörter stimmen nicht überein.').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  const resetPassword = () =>
    User
      .findOne({ passwordResetToken: req.params.token })
      .where('passwordResetExpires').gt(Date.now())
      .then((user) => {
        if (!user) {
          req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
          return res.redirect('back');
        }
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        return user.save().then(() => new Promise((resolve, reject) => {
          req.logIn(user, (err) => {
            if (err) { return reject(err); }
            resolve(user);
          });
        }));
      });

  const sendResetPasswordEmail = (user) => {
    if (!user) { return; }
    let transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
    const mailOptions = {
      to: user.email,
      from: 'no-reply@tt-platte.org',
      subject: 'Dein Passwort auf TT-Platte wurde geändert',
      text: `Hi,\n\nDein Passwort für den Account ${user.email} auf tt-platte.org wurde geändert.\n`
    };
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('success', { msg: 'Dein Passwort wurde geändert.' });
      })
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
          return transporter.sendMail(mailOptions)
            .then(() => {
              req.flash('success', { msg: 'Dein Passwort wurde geändert.' });
            });
        }
        console.log('ERROR: Could not send password reset confirmation email after security downgrade.\n', err);
        req.flash('warning', { msg: 'Your password has been changed, however we were unable to send you a confirmation email. We will be looking into it shortly.' });
        return err;
      });
  };

  resetPassword()
    .then(sendResetPasswordEmail)
    .then(() => {
      res.redirect('/');      
    })
    .catch(err => next(err));
};


/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = (req, res, next) => {
  req.assert('email', 'E-Mailadresse ist nicht gültig.').isEmail();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/forgot');
  }

  const createRandomToken = randomBytesAsync(16)
    .then(buf => buf.toString('hex'));

  const setRandomToken = token =>
    User
      .findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash('errors', { msg: 'Ein Account mit dieser E-Mailadresse existiert nicht' });
        } else {
          user.passwordResetToken = token;
          user.passwordResetExpires = Date.now() + 3600000; // 1 hour
          user = user.save();
        }
        return user;
      });

  const sendForgotPasswordEmail = (user) => {
    if (!user) { return; }
    const token = user.passwordResetToken;
    let transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
    const mailOptions = {
      to: user.email,
      from: 'no-reply@tt-platte.org',
      subject: 'Passwort für TT-Platte zurücksetzen',
      text: `Du bekommst diese E-Mail weil du dein Passwort auf tt-platte.org zurückgesetzt hast.\n\n
Bitte klicke auf den folgenden Link und folge den Anweisungen:\n\n
http://${req.headers.host}/reset/${token}\n\n
Falls du dein Passwort nicht zurücksetzen willst, ignoriere diese Nachricht.\n`
    };
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('success', { msg: `Eine E-mail mit einem Link wurde an ${user.email} versandt.` });
      })
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
          return transporter.sendMail(mailOptions)
            .then(() => {
              req.flash('success', { msg: `Eine E-mail mit einem Link wurde an ${user.email} versandt.` });
            });
        }
        console.log('ERROR: Could not send forgot password email after security downgrade.\n', err);
        req.flash('errors', { msg: 'E-Mail konnte nicht versandt werden' });
        return err;
      });
  };

  createRandomToken
    .then(setRandomToken)
    .then(sendForgotPasswordEmail)
    .then(() => {
      req.flash('success', { msg: 'Passwort zurückgesetzt' });
      res.redirect('/');
    })
    .catch(next);
};

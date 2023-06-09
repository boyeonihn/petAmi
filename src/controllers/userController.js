import { User } from '../models/User';
import { Video } from '../models/Video';
import bcrypt from 'bcrypt';

export const getJoin = (req, res) =>
  res.render('users/join', { pageTitle: 'Join' });

export const postJoin = async (req, res) => {
  const { email, name, password, location, passwordConfirm, pet } = req.body;
  const emailExists = await User.exists({ email });
  const pageTitle = 'Join';
  if (emailExists) {
    return res.status(400).render('join', {
      pageTitle,
      errorMessage: 'This email is already taken.',
    });
  } else if (password !== passwordConfirm) {
    return res.status(400).render('users/join', {
      pageTitle,
      errorMessage: 'Passwords do not match. Please retype your password.',
    });
  }
  try {
    await User.create({
      email,
      password,
      location,
      name,
      pet,
    });
    req.flash('info', 'Account created!');
    return res.redirect('/login');
  } catch (error) {
    const errorMsg = error._message;
    return res.status(400).render('users/join', {
      pageTitle,
      errorMessage: errorMsg,
    });
  }
};

export const getEdit = (req, res) => {
  res.render('users/edit-profile', { pageTitle: 'Edit Profile' });
};
export const postEdit = async (req, res) => {
  const {
    session: {
      user: { _id, email: userEmail, avatarUrl },
    },
    body: { name, email, location },
    file,
  } = req;

  const exists = await User.exists({ email });

  if (userEmail !== email && exists) {
    return res.status(400).render('users/edit-profile', {
      pageTitle: 'Edit Profile',
      errorMessage: `Sorry, an account with that email already exists`,
    });
  }
  const updatedUser = await User.findByIdAndUpdate(
    _id,
    { email, name, location, avatarUrl: file ? file.location : avatarUrl },
    { new: true }
  );
  req.session.user = updatedUser;
  req.flash('info', 'Profile Change Saved');
  res.redirect('/users/edit');
};

export const remove = (req, res) => res.send('Delete User');
export const getLogin = (req, res) =>
  res.render('users/login', { pageTitle: 'Login' });

export const postLogin = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  const pageTitle = 'Login';

  if (!user) {
    return res.status(400).render('users/login', {
      pageTitle,
      errorMessage: 'An account with this username does not exist',
    });
  }

  if (user.socialOnly) {
    return res.status(400).render('users/login', {
      pageTitle,
      errorMessage: 'Please login with your OAuth',
    });
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(400).render('users/login', {
      pageTitle,
      errorMessage: 'Incorrect password.',
    });
  }
  req.session.loggedIn = true;
  req.session.user = user;
  req.flash('info', 'Logged In');
  return res.redirect('/');
};

export const logout = (req, res) => {
  req.session.destroy();
  res.clearCookie('connect.sid', { path: '/' });
  return res.redirect('/');
};

export const startGithubLogin = (req, res) => {
  const baseUrl = `https://github.com/login/oauth/authorize`;
  const config = {
    client_id: process.env.GH_CLIENT,
    allow_signup: false,
    scope: 'read:user user:email',
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;

  return res.redirect(finalUrl);
};

export const finishGithubLogin = async (req, res) => {
  const baseUrl = 'https://github.com/login/oauth/access_token';
  const config = {
    client_id: process.env.GH_CLIENT,
    client_secret: process.env.GH_SECRET,
    code: req.query.code,
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;

  const tokenRequest = await (
    await fetch(finalUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
    })
  ).json();

  //above code same as this
  // const data = await fetch(finalUrl, {
  //   method: 'POST',
  //   headers: {
  //     Accept: 'application/json',
  //   },
  // })
  // const json = await data.json();
  // if using this commented out code besure to make sure you're using
  //correct variable name for 'tokenRequest' when making the below fetch request

  if ('access_token' in tokenRequest) {
    // access api
    const { access_token } = tokenRequest;
    const apiUrl = 'https://api.github.com';
    const userData = await (
      await fetch(`${apiUrl}/user`, {
        method: 'GET',
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();

    const emailData = await (
      await fetch(`${apiUrl}/user/emails`, {
        method: 'GET',
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();

    const emailObject = emailData.find(
      (email) => email.primary === true && email.verified === true
    );
    if (!emailObject) {
      req.flash('error', 'No verified Github Email');
      return res.redirect('/login');
    }

    let user = await User.findOne({ email: emailObject.email });
    if (!user) {
      user = await User.create({
        email: emailObject.email,
        avatarUrl: userData.avatar_url,
        password: '',
        location: userData.location,
        name: userData.name,
        socialOnly: true,
      });
    }
    req.session.loggedIn = true;
    req.session.user = user;

    req.flash('info', 'Github Token Account Created');
    return res.redirect('/');
  } else {
    req.flash('error', 'Github Login Unsuccessful');
    return res.redirect('/login');
  }
};

export const getChangePw = (req, res) => {
  if (req.session.user.socialOnly) {
    req.flash(
      'error',
      `Can't change password - you're using a social account to login`
    );
    return res.redirect('/');
  }
  return res.render('users/change-password', {
    pageTitle: 'Change Password',
  });
};

export const postChangePw = async (req, res) => {
  const pageTitle = 'Change Password';
  const {
    session: {
      user: { _id },
    },
    body: { newPw, confirmPw, oldPw },
  } = req;

  const user = await User.findById(_id);
  const ok = await bcrypt.compare(oldPw, user.password);
  if (!ok) {
    return res.status(400).render('users/change-password', {
      pageTitle,
      errorMessage: 'The old password you entered is incorrect.',
    });
  } else if (newPw !== confirmPw) {
    return res.status(400).render('users/change-password', {
      pageTitle,
      errorMessage: 'The new passwords do not match.',
    });
  }
  user.password = newPw;
  await user.save();
  req.flash('info', 'Password updated');
  return res.redirect('/logout');
};

export const getProfile = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id)
    .populate({
      path: 'videos',
      populate: {
        path: 'owner',
        model: 'User',
      },
    })
    .populate({
      path: 'posts',
      populate: {
        path: 'owner',
        model: 'User',
      },
    });

  if (!user) {
    return res.status(404).render('404', { pageTitle: 'Not Found' });
  }
  return res.render('users/profile', {
    pageTitle: `${user.name}'s Profile`,
    user,
  });
};

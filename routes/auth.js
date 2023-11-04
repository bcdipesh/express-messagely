/** Authentication route for message.ly */

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const ExpressError = require("../expressError");
const { SECRET_KEY } = require("../config");

/** POST /login - login: {username, password} => {token}
 *
 **/
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new ExpressError("Both Username and Password is required.", 400);
    }

    const isAuthenticated = await User.authenticate(username, password);

    if (!isAuthenticated) {
      throw new ExpressError("Username or Password incorrect.", 400);
    }

    await User.updateLoginTimestamp(username);
    let token = jwt.sign({ username }, SECRET_KEY);

    return res.json({ token });
  } catch (err) {
    next(err);
  }
});

/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 */
router.post("/register", async (req, res, next) => {
  try {
    if (
      !req.body.username ||
      !req.body.password ||
      !req.body.first_name ||
      !req.body.last_name ||
      !req.body.phone
    ) {
      throw new ExpressError(
        "Username, Password, First Name, Last Name and Phone number are required.",
        400
      );
    }

    const { username } = await User.register(req.body);
    await User.updateLoginTimestamp(username);
    let token = jwt.sign({ username }, SECRET_KEY);

    return res.status(201).json({ token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

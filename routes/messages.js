/** Message route for message.ly */

const express = require("express");
const router = express.Router();
const { ensureLoggedIn } = require("../middleware/auth");
const Message = require("../models/message");
const ExpressError = require("../expressError");

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 *
 **/
router.get("/:id", ensureLoggedIn, async (req, res, next) => {
  try {
    const message = await Message.get(req.params.id);

    if (
      req.user.username === message.from_user.username ||
      req.user.username === message.to_user.username
    ) {
      return res.json(message);
    }

    throw new ExpressError("Unauthorized.", 401);
  } catch (err) {
    next(err);
  }
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post("/", ensureLoggedIn, async (req, res, next) => {
  try {
    const { to_username, body } = req.body;

    if (!to_username || !body) {
      throw new ExpressError("Both Username and Password is required.", 400);
    }

    const message = await Message.create({
      from_username: req.user.username,
      to_username,
      body,
    });

    return res.json(message);
  } catch (err) {
    next(err);
  }
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 *
 **/
router.post("/:id/read", ensureLoggedIn, async (req, res, next) => {
  try {
    const message = await Message.get(req.params.id);

    if (message.to_user.username === req.user.username) {
      await Message.markRead(req.params.id);

      return res.status(200);
    }

    throw new ExpressError("Unauthorized.", 401);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

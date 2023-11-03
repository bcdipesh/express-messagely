/** User class for message.ly */

const db = require("../db");
const bcrypt = require("bcrypt");
const ExpressError = require("../expressError");
const { BCRYPT_WORK_FACTOR } = require("../config");

/** User of the site. */

class User {
  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const user = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, NULL)
      RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPassword, first_name, last_name, phone]
    );

    return {
      username: user.rows[0].username,
      password: user.rows[0].password,
      first_name: user.rows[0].first_name,
      last_name: user.rows[0].last_name,
      phone: user.rows[0].phone,
    };
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const user = await db.query(
      `SELECT *
      FROM users
      WHERE username = $1`,
      [username]
    );

    if (user.rowCount === 0) {
      return false;
    }

    return await bcrypt.compare(password, user.rows[0].password);
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const user = await User.get(username);

    await db.query(
      `UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP(0) AT TIME ZONE 'UTC'
      WHERE username = $1`,
      [user.username]
    );
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const users = await db.query(
      `SELECT username, first_name, last_name, phone
      FROM user`
    );

    return users.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const user = await db.query(
      `SELECT *
      FROM users
      WHERE username = $1`,
      [username]
    );

    if (user.rowCount === 0) {
      throw new ExpressError("User cannot be found", 404);
    }

    const { username, first_name, last_name, phone, join_at, last_login_at } =
      user.rows[0];

    return { username, first_name, last_name, phone, join_at, last_login_at };
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const user = await User.get(username);
    const messages = await db.query(
      `SELECT id, to_username, body, sent_at, read_at
      FROM messages
      WHERE from_username = $1`,
      [user.username]
    );

    const result = messages.rows.map(async (message) => {
      const { id, to_username, body, sent_at, read_at } = message;
      const { username, first_name, last_name, phone } = await User.get(
        to_username
      );

      return {
        id,
        to_user: {
          username,
          first_name,
          last_name,
          phone,
        },
        body,
        sent_at,
        read_at,
      };
    });

    return result;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const user = await User.get(username);
    const messages = await db.query(
      `SELECT id, from_username, body, sent_at, read_at
      FROM messages
      WHERE to_username = $1`,
      [user.username]
    );

    const result = messages.rows.map(async (message) => {
      const { id, from_username, body, sent_at, read_at } = message;
      const { username, first_name, last_name, phone } = await User.get(
        from_username
      );

      return {
        id,
        from_user: {
          username,
          first_name,
          last_name,
          phone,
        },
        body,
        sent_at,
        read_at,
      };
    });

    return result;
  }
}

module.exports = User;

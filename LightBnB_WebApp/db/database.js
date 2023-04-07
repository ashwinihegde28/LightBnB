const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require("pg");

//create a new pool for the database
const pool = new Pool({
  user: "labber",
  password: "labber",
  host: "localhost",
  database: "lightbnb",
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email_id) {
  const email = email_id.toLowerCase();
  let querString = `SELECT * 
  FROM users
  WHERE users.email = $1`;
  //query from database
  return pool
    .query(querString, [email]) // case insensitive
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  let querString = `SELECT * 
  FROM users
  WHERE users.id = $1`;
  //query from the database
  return pool
    .query(querString, [id])
    .then((result) => {
      return result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  //Query used RETURNING id instead of to get the id.
  let querString = `INSERT INTO 
  users(name, email, password)
  VALUES($1, $2, $3) RETURNING *;`;
  const values = [user.name, user.email, user.password];
  //query from database
  return (
    pool
      .query(querString, values)
      //On success return the user
      .then((result) => {
        return result.rows[0];
      })
      .catch((err) => {
        console.log(err.message);
      })
  );
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */

// need Work
const getAllReservations = function (guest_id, limit = 10) {
  queryString = `SELECT properties.*, reservations.*, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id  
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2 | 10;`;

  values = [guest_id, limit];
  return pool
    .query(queryString, values)
    .then((res) => {
      return res.rows;
    })
    .catch((err) => {
      console.log("getAllReservations Error", err);
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function (options, limit = 10) {
  // 1
  const queryParams = [];
  const wheres = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // 3a search with city name
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }

  //3b search with owner id
  if (options.owner_id) {
    queryParams.push(`%${options.owner_id}%`);

    //If where clause not present
    if (queryString.includes("WHERE")) {
      queryString += `AND owner_id = $${queryParams.length} `;
    }
    // If owner id is the second parameter
    else {
      queryString += `WHERE owner_id = $${queryParams.length} `;
    }
  }
  //3c If a minimum_price_per_night and a maximum_price_per_night, only return properties within that price range.
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    queryParams.push(
      //convert dollars to cents.
      options.minimum_price_per_night * 100,
      options.maximum_price_per_night * 100
    );
    //If where clause not present
    if (queryString.includes("WHERE")) {
      // min value
      queryString += `AND cost_per_night >= $${
        queryParams.length - 1
      } AND cost_per_night <= $${queryParams.length}`;
    }
    // If where clause present in the query string
    else {
      queryString += `WHERE cost_per_night >= $${
        queryParams.length - 1
      } AND cost_per_night <= $${queryParams.length}`;
    }
  }
  // 3d minimum_rating
  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);

    //If where clause not present
    if (queryString.includes("WHERE")) {
      queryString += `AND rating  >= $${queryParams.length} `;
    }
    // If where clause present
    else {
      queryString += `WHERE rating  >= $${queryParams.length} `;
    }
  }

  // 4 query post where clause
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // 5
  console.log(queryString, queryParams);

  // 6
  return pool
    .query(queryString, queryParams)
    .then((res) => res.rows)
    .catch((err) => {
      return console.log("query error:", err);
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const queryString = `
    INSERT INTO properties (
    owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, parking_spaces, number_of_bathrooms, number_of_bedrooms, country, street,city, province, post_code) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;`;

  const values = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms,
    property.country,
    property.street,
    property.city,
    property.province,
    property.post_code,
  ];

  return pool
    .query(queryString, values)
    .then((res) => {
      return res.rows[0];
    })
    .catch((err) => {
      return console.log("query error:", err);
    });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};

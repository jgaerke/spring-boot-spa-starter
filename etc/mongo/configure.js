
db.createUser(
    {
      user: "sa",
      pwd: "piemaster",
      roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
    }
);
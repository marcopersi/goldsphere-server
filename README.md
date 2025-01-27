# goldsphere-server
The server including the business logic and integration for the goldsphere project

## Run goldsphere server
To run the goldsphere (express.js) server, you will need a postgres database. However, it is suggested to run the docker-compose file with either

```bash
docker compose up -d 
```

or even better just the postgres service for the moment

```bash
docker compose up -d postgres
```

### Initialize database
Once you have your postgres instance up & running, you might want to ensure that the DDL(data definition language) script was executed, so the required database table are available in your postgres database. 

You may do that by either have a looking using pgadmin. You may add and run pgadmin using docker compose to:

```bash 
docker compose up -d pgadmin
```

or whatever the current schema looks like, you ensure to initialize the database schema with running 

```bash
 psql -h localhost -U postgres -d goldsphere -f ddl/schema.sql -u user 
```

### Testing endpoints

Some CURL requests to test the endpoints:

```bash
curl -X GET http://localhost:11215/api/issuing-countries

curl -X GET http://localhost:11215/api/metals

curl -X GET http://localhost:11215/api/products

curl -X GET http://localhost:11215/api/test

curl -X GET http://localhost:11215/api/product-types


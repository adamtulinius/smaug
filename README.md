# Smaug

[![Build Status](https://travis-ci.org/DBCDK/smaug.svg?branch=master)](https://travis-ci.org/DBCDK/smaug)

Smaug is a system for granting OAuth2 access tokens, and mapping them to JSON-formatted configuration objects.


## OAuth2

### Supported grant types

* Client Credentials


### Requesting an access token

`curl something something`


## Configuration

Get: `curl http://$smaugLocation/configuration?token=...`


## Getting up and running

1. `git clone ...`
2. `npm install`
3. `node src/main.js -f config.json`


## Example requests

### Admin

#### clients

```
# list clients
curl --user admin:password -X GET -H "Content-Type: application/json" http://localhost:$PORT_ADMIN/clients
[
  {
    "name": "duckDevLTD",
    "id": "c0ba685e-2130-4e24-b4e9-4a903fe71ada"
  }
]
```

```
# create client with name=foo
curl --user admin:password -X POST -H "Content-Type: application/json" http://localhost:$PORT_ADMIN/clients -d '{"name": "foo"}'
{
  "name": "foo",
  "id": "b0819839-6bbf-4218-9895-2ddde8e0d32a"
}
```

```
# get client
curl --user admin:password -X GET http://localhost:$PORT_ADMIN/clients/b0819839-6bbf-4218-9895-2ddde8e0d32a
{
  "name": "foo",
  "id": "b0819839-6bbf-4218-9895-2ddde8e0d32a"
}
```

```
# update client
curl --user admin:password -X PUT -H "Content-Type: application/json" http://localhost:$PORT_ADMIN/clients/b0819839-6bbf-4218-9895-2ddde8e0d32a -d '{"name": "bar"}'
{
  "name": "bar",
  "id": "b0819839-6bbf-4218-9895-2ddde8e0d32a"
}
```

```
# delete client
curl --user admin:password -X DELETE http://localhost:$PORT_ADMIN/clients/b0819839-6bbf-4218-9895-2ddde8e0d32a
{}
```

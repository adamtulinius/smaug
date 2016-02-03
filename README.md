# openserviceprovider
Application that exposes the serviceProvider as a socket service


# OAuth2
Openserviceprovider uses OAuth2 as its authorization framework. A quick introduction to OAuth2 can be found [here](https://www.digitalocean.com/community/tutorials/an-introduction-to-oauth-2).
 
Developers can use 2 different grant types; 

* Resource Owner Password Credentials
* Client Credentials

Access tokens obtained using the *Client Credentials* grant type will only give access to **/search** endpoints, where access tokens obtained using the *Resource Owner Password Credentials* grant type will have access to the full API.

Before using any of the 2 grant types, you will need a **clientId** and a **clientSecret**. 

## Requesting an access token

Access tokens are obtained by calling the **/oauth/token** endpoint.

For *Resource Owner Password Credentials* grants the following parameters should be included in the request.

* `grant_type: password`
* `client_id: [the client_id you received when you registered your app]`
* `client_secret: [the client_secret you received when you registered your app]`
* `username: [the username of the user]`
* `password: [the password of the user]`

For *Client Credentials* grants the following parameters should be included in the request.

* `grant_type: client_credentials`
* `client_id: [the client_id you received when you registered your app]`
* `client_secret: [the client_secret you received when you registered your app]`

Requests must be POST requests with application/x-www-form-urlencoded encoding.



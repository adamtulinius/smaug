'use strict';

/**
 * @file
 * Configure and start our server
 */

// Libraries
import createApp from './expressapp';
import TokenStore from './oauth/tokenstore/redis';

// Setup
const port = process.env.PORT || 3001; // eslint-disable-line no-process-env
const app = createApp(new TokenStore());

// Starting server
app.listen(port, () => {
  console.log('OpenServiceProvider up and running'); // eslint-disable-line no-console
});

'use strict';

import {log} from './utils';
import createApp from './expressapp';
import TokenStore from './oauth/tokenstore/redis';

// Setup
const port = process.env.PORT || 3001; // eslint-disable-line no-process-env
const app = createApp(new TokenStore());

// Starting server
app.listen(port, () => {
  log.info('Started Smaug on port ' + port);
});

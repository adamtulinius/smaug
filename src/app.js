'use strict';

import {log} from './utils';
import createApp from './expressapp';
import TokenStore from './oauth/tokenstore/redis';
import UserStore from './oauth/userstore/borchk';

// Setup
const port = process.env.PORT || 3001; // eslint-disable-line no-process-env
const app = createApp(
  new TokenStore(),
  new UserStore('https://borchk.addi.dk/2.4/borchk.wsdl', 'bibliotek.dk')
);

// Starting server
app.listen(port, () => {
  log.info('Started Smaug on port ' + port);
});

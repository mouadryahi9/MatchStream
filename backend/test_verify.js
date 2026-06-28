const bcrypt = require('bcryptjs');
const hash = '/hQbSZfOZudYqZU5mR2wYEmXvLASSsWFbCQhaQS';
bcrypt.compare('admin123', hash).then(m => console.log('Match:', m));

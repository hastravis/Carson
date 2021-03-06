const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const bodyParser = require('body-parser');
const webpackConfig = require('./webpack.config.js');
const portStatus = require('./server/portStatus');
const containerRedirect = require('./server/containerRedirect');
const deleteContainer = require('./server/deleteContainer');
const CONFIG = require('./server/config');

const DEVELOPMENT = !(process.env.NODE_ENV === 'production');
const STAGE_SERVER_URL = 'http://h-p9hofn01-sta-1b.use01.ho.priv';
const PORT = CONFIG.CARSON_PORT;
const IP = '0.0.0.0';

const app = express();
app.set('view engine', 'jade');
app.use('/js', express.static('dist/js'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// only use the webpack middleware during development mode
if (DEVELOPMENT) {
  console.log('RUNNING IN DEVELOPMENT MODE');
  const compiler = webpack(webpackConfig);
  app.use(webpackDevMiddleware(compiler, {
    historyApiFallback: true,
    publicPath: webpackConfig.output.publicPath,
    stats: { colors: true },
  }));
  app.use(webpackHotMiddleware(compiler, {
    path: '/__webpack_hmr',
  }));
}

// Handle GET request
// check status endpoint
app.get('/status', (req, res) => {
  portStatus
    .checkStatus(STAGE_SERVER_URL)
    .then((results) => {
      res.json(results);
    });
});

// redirect to container port endpoint
app.get('/prbuild/:id', (req, res) => {
  res.redirect(containerRedirect.redirect(STAGE_SERVER_URL, req.params.id));
});

// delete PR container endpoint
app.get('/deleteContainer/:prid', (req, res) => {
  console.log('Start Delete process for container:', req.params.prid);
  deleteContainer
    .deleteByPRID(req.params.prid)
    .then((results) => {
      // add delay for Jenkins to finish the delete job
      setTimeout(() => {
        console.log('Delete Completed');
        res.json(results);
      }, 2000);
    });
});

// everything else
app.get('*', (req, res) => {
  res.render('index', { pageTitle: 'Welcome to Carson' });
});

// start the server
const appServer = app.listen(PORT, IP, (err) => {
  if (err) { console.error(err); }
  console.log(`Running in ${process.env.NODE_ENV} mode`);
  console.info(`Carson 🎩  is running at http://${appServer.address().address}:${appServer.address().port}`);
});

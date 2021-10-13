const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

/**
 * This is the Webpack configuration file for local development.
 * It contains local-specific configuration which includes:
 *
 * - Hot reloading configuration
 * - The entry points of the application
 * - Which loaders to use on what files to properly transpile the source
 *
 * For more information, see: http://webpack.github.io/docs/configuration.html
 */

let commitHash;
try {
  commitHash = require('child_process')
    .execSync('git rev-parse --short HEAD')
    .toString();
  // eslint-disable-next-line no-empty
} catch (error) {}

module.exports = {
  // Efficiently evaluate modules with source maps
  devtool: 'eval-source-map',

  // Set entry points with hot loading
  entry: {
    app: ['./app/scripts/main', 'webpack-hot-middleware/client'],
    'dev-app': ['./app/scripts/main.dev', 'webpack-hot-middleware/client'],
    vendors: [
      'classnames',
      'filesize',
      'immutable',
      'moment',
      'page',
      'react',
      'react-dom',
      'react-redux',
      'redux',
      'redux-thunk',
      'reqwest',
      'webpack-hot-middleware/client',
    ],
  },

  // Used by Webpack Dev Middleware
  mode: 'development',
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'build'),
    publicPath: '',
  },

  // Necessary plugins for hot load
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        API_BASE_URL: JSON.stringify(process.env.API_BASE_URL),
        WS_BASE_URL: JSON.stringify(process.env.WS_BASE_URL),
        __BUILDVERSION__: JSON.stringify(commitHash),
      },
    }),
    new CopyWebpackPlugin([{ from: './app/libraries', to: './libraries' }]),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new ExtractTextPlugin('style-[name]-[chunkhash].css'),
    new HtmlWebpackPlugin({
      chunks: ['vendors', 'terminal-app'],
      filename: 'terminal.html',
      template: 'app/html/index.html',
    }),
    new HtmlWebpackPlugin({
      chunks: ['vendors', 'dev-app', 'contrast-theme'],
      template: 'app/html/index.html',
      filename: 'dev.html',
    }),
    new HtmlWebpackPlugin({
      chunks: ['vendors', 'app', 'contrast-theme'],
      filename: 'index.html',
      template: 'app/html/index.html',
    }),
    // new ContrastStyleCompiler()
  ],

  // Transform source code using Babel and React Hot Loader
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.js$/,
        exclude: /node_modules|vendor/,
        loader: 'eslint-loader',
        enforce: 'pre',
      },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          minetype: 'application/font-woff',
        },
      },
      {
        test: /\.(jpe?g|png|gif|ttf|eot|svg|ico)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'file-loader',
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' },
          {
            loader: 'postcss-loader',
            options: {
              plugins: [
                autoprefixer({
                  browsers: ['last 2 versions'],
                }),
              ],
            },
          },
        ],
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        test: /\.scss$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' },
          {
            loader: 'sass-loader',
            options: {
              includePaths: [],
            },
          },
        ],
      },
    ],
  },

  // Automatically transform files with these extensions
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, './app/scripts'),
      '@deepfence-theme': path.resolve(
        __dirname,
        './app/styles/_deepfence.scss'
      ),
    },
  },
};

const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const path = require('path');
const fs = require('fs');

const CleanWebpackPlugin = require('clean-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

let commitHash;

fs.readFile('console_version.txt', (err, data) => {
  if (err) throw err;

  commitHash = data.toString();
})
const GLOBALS = {
  'process.env': {
    NODE_ENV: '"production"',
    __BUILDVERSION__: JSON.stringify(commitHash),
    __BUILDTIME__: new Date().getTime(),
  },
};

const OUTPUT_PATH = 'build/';
const PUBLIC_PATH = '';

/**
 * This is the Webpack configuration file for production.
 */
module.exports = {
  // fail on first error when building release
  bail: true,

  cache: {},

  entry: {
    app: './app/scripts/main',
    // keep only some in here, to make vendors and app bundles roughly same size
    vendors: [
      'classnames',
      'immutable',
      'react',
      'react-dom',
      'react-redux',
      'redux',
      'redux-thunk',
    ],
  },

  mode: 'production',

  output: {
    filename: '[name]-[chunkhash].js',
    path: path.join(__dirname, OUTPUT_PATH),
    publicPath: PUBLIC_PATH,
  },

  plugins: [
    new CleanWebpackPlugin(['build']),
    new webpack.DefinePlugin(GLOBALS),
    new CopyWebpackPlugin([{ from: './app/libraries', to: './libraries' }]),
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new ExtractTextPlugin('style-[name]-[chunkhash].css'),
    new HtmlWebpackPlugin({
      chunks: ['vendors', 'terminal-app'],
      filename: 'terminal.html',
      hash: true,
      template: 'app/html/index.html',
    }),
    new HtmlWebpackPlugin({
      hash: true,
      chunks: ['vendors', 'app', 'contrast-theme'],
      filename: 'index.html',
      template: 'app/html/index.html',
    }),
  ],

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
        options: {
          failOnError: true,
        },
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
        loader: 'url-loader',
      },
      {
        test: /\.ico$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
        },
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules|vendor/,
        loader: 'babel-loader',
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
              // data: themeVarsAsScss(),
              includePaths: [],
            },
          },
        ],
      },
    ],
  },

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

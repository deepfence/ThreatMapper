const webpack = require('webpack');
const path = require('path');
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
} catch (error) {
  // no-op
}

module.exports = {
  // Efficiently evaluate modules with source maps
  devtool: 'eval-source-map',

  // Set entry points with hot loading
  entry: {
    app: ['./app/scripts/main', 'webpack-hot-middleware/client'],
    'dev-app': ['./app/scripts/main.dev', 'webpack-hot-middleware/client']
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
    new CopyWebpackPlugin({
      patterns: [{ from: './app/libraries', to: './libraries' }]
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    new HtmlWebpackPlugin({
      chunks: ['dev-app'],
      template: 'app/html/index.html',
      filename: 'dev.html',
    }),
    new HtmlWebpackPlugin({
      chunks: ['app'],
      filename: 'index.html',
      template: 'app/html/index.html',
    }),
  ],

  // Transform source code using Babel and React Hot Loader
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules|vendor/,
        loader: 'eslint-loader',
        enforce: 'pre',
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules|vendor/,
        loader: 'babel-loader'
      },
      {
        test: /\.(jpe?g|png|gif|ttf|eot|svg|ico|woff|woff2)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        type: 'asset/resource'
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  'autoprefixer'
                ],
              }
            },
          },
        ],
      },
      {
        test: /\.scss$/i,
        exclude: /\.module\.scss$/i,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
              modules: {
                mode: "icss",
              },
            },
          },
          {
            loader: "sass-loader",
          },
        ],
      },
      {
        test: /\.module\.scss$/i,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
              modules: {
                mode: "local",
              },
            },
          },
          {
            loader: "sass-loader",
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

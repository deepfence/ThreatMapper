const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

let commitHash;

try {
  commitHash = fs.readFileSync('console_version.txt').toString().trim();
} catch (e) {
  // eslint-disable-next-line no-console
  console.error('error reading console_version.txt');
}

const GLOBALS = {
  'process.env': {
    NODE_ENV: '"production"',
    __BUILDVERSION__: JSON.stringify(commitHash),
    __BUILDTIME__: new Date().getTime(),
  },
};

const OUTPUT_PATH = 'build/';
const PUBLIC_PATH = '';

module.exports = {
  // fail on first error when building release
  bail: true,

  entry: {
    app: './app/scripts/main',
  },

  mode: 'production',

  output: {
    filename: '[name]-[chunkhash].js',
    path: path.join(__dirname, OUTPUT_PATH),
    publicPath: PUBLIC_PATH,
  },

  plugins: [
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin(GLOBALS),
    new CopyWebpackPlugin({
      patterns: [{ from: './app/libraries', to: './libraries' }]
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    new MiniCssExtractPlugin({
      filename: 'style-[name]-[chunkhash].css'
    }),
    new HtmlWebpackPlugin({
      hash: true,
      chunks: ['app'],
      filename: 'index.html',
      template: 'app/html/index.html',
    }),
  ],

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules|vendor/,
        loader: 'eslint-loader',
        enforce: 'pre',
        options: {
          failOnError: true,
        },
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
        test: /\.ico$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
        },
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader', options: {
              modules: {
                mode: "icss"
              }
            }
          },
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

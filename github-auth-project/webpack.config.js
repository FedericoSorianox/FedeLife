const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'production',
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    externals: {
        vscode: 'commonjs vscode' // Do not bundle the vscode module
    },
    devtool: 'source-map',
    target: 'node'
};
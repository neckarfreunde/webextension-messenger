const resolve = require("path").resolve;
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const { version } = require("../package");

const polyfill = resolve(__dirname, "polyfill.js");
const build = resolve(__dirname, "build");

module.exports = {
    mode: process.env.NODE_ENV,
    entry: {
        bg: [polyfill, resolve(__dirname, "bg.ts")],
        content: [polyfill, resolve(__dirname, "content.ts")],
        action: [polyfill, resolve(__dirname, "action.ts")],
    },
    output: {
        path: build,
        publicPath: "/",
        filename: "[name].js",
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                loader: "ts-loader",
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    plugins: [
        new CleanWebpackPlugin(),

        new CopyWebpackPlugin([
            {
                from: resolve(__dirname, "manifest.json"),
                transform: (content) => {
                    const manifest = {
                        ...JSON.parse(content.toString()),
                        version,
                    };

                    return Buffer.from(JSON.stringify(manifest, void 0, 2));
                },
            },
        ]),

        new HtmlWebpackPlugin({
            filename: "action.html",
            excludeChunks: ["bg", "content"],
            template: resolve(__dirname, "action.html"),
            output: {
                publicPath: "/",
            },
        }),
    ],
};

"use strict";

const webpack = require("webpack");
/**
 * Custom webpack configuration
 */
module.exports = {
        module: {
    rules: [],
},
plugins: [
    // Filter out the moment locales to reduce bundle size
    // Locales that should be included MUST be added to the project, otherwise they won't be available for use)
    // References:
    // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
    new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
    })
],
};

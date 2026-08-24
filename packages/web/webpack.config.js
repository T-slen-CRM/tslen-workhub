"use strict";

/**
 * Custom webpack configuration
 *
 * Empty: this used to filter moment's locale files out of the bundle via
 * webpack.IgnorePlugin, but moment was removed from the project entirely
 * (nothing here depends on it any more) - see git history for that rule if
 * a future dependency needs the same locale-filtering treatment.
 */
module.exports = {
    module: {
        rules: [],
    },
    plugins: [],
};
